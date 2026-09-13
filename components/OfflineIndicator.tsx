"use client";
import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/playerStore";

export function OfflineIndicator() {
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const { current } = usePlayerStore();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Send stations to SW for offline caching
  useEffect(() => {
    if (!online || !navigator.serviceWorker?.controller) return;
    const { queue } = usePlayerStore.getState();
    if (queue.length) {
      navigator.serviceWorker.controller.postMessage({ type: "CACHE_STATIONS", stations: queue.slice(0, 20) });
    }
  }, [online, current]);

  if (online) return null;

  return (
    <div className="fixed left-1/2 top-16 z-[90] -translate-x-1/2 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md px-5 py-2.5 text-sm font-medium text-amber-300 shadow-lg flex items-center gap-2" role="status">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      You&apos;re offline — station list unavailable
      {current && <span className="text-amber-400/70">• Playing from cache</span>}
    </div>
  );
}
