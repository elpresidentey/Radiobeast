"use client";

const AUDIO_CACHE = "radiobeast-audio-v1";
const META_KEY = "radiobeast:savedMeta";
const MAX_AUDIO_CACHE_MB = 200;
const DEFAULT_SAVE_DURATION_HOURS = 24;

export type SavedStationMeta = {
  uuid: string;
  name: string;
  country: string;
  favicon: string;
  savedAt: number;
  expiresAt: number;
  codec: string;
  bitrate: number;
};

// --- metadata persistence (localStorage) ---
function loadMeta(): SavedStationMeta[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(META_KEY) || "[]"); } catch { return []; }
}
function saveMeta(list: SavedStationMeta[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(META_KEY, JSON.stringify(list));
}

export function getSavedStations(): SavedStationMeta[] {
  return loadMeta().filter((m) => Date.now() < m.expiresAt);
}

export function isStationSaved(uuid: string): boolean {
  return loadMeta().some((m) => m.uuid === uuid && Date.now() < m.expiresAt);
}

export async function saveStation(
  station: { stationuuid: string; name: string; country: string; favicon: string; codec: string; bitrate: number; url_resolved?: string; url?: string },
  durationHours = DEFAULT_SAVE_DURATION_HOURS,
): Promise<boolean> {
  const url = station.url_resolved || station.url;
  if (!url) return false;

  try {
    // Fetch the stream via the proxy to avoid CORS
    const proxyUrl = `/api/stream?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok || !res.body) return false;

    // Radio streams are infinite — we can't cache the whole thing.
    // Buffer ~30 seconds of audio (enough for a short offline listen)
    // then abort the rest. At 128kbps that's ~480KB, at 320kbps ~1.2MB.
    const targetBytes = 1_500_000; // ~1.5MB cap
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (totalBytes < targetBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }
    reader.cancel().catch(() => {});

    if (totalBytes === 0) return false;

    // Build a finite Response from the buffered chunks
    const blob = new Blob(chunks as BlobPart[]);
    const finiteResponse = new Response(blob, {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") || "audio/mpeg",
        "content-length": String(totalBytes),
      },
    });

    const cache = await caches.open(AUDIO_CACHE);
    const cacheKey = new Request(`/audio/${station.stationuuid}`);
    await cache.put(cacheKey, finiteResponse);

    // Track size and evict if over limit
    await evictIfNeeded(cache);

    const meta: SavedStationMeta = {
      uuid: station.stationuuid,
      name: station.name,
      country: station.country,
      favicon: station.favicon,
      savedAt: Date.now(),
      expiresAt: Date.now() + durationHours * 60 * 60 * 1000,
      codec: station.codec,
      bitrate: station.bitrate,
    };
    const metas = loadMeta().filter((m) => m.uuid !== station.stationuuid);
    metas.push(meta);
    saveMeta(metas);

    // Tell SW to cache station metadata
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "CACHE_STATIONS",
        stations: [meta],
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function removeStation(uuid: string): Promise<void> {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    await cache.delete(new Request(`/audio/${uuid}`));
  } catch {}
  saveMeta(loadMeta().filter((m) => m.uuid !== uuid));
}

export async function clearAllSaved(): Promise<void> {
  try { await caches.delete(AUDIO_CACHE); } catch {}
  saveMeta([]);
}

export async function getCacheSizeMB(): Promise<number> {
  if (!("storage" in navigator) || !("estimate" in navigator.storage)) return 0;
  const est = await navigator.storage.estimate();
  return est.usage ? Math.round((est.usage / (1024 * 1024)) * 10) / 10 : 0;
}

export async function getCachedAudioUrl(uuid: string): Promise<string | null> {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const req = new Request(`/audio/${uuid}`);
    const resp = await cache.match(req);
    if (!resp) return null;
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

async function evictIfNeeded(cache: Cache) {
  const keys = await cache.keys();
  if (keys.length === 0) return;

  // Check total size via StorageManager estimate
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const est = await navigator.storage.estimate();
    const usageMB = est.usage ? est.usage / (1024 * 1024) : 0;
    if (usageMB < MAX_AUDIO_CACHE_MB) return;
  }

  // Evict oldest entries
  const metas = loadMeta().sort((a, b) => a.savedAt - b.savedAt);
  while (metas.length > 0) {
    const oldest = metas.shift()!;
    await cache.delete(new Request(`/audio/${oldest.uuid}`));
    // Recheck size
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const est = await navigator.storage.estimate();
      if (!est.usage || est.usage / (1024 * 1024) < MAX_AUDIO_CACHE_MB * 0.8) break;
    }
  }
  saveMeta(metas);
}

export function cleanExpired() {
  const now = Date.now();
  const metas = loadMeta().filter((m) => m.expiresAt > now);
  if (metas.length !== loadMeta().length) saveMeta(metas);
}
