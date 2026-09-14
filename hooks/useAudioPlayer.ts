"use client";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/stores/playerStore";
import { clickStation } from "@/lib/radio";
import { getCachedAudioUrl, isStationSaved } from "@/lib/offlineCache";

export function useAudioPlayer() {
  const { current, isPlaying, volume, isMuted, setPlaying, sleepTimer } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playingOffline, setPlayingOffline] = useState(false);
  const fallbackRef = useRef(0);
  const sourceChangingRef = useRef(false);
  // Bump on every source change so stale async callbacks from a previous
  // station don't write state into the current one.
  const generationRef = useRef(0);

  // create audio element once
  useEffect(() => {
    const a = new Audio();
    a.crossOrigin = null;
    a.preload = "none";
    // @ts-expect-error — playsInline is video-only in TS DOM lib, but works at runtime on iOS audio
    a.playsInline = true;
    audioRef.current = a;

    const onPlay = () => {
      if (!sourceChangingRef.current) setPlaying(true);
    };
    const onPause = () => {
      if (!sourceChangingRef.current) setPlaying(false);
    };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEnded = () => setPlaying(false);

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("ended", onEnded);

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", () => a.play().catch(() => {}));
        navigator.mediaSession.setActionHandler("pause", () => a.pause());
        navigator.mediaSession.setActionHandler("nexttrack", () => usePlayerStore.getState().next());
        navigator.mediaSession.setActionHandler("previoustrack", () => usePlayerStore.getState().prev());
      } catch {}
    }

    return () => {
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("ended", onEnded);
      a.src = "";
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [setPlaying]);

  // volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // source change
  useEffect(() => {
    if (!audioRef.current || !current) return;
    const a = audioRef.current;
    const gen = ++generationRef.current;

    setError(null);
    setLoading(true);
    setPlayingOffline(false);
    fallbackRef.current = 0;
    sourceChangingRef.current = true;

    // Stop previous stream cleanly before switching
    a.pause();
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const prevCleanup = (a as HTMLAudioElement & { _cleanupErr?: () => void })._cleanupErr;
    if (prevCleanup) prevCleanup();

    // Helper: bail out if a newer source change has started
    const alive = () => gen === generationRef.current;

    const finish = () => {
      if (!alive()) return;
      sourceChangingRef.current = false;
    };

    // Offline cached playback
    if (!navigator.onLine && isStationSaved(current.stationuuid)) {
      getCachedAudioUrl(current.stationuuid).then((blobUrl) => {
        if (!alive()) return;
        if (!blobUrl) {
          setError("Station not cached — connect to internet");
          setLoading(false);
          setPlaying(false);
          finish();
          return;
        }
        a.src = blobUrl;
        setPlayingOffline(true);
        a.play().then(finish).catch((e) => {
          if (!alive()) return;
          setError((e as Error)?.message?.includes("NotAllowedError") ? "Tap Play to start audio" : "Cached playback failed");
          setLoading(false);
          finish();
        });
      });
      clickStation(current.stationuuid);
      return;
    }

    const originalUrl = current.url_resolved || current.url;
    const isHttpsPage = typeof location !== "undefined" && location.protocol === "https:";
    const isHttp = originalUrl.startsWith("http://");

    const candidates: string[] = isHttp && isHttpsPage
      ? [originalUrl.replace("http://", "https://"), `/api/stream?url=${encodeURIComponent(originalUrl)}`]
      : [originalUrl];

    function tryNextCandidate() {
      if (!alive()) return;
      if (fallbackRef.current >= candidates.length) {
        setError("Stream unavailable — try another station");
        setLoading(false);
        setPlaying(false);
        finish();
        return;
      }
      tryUrl(candidates[fallbackRef.current++]);
    }

    function tryUrl(url: string) {
      if (!alive()) return;
      const isHls = url.includes(".m3u8") || url.includes(".m3u");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(a);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!alive()) return;
          a.play().then(finish).catch((e) => {
            if (!alive()) return;
            setError((e as Error)?.message?.includes("NotAllowedError") ? "Tap Play to start audio" : "Autoplay blocked — tap Play again");
            setLoading(false);
            finish();
          });
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!alive() || !data.fatal) return;
          hls.destroy();
          hlsRef.current = null;
          if (fallbackRef.current < candidates.length) {
            setError("Trying fallback...");
            setTimeout(tryNextCandidate, 500);
          } else {
            setError("Stream unavailable — try another station");
            setLoading(false);
            setPlaying(false);
            finish();
          }
        });
      } else {
        a.src = url;
        const onError = () => {
          a.removeEventListener("error", onError);
          if (!alive()) return;
          if (fallbackRef.current < candidates.length) {
            setTimeout(tryNextCandidate, 300);
          } else {
            setError("Stream unavailable — try another station");
            setLoading(false);
            setPlaying(false);
            finish();
          }
        };
        a.addEventListener("error", onError);
        (a as HTMLAudioElement & { _cleanupErr?: () => void })._cleanupErr = () => a.removeEventListener("error", onError);

        a.play().then(finish).catch((e) => {
          a.removeEventListener("error", onError);
          if (!alive()) return;
          const msg = (e as Error)?.message || "";
          // AbortError = interrupted by source change — not a real error
          if (msg.includes("AbortError") || msg.includes("interrupted")) {
            finish();
            return;
          }
          if (msg.includes("NotAllowedError")) {
            setError("Tap Play to start");
            setLoading(false);
            finish();
            return;
          }
          if (fallbackRef.current < candidates.length) {
            setTimeout(tryNextCandidate, 300);
          } else {
            setError("Stream unavailable — try another station");
            setLoading(false);
            setPlaying(false);
            finish();
          }
        });
      }
    }

    tryNextCandidate();

    clickStation(current.stationuuid);
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: current.name,
          artist: current.country || current.language || "Live Radio",
          album: current.tags?.split(",")[0] || "Radiobeast",
          artwork: current.favicon ? [{ src: current.favicon, sizes: "512x512", type: "image/png" }] : [],
        });
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // play/pause toggle — only for user-initiated actions, NOT during source changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (sourceChangingRef.current) return;
    if (isPlaying) {
      if (a.paused) a.play().catch((e) => {
        const msg = (e as Error)?.message || "";
        if (msg.includes("AbortError") || msg.includes("interrupted")) return;
        setError(msg || "Playback failed");
        setPlaying(false);
      });
    } else {
      a.pause();
    }
  }, [isPlaying, current, setPlaying]);

  // sleep timer check
  useEffect(() => {
    if (!sleepTimer) return;
    const checkTimer = setInterval(() => {
      if (Date.now() >= sleepTimer) {
        setPlaying(false);
        usePlayerStore.getState().setSleepTimer(null);
      }
    }, 1000);
    return () => clearInterval(checkTimer);
  }, [sleepTimer, setPlaying]);

  return { audioRef, error, loading, playingOffline, clearError: () => setError(null) };
}
