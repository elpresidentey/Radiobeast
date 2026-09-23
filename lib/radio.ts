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

const SELF_HOST = (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_RADIO_SELF_HOST || "").trim()) || "";
const PUBLIC_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
];
const SERVERS = SELF_HOST ? [SELF_HOST, ...PUBLIC_SERVERS] : PUBLIC_SERVERS;

const baseUrl = SERVERS[0];

export function getSelfHost(): string { return SELF_HOST; }
export function getServers(): string[] { return [...SERVERS]; }

export type FetchOpts = { preferSelfHost?: boolean; allowIcecastFallback?: boolean; bypassCache?: boolean };

// Simple client-side cache with TTL (5 minutes to match server revalidate)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(path: string, params: Record<string, string> = {}, opts: FetchOpts = {}): string {
  return `${path}|${JSON.stringify(params)}|${JSON.stringify(opts)}`;
}

function getFromCache(key: string): unknown | null {
  const cached = cache.get(key);
  if (!cached) return null;
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return cached.data;
}

function setInCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchWithFallback(path: string, params: Record<string, string> = {}, opts: FetchOpts = {}) {
  // Bypass cache if requested
  if (opts.bypassCache) {
    // We'll still fetch and update cache below, but skip the cache read
  } else {
    const key = getCacheKey(path, params, opts);
    const cached = getFromCache(key);
    if (cached !== null) return cached;
  }

  const qs = new URLSearchParams(params).toString();
  const suffix = qs ? `?${qs}` : "";

  // Determine server order based on opts
  let servers = SERVERS;
  if (SELF_HOST && opts.preferSelfHost === false) {
    servers = [...PUBLIC_SERVERS, SELF_HOST];
  } else if (SELF_HOST && opts.preferSelfHost === true) {
    servers = [SELF_HOST, ...PUBLIC_SERVERS];
  }

  // Fire at all servers in parallel — use Promise.any (not .race!)
  // Promise.any succeeds when ANY server responds, and only fails
  // when ALL servers fail. Promise.race would fail on the first
  // rejection (e.g. dead DNS on one mirror kills the whole call).
  const promises = servers.map(server =>
    fetch(`${server}/json${path}${suffix}`, {
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 300 },
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${server}`);
      return res.json();
    })
  );

  try {
    const data = await Promise.any(promises);
    // Cache the successful response (unless bypassed)
    if (!opts.bypassCache) {
      const key = getCacheKey(path, params, opts);
      setInCache(key, data);
    }
    // Update baseUrl to the first server that worked
    // (we don't know which one from Promise.any, but that's fine)
    return data;
  } catch {
    throw new Error("All radio servers unreachable — check your connection and retry.");
  }
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

// Filter out stale / broken stations client-side.
// The API's hidebroken flag only catches stations that failed their LAST check.
// A station can pass the last check but still be dead (check was days/weeks ago).
function filterStations(stations: Station[]): Station[] {
  const now = Date.now();
  const MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000; // 21 days
  return stations.filter((s) => {
    if (s.lastcheckok === 0) return false;
    if (s.lastchecktime) {
      const age = now - new Date(s.lastchecktime).getTime();
      if (age > MAX_AGE_MS) return false;
    }
    if (s.url_resolved && s.url_resolved.startsWith("http://") && s.ssl_error) return false;
    return true;
  });
}

export async function getStations(opts: Parameters<typeof buildSearchParams>[0] = {}, fetchOpts: FetchOpts = {}): Promise<Station[]> {
  const params = buildSearchParams({ limit: 48, order: "clickcount", reverse: true, ...opts });
  const data: Station[] = await fetchWithFallback("/stations/search", params, fetchOpts);
  return filterStations(data);
}

export async function getTopStations(limit = 48, fetchOpts: FetchOpts = {}): Promise<Station[]> {
  const data: Station[] = await fetchWithFallback("/stations/topclick", { limit: String(limit), hidebroken: "true" }, fetchOpts);
  return filterStations(data);
}
export async function getTopVoted(limit = 48, fetchOpts: FetchOpts = {}): Promise<Station[]> {
  const data: Station[] = await fetchWithFallback("/stations/topvote", { limit: String(limit), hidebroken: "true" }, fetchOpts);
  return filterStations(data);
}
export async function getCountries(fetchOpts: FetchOpts = {}): Promise<Country[]> {
  const data: Country[] = await fetchWithFallback("/countries", { hidebroken: "true" }, fetchOpts);
  return data.sort((a, b) => a.name.localeCompare(b.name));
}
export async function getLanguages(fetchOpts: FetchOpts = {}): Promise<Language[]> {
  return fetchWithFallback("/languages", { order: "stationcount", reverse: "true", hidebroken: "true" }, fetchOpts);
}
export async function getTags(limit = 50, fetchOpts: FetchOpts = {}): Promise<Tag[]> {
  return fetchWithFallback("/tags", { order: "stationcount", reverse: "true", limit: String(limit), hidebroken: "true" }, fetchOpts);
}
export async function getStationByUuid(uuid: string, fetchOpts: FetchOpts = {}): Promise<Station | null> {
  const res: Station[] = await fetchWithFallback("/stations/byuuid", { uuids: uuid }, fetchOpts);
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

// Tags that are NOT genres — used to keep genre lists and learned tastes clean
export const NON_GENRE_TAGS = new Set([
  "music", "radio", "fm", "hd", "live", "stream", "online", "web", "internet",
  "estación", "estacion", "emisora", "entretenimiento", "música", "musica",
  "música en español", "música pop", "música rock", "música latina",
  "pop music", "top 40", "top hits", "hits", "best", "popular",
  "public radio", "community radio", "college radio", "student radio",
  "local news", "local", "regional", "nacional", "norteamérica",
  "latinoamérica", "américa", "méxico", "español", "english", "spanish",
  "french", "german", "arabic", "chinese", "japanese", "korean", "portuguese",
  "deutsch", "français", "italiano", "russian", "hindi", "turkish",
  "moi merino", "world", "world music", "various", "misc",
  "blog", "info", "noticias", "noticia", "deportes", "cultura",
]);

export function isGenreTagName(name: string): boolean {
  const n = name.toLowerCase().trim();
  if (NON_GENRE_TAGS.has(n)) return false;
  if (/^\d+$/.test(n)) return false; // decade tags like "1930"
  return n.length >= 2;
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
    limit: limit + 5,
    hidebroken: true,
    order: "votes",
    reverse: true,
  });
  const stations: Station[] = await fetchWithFallback("/stations/search", params);
  // filterStations drops stations whose last check is stale — suggestions must be
  // stations that are actually likely to play
  return filterStations(stations)
    .filter(s => s.stationuuid !== station.stationuuid)
    .slice(0, limit);
}

// — Icecast fallback —
// dir.xiph.org has no stable JSON API, so fallback is a relaxed Radio Browser query
// mimicking Icecast's looser filters (includes recently broken, random order)
export async function getIcecastStations(opts: { tag?: string; countrycode?: string; limit?: number; name?: string } = {}): Promise<Station[]> {
  try {
    const params = buildSearchParams({
      tag: opts.tag,
      countrycode: opts.countrycode,
      name: opts.name,
      limit: opts.limit || 24,
      hidebroken: false,
      order: "random",
      reverse: false,
    });
    // try public servers directly (skip self-host for fallback diversity)
    const data: Station[] = await fetchWithFallback("/stations/search", params, { preferSelfHost: false });
    // filter to only those that look like Icecast (often no HLS, MP3/AAC)
    return data.filter(s => s.codec && ["MP3","AAC","OGG","OPUS"].includes(s.codec.toUpperCase()));
  } catch {
    return [];
  }
}

export async function getStationsWithIcecastFallback(
  opts: Parameters<typeof buildSearchParams>[0] = {},
  fetchOpts: FetchOpts = {},
  enableIcecast: boolean = false
): Promise<Station[]> {
  const primary = await getStations(opts, fetchOpts);
  if (!enableIcecast) return primary;
  // if primary is sparse (<6), enrich with Icecast
  if (primary.length >= 8) return primary;
  const icecast = await getIcecastStations({ tag: opts.tag, countrycode: opts.countrycode, limit: 12, name: opts.name });
  const seen = new Set(primary.map(s => s.stationuuid));
  const merged = [...primary, ...icecast.filter(s => !seen.has(s.stationuuid))];
  return merged.slice(0, (opts.limit as number) || 24);
}