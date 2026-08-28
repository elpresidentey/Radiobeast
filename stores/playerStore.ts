"use client";
import { create } from "zustand";
import { Station } from "@/lib/radio";

type PlayerState = {
  current: Station | null;
  queue: Station[];
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  favorites: string[]; // stationuuids
  recent: Station[];
  dataSaver: boolean;
  sleepTimer: number | null; // timestamp when timer should stop
  compactMode: boolean;
  // actions
  play: (s: Station) => void;
  toggle: () => void;
  setPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleFavorite: (uuid: string) => void;
  setQueue: (q: Station[]) => void;
  next: () => void;
  prev: () => void;
  toggleDataSaver: () => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleCompactMode: () => void;
};

const FAV_KEY = "radiobeast:favs";
const RECENT_KEY = "radiobeast:recent";
const VOL_KEY = "radiobeast:vol";
const SAVER_KEY = "radiobeast:saver";
const SLEEP_KEY = "radiobeast:sleep";

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
function loadSleepTimer(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(SLEEP_KEY);
  if (!v) return null;
  const parsed = parseInt(v, 10);
  if (isNaN(parsed) || parsed < Date.now()) return null;
  return parsed;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  isPlaying: false,
  volume: typeof window !== "undefined" ? loadVol() : 0.8,
  isMuted: false,
  favorites: typeof window !== "undefined" ? loadFavs() : [],
  recent: typeof window !== "undefined" ? loadRecent() : [],
  dataSaver: typeof window !== "undefined" ? loadSaver() : false,
  sleepTimer: typeof window !== "undefined" ? loadSleepTimer() : null,
  compactMode: false,

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
}));

// hydrate on client
if (typeof window !== "undefined") {
  setTimeout(() => {
    const favs = loadFavs();
    const recent = loadRecent();
    const vol = loadVol();
    const saver = loadSaver();
    const sleep = loadSleepTimer();
    usePlayerStore.setState({ favorites: favs, recent, volume: vol, dataSaver: saver, sleepTimer: sleep });
  }, 0);
}
