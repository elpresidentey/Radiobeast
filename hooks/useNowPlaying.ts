"use client";
import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/playerStore";

const POLL_MS = 20000;

// Shared metadata state — avoids duplicate fetches when multiple components mount
let globalTitle: string | null = null;
let globalUrl: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeUrl: string | null = null;
const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

function startPolling(url: string) {
  if (activeUrl === url && pollTimer) return;
  stopPolling();
  activeUrl = url;
  pollTimer = setInterval(() => fetchMeta(url), POLL_MS);
  fetchMeta(url);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  activeUrl = null;
}

async function fetchMeta(url: string) {
  try {
    const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
    const data = await res.json();
    globalTitle = data.title || null;
    globalUrl = data.url || null;
  } catch {
    // network hiccup — keep stale title rather than clearing it
  }
  notify();
}

export function useNowPlaying() {
  const { current, isPlaying } = usePlayerStore();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const sub = () => forceUpdate((n) => n + 1);
    listeners.add(sub);
    return () => { listeners.delete(sub); };
  }, []);

  useEffect(() => {
    const url = current?.url_resolved || current?.url;
    if (!url || !isPlaying) {
      stopPolling();
      globalTitle = null;
      globalUrl = null;
      notify();
      return;
    }
    startPolling(url);
    return () => { stopPolling(); globalTitle = null; globalUrl = null; };
  }, [current, isPlaying]);

  return { title: globalTitle, url: globalUrl };
}
