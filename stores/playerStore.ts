"use client";
import { create } from "zustand";
import { Station } from "@/lib/radio";
import { SavedStationMeta, getSavedStations, saveStation as cacheSave, removeStation as cacheRemove, clearAllSaved, cleanExpired } from "@/lib/offlineCache";

type PlayerState = {
  current: Station | null;
  queue: Station[];
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  favorites: string[]; // stationuuids
  recent: Station[];
  pinnedGenres: string[]; // radio-browser tags
  pinnedCountries: string[]; // iso 3166-1 codes
  pinnedLanguages: string[]; // language names
  dataSaver: boolean;
  sleepTimer: number | null; // timestamp when timer should stop
  compactMode: boolean;
  preferSelfHost: boolean;
  icecastFallback: boolean;
  savedStations: SavedStationMeta[];
  // actions
  play: (s: Station) => void;
  toggle: () => void;
  setPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleFavorite: (uuid: string) => void;
  togglePinnedGenre: (tag: string) => void;
  togglePinnedCountry: (code: string) => void;
  togglePinnedLanguage: (lang: string) => void;
  setQueue: (q: Station[]) => void;
  next: () => void;
  prev: () => void;
  toggleDataSaver: () => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleCompactMode: () => void;
  togglePreferSelfHost: () => void;
  toggleIcecastFallback: () => void;
  clearFavorites: () => void;
  clearRecent: () => void;
  powerOff: () => void;
  saveStationForOffline: (s: Station, hours?: number) => Promise<boolean>;
  removeSavedStation: (uuid: string) => Promise<void>;
  clearSavedStations: () => Promise<void>;
  refreshSavedStations: () => void;
};

const FAV_KEY = "radiobeast:favs";
const RECENT_KEY = "radiobeast:recent";
const VOL_KEY = "radiobeast:vol";
const SAVER_KEY = "radiobeast:saver";
const SLEEP_KEY = "radiobeast:sleep";
const SELF_HOST_KEY = "radiobeast:preferSelfHost";
const ICECAST_KEY = "radiobeast:icecastFallback";
const PIN_GENRES_KEY = "radiobeast:pinnedGenres";
const PIN_COUNTRIES_KEY = "radiobeast:pinnedCountries";
const PIN_LANGUAGES_KEY = "radiobeast:pinnedLanguages";

function loadFavs(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
function loadRecent(): Station[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function loadVol(): number {
  if (typeof window === "undefined") return 0.8;
  const v = localStorage.getItem(VOL_KEY);
  return v ? Math.min(1, Math.max(0, parseFloat(v))) : 0.8;
}
function loadSaver(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SAVER_KEY) === "1";
}
function loadPreferSelfHost(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SELF_HOST_KEY) === "1";
}
function loadIcecastFallback(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ICECAST_KEY) === "1";
}
function loadPinned(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function togglePinnedList(key: string, current: string[], value: string): string[] {
  const list = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(list));
  return list;
}
function loadSleepTimer(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(SLEEP_KEY);
  if (!v) return null;
  const parsed = parseInt(v, 10);
  if (isNaN(parsed) || parsed < Date.now()) return null;
  return parsed;
}

