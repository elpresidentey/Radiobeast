export type Station = {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  iso_3166_2?: string;
  state: string;
  language: string;
  languagecodes: string;
  votes: number;
  lastchangetime: string;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  lastchecktime: string;
  clicktimestamp: string;
  clickcount: number;
  clicktrend: number;
  ssl_error: number;
  geo_lat?: number;
  geo_long?: number;
};

export type Country = { name: string; iso_3166_1: string; stationcount: number };
export type Language = { name: string; iso_639?: string; stationcount: number };
export type Tag = { name: string; stationcount: number };

const SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
];

let baseUrl = SERVERS[0];

async function fetchWithFallback(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const suffix = qs ? `?${qs}` : "";
  let lastErr: unknown = null;
  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}/json${path}${suffix}`, {
        headers: { "User-Agent": "Radiobeast/1.0" },
        next: { revalidate: 300 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      baseUrl = server;
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// Helpers to build search params
export function buildSearchParams(opts: {
  name?: string;
  countrycode?: string;
  language?: string;
  tag?: string;
  state?: string;
  limit?: number;
  offset?: number;
  order?: string;
  reverse?: boolean;
  hidebroken?: boolean;
} = {}) {
  const p: Record<string, string> = {};
  if (opts.name) p.name = opts.name;
  if (opts.countrycode) p.countrycode = opts.countrycode;
  if (opts.language) p.language = opts.language;
  if (opts.tag) p.tag = opts.tag;
  if (opts.state) p.state = opts.state;
  if (opts.limit) p.limit = String(opts.limit);
  if (opts.offset) p.offset = String(opts.offset);
  if (opts.order) p.order = opts.order;
  if (opts.reverse !== undefined) p.reverse = String(opts.reverse);
  p.hidebroken = opts.hidebroken === false ? "false" : "true";
  return p;
}

export async function getStations(opts: Parameters<typeof buildSearchParams>[0] = {}): Promise<Station[]> {
  const params = buildSearchParams({ limit: 48, order: "clickcount", reverse: true, ...opts });
  return fetchWithFallback("/stations/search", params);
}

export async function getTopStations(limit = 48): Promise<Station[]> {
  return fetchWithFallback("/stations/topclick", { limit: String(limit), hidebroken: "true" });
}
export async function getTopVoted(limit = 48): Promise<Station[]> {
  return fetchWithFallback("/stations/topvote", { limit: String(limit), hidebroken: "true" });
}
export async function getCountries(): Promise<Country[]> {
  const data: Country[] = await fetchWithFallback("/countries", { hidebroken: "true" });
  return data.sort((a, b) => a.name.localeCompare(b.name));
}
export async function getLanguages(): Promise<Language[]> {
  return fetchWithFallback("/languages", { order: "stationcount", reverse: "true", hidebroken: "true" });
}
export async function getTags(limit = 50): Promise<Tag[]> {
  return fetchWithFallback("/tags", { order: "stationcount", reverse: "true", limit: String(limit), hidebroken: "true" });
}
export async function getStationByUuid(uuid: string): Promise<Station | null> {
  const res: Station[] = await fetchWithFallback("/stations/byuuid", { uuids: uuid });
  return res[0] || null;
}
export async function clickStation(uuid: string) {
  try {
    await fetch(`${baseUrl}/json/url/${uuid}`, { method: "GET" });
  } catch {}
}

export function tagList(tags: string): string[] {
  return tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4);
}
export function stationImage(s: Station) {
  if (s.favicon && s.favicon.startsWith("http")) return s.favicon;
  return "";
}

export async function getSimilarStations(station: Station, limit = 6): Promise<Station[]> {
  const tags = station.tags?.split(",").map(t => t.trim()).filter(Boolean).slice(0, 2) || [];
  const params = buildSearchParams({
    countrycode: station.countrycode,
    tag: tags[0] || undefined,
    limit: limit + 1,
    hidebroken: true,
    order: "votes",
    reverse: true,
  });
  const stations: Station[] = await fetchWithFallback("/stations/search", params);
  // Filter out the current station and limit results
  return stations.filter(s => s.stationuuid !== station.stationuuid).slice(0, limit);
}
