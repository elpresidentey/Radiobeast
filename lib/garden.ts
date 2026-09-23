"use client";

import type { Station } from "@/lib/radio";

// ---------------------------------------------------------------------------
// radio.garden integration — comprehensive coverage without GPS.
// ---------------------------------------------------------------------------
// Upstream API (unofficial):
//   GET /ara/content/places            -> all 12k+ places (full coverage)
//   GET /ara/content/page/{placeId}    -> place page, channel lists
//   GET /ara/content/channel/{id}      -> channel detail
//   GET /api/search?q=                 -> search places/countries/channels
//   HEAD /ara/content/listen/{id}/channel.mp3 -> 302 to real stream
//
// GPS / geo is intentionally ignored:
//   - never calls /api/geo
//   - never uses place `geo` coordinates
//   - skips "Nearby ..." lists (distance-based, needs GPS)
// All calls go through our Next.js proxy (/api/garden/*) which sets a
// browser-like User-Agent + Referer to pass radio.garden's Cloudflare check.

export type GardenPlace = {
  id: string;
  title: string;
  country: string;
  size: number;
};

export type GardenChannel = {
  id: string;
  title: string;
  place: string;
  country: string;
  subtitle?: string;
  secure?: boolean;
  website?: string;
};

export function gardenStreamUrl(id: string): string {
  return `https://radio.garden/api/ara/content/listen/${id}/channel.mp3`;
}

export function gardenIdFromStationUuid(stationuuid: string): string | null {
  if (!stationuuid.startsWith("garden:")) return null;
  return stationuuid.slice("garden:".length);
}

export function isGardenStation(s: Pick<Station, "stationuuid">): boolean {
  return s.stationuuid.startsWith("garden:");
}

export function gardenToStation(c: GardenChannel): Station {
  const now = new Date().toISOString();
  const cleanId = c.id.replace(/[^A-Za-z0-9_-]/g, "");
  return {
    changeuuid: `garden:${cleanId}`,
    stationuuid: `garden:${cleanId}`,
    name: c.title || "Unknown station",
    url: gardenStreamUrl(cleanId),
    url_resolved: gardenStreamUrl(cleanId),
    homepage: c.website || "",
    favicon: "",
    tags: "",
    country: c.country || "",
    countrycode: "",
    state: c.place || "",
    language: "",
    languagecodes: "",
    votes: 0,
    lastchangetime: now,
    codec: "MP3",
    bitrate: 0,
    hls: 0,
    lastcheckok: 1,
    lastchecktime: now,
    clicktimestamp: now,
    clickcount: 0,
    clicktrend: 0,
    ssl_error: 0,
  };
}

// --- client-side memory cache ---
let placesCache: { data: GardenPlace[]; ts: number } | null = null;
const PLACES_TTL = 60 * 60 * 1000; // 1h

export async function getGardenPlaces(): Promise<GardenPlace[]> {
  if (placesCache && Date.now() - placesCache.ts < PLACES_TTL) return placesCache.data;
  const res = await fetch("/api/garden/places", { next: { revalidate: 3600 } } as RequestInit);
  if (!res.ok) throw new Error(`Garden places failed: ${res.status}`);
  const json = await res.json();
  const places: GardenPlace[] = json.places || [];
  placesCache = { data: places, ts: Date.now() };
  return places;
}

export async function getGardenPlaceStations(placeId: string, limit = 100): Promise<Station[]> {
  const res = await fetch(`/api/garden/place/${encodeURIComponent(placeId)}`);
  if (!res.ok) throw new Error(`Garden place failed: ${res.status}`);
  const json = await res.json();
  const channels: GardenChannel[] = json.channels || [];
  return channels.slice(0, limit).map(gardenToStation);
}

export async function searchGardenStations(query: string, limit = 24): Promise<Station[]> {
  const res = await fetch(`/api/garden/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Garden search failed: ${res.status}`);
  const json = await res.json();
  const channels: GardenChannel[] = json.channels || [];
  return channels.slice(0, limit).map(gardenToStation);
}

export async function getGardenChannelStation(id: string): Promise<Station | null> {
  try {
    const res = await fetch(`/api/garden/channel/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.channel) return null;
    return gardenToStation(json.channel as GardenChannel);
  } catch {
    return null;
  }
}

// --- comprehensive browse: pages through the FULL places list ---
// offset/limit are station-level. We walk places sorted by size desc,
// fetching a few place-pages in parallel until we have enough stations.
// No geo / distance logic — pure coverage order (size desc, then name).
export async function getGardenStations(opts: {
  countryName?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Station[]> {
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;

  if (opts.search) return searchGardenStations(opts.search, limit);

  const places = await getGardenPlaces();
  let pool = places;
  if (opts.countryName) {
    const want = opts.countryName.toLowerCase();
    pool = places.filter((p) => p.country.toLowerCase() === want);
    if (!pool.length) return [];
  }
  const sorted = [...pool].sort((a, b) => b.size - a.size || a.title.localeCompare(b.title));

  // Estimate: a place page holds its full station list (~40+ usable).
  // Fetch enough places to cover offset+limit, capped to avoid
  // hammering the proxy.
  const perPlace = 40;
  const needStations = offset + limit;
  const needPlaces = Math.min(Math.ceil(needStations / perPlace) + 1, 12);
  const wanted = sorted.slice(0, needPlaces);
  if (!wanted.length) return [];

  const settled = await Promise.allSettled(wanted.map((p) => getGardenPlaceStations(p.id, 100)));
  const all: Station[] = [];
  const seen = new Set<string>();
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    for (const s of r.value) {
      if (seen.has(s.stationuuid)) continue;
      seen.add(s.stationuuid);
      all.push(s);
    }
  }
  return all.slice(offset, offset + limit);
}

// Merge radio-browser + garden, deduped by name+country (case-insensitive).
// Garden fills gaps so combined coverage exceeds either source alone.
export function mergeStations(primary: Station[], secondary: Station[], limit?: number): Station[] {
  const seen = new Set(primary.map((s) => `${s.name.toLowerCase()}|${(s.country || "").toLowerCase()}`));
  const out = [...primary];
  for (const s of secondary) {
    const key = `${s.name.toLowerCase()}|${(s.country || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (limit && out.length >= limit) break;
  }
  return limit ? out.slice(0, limit) : out;
}