function loadSaved(): SavedStationMeta[] {
  if (typeof window === "undefined") return [];
  cleanExpired();
  return getSavedStations();
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  isPlaying: false,
  volume: typeof window !== "undefined" ? loadVol() : 0.8,
  isMuted: false,
  favorites: typeof window !== "undefined" ? loadFavs() : [],
  recent: typeof window !== "undefined" ? loadRecent() : [],
  pinnedGenres: typeof window !== "undefined" ? loadPinned(PIN_GENRES_KEY) : [],
  pinnedCountries: typeof window !== "undefined" ? loadPinned(PIN_COUNTRIES_KEY) : [],
  pinnedLanguages: typeof window !== "undefined" ? loadPinned(PIN_LANGUAGES_KEY) : [],
  dataSaver: typeof window !== "undefined" ? loadSaver() : false,
  sleepTimer: typeof window !== "undefined" ? loadSleepTimer() : null,
  compactMode: false,
  preferSelfHost: typeof window !== "undefined" ? loadPreferSelfHost() : false,
  icecastFallback: typeof window !== "undefined" ? loadIcecastFallback() : false,
  savedStations: typeof window !== "undefined" ? loadSaved() : [],

  play: (s) => {
    const { recent } = get();
    const newRecent = [s, ...recent.filter((r) => r.stationuuid !== s.stationuuid)].slice(0, 20);
    if (typeof window !== "undefined") localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    set({ current: s, isPlaying: true, recent: newRecent });
  },
  toggle: () => set((st) => ({ isPlaying: !st.isPlaying })),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => {
    if (typeof window !== "undefined") localStorage.setItem(VOL_KEY, String(v));
    set({ volume: v, isMuted: v === 0 ? true : false });
  },
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleFavorite: (uuid) => {
    const favs = get().favorites;
    const next = favs.includes(uuid) ? favs.filter((x) => x !== uuid) : [...favs, uuid];
    if (typeof window !== "undefined") localStorage.setItem(FAV_KEY, JSON.stringify(next));
    set({ favorites: next });
  },
  togglePinnedGenre: (tag) => {
    set({ pinnedGenres: togglePinnedList(PIN_GENRES_KEY, get().pinnedGenres, tag) });
  },
  togglePinnedCountry: (code) => {
    set({ pinnedCountries: togglePinnedList(PIN_COUNTRIES_KEY, get().pinnedCountries, code) });
  },
  togglePinnedLanguage: (lang) => {
    set({ pinnedLanguages: togglePinnedList(PIN_LANGUAGES_KEY, get().pinnedLanguages, lang) });
  },
  setQueue: (q) => set({ queue: q }),
  next: () => {
    const { queue, current } = get();
    if (!queue.length || !current) return;
    const idx = queue.findIndex((s) => s.stationuuid === current.stationuuid);
    const nxt = queue[(idx + 1) % queue.length];
    if (nxt) get().play(nxt);
  },
  prev: () => {
    const { queue, current } = get();
    if (!queue.length || !current) return;
    const idx = queue.findIndex((s) => s.stationuuid === current.stationuuid);
    const prv = queue[(idx - 1 + queue.length) % queue.length];
    if (prv) get().play(prv);
  },
  toggleDataSaver: () => {
    const next = !get().dataSaver;
    if (typeof window !== "undefined") localStorage.setItem(SAVER_KEY, next ? "1" : "0");
    set({ dataSaver: next });
  },
  setSleepTimer: (minutes) => {
    if (minutes === null) {
      if (typeof window !== "undefined") localStorage.removeItem(SLEEP_KEY);
      set({ sleepTimer: null });
    } else {
      const endTime = Date.now() + minutes * 60 * 1000;
      if (typeof window !== "undefined") localStorage.setItem(SLEEP_KEY, String(endTime));
      set({ sleepTimer: endTime });
    }
  },
  toggleCompactMode: () => set((st) => ({ compactMode: !st.compactMode })),
  togglePreferSelfHost: () => {
    const next = !get().preferSelfHost;
    if (typeof window !== "undefined") localStorage.setItem(SELF_HOST_KEY, next ? "1" : "0");
    set({ preferSelfHost: next });
  },
  toggleIcecastFallback: () => {
    const next = !get().icecastFallback;
    if (typeof window !== "undefined") localStorage.setItem(ICECAST_KEY, next ? "1" : "0");
    set({ icecastFallback: next });
  },
  clearFavorites: () => {
    if (typeof window !== "undefined") localStorage.setItem(FAV_KEY, "[]");
    set({ favorites: [] });
  },
  clearRecent: () => {
    if (typeof window !== "undefined") localStorage.setItem(RECENT_KEY, "[]");
    set({ recent: [] });
  },
  powerOff: () => {
    set({ isPlaying: false, current: null });
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      if (isStandalone) {
        try { window.close(); } catch {}
        // fallback for PWA: try to exit via history
        setTimeout(() => { try { window.history.back(); } catch {} }, 100);
      }
    }
  },
  saveStationForOffline: async (s, hours) => {
    const ok = await cacheSave(s, hours);
    if (ok) set({ savedStations: loadSaved() });
    return ok;
  },
  removeSavedStation: async (uuid) => {
    await cacheRemove(uuid);
    set({ savedStations: loadSaved() });
  },
  clearSavedStations: async () => {
    await clearAllSaved();
    set({ savedStations: [] });
  },
  refreshSavedStations: () => {
    cleanExpired();
    set({ savedStations: loadSaved() });
  },
}));

// hydrate on client
if (typeof window !== "undefined") {
  setTimeout(() => {
    const favs = loadFavs();
    const recent = loadRecent();
    const vol = loadVol();
    const saver = loadSaver();
    const sleep = loadSleepTimer();
    const preferSelfHost = loadPreferSelfHost();
    const icecastFallback = loadIcecastFallback();
    const savedStations = loadSaved();
    usePlayerStore.setState({
      favorites: favs, recent, volume: vol, dataSaver: saver, sleepTimer: sleep,
      preferSelfHost, icecastFallback, savedStations,
      pinnedGenres: loadPinned(PIN_GENRES_KEY),
      pinnedCountries: loadPinned(PIN_COUNTRIES_KEY),
      pinnedLanguages: loadPinned(PIN_LANGUAGES_KEY),
    });
  }, 0);
}
