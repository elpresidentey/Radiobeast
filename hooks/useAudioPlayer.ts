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
  // Track what fallback stage we're in to avoid infinite loops
  const fallbackRef = useRef(0);

  // create audio element once
  useEffect(() => {
    const a = new Audio();
    a.crossOrigin = null;
    a.preload = "none";
    // @ts-expect-error — playsInline is video-only in TS DOM lib, but works at runtime on iOS audio
    a.playsInline = true;
    audioRef.current = a;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEnded = () => setPlaying(false);

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("ended", onEnded);

    // Media Session
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

  // source change — handles all fallback logic internally
  useEffect(() => {
    if (!audioRef.current || !current) return;
    const a = audioRef.current;
    setError(null);
    setLoading(true);
    setPlayingOffline(false);
    fallbackRef.current = 0;

    // cleanup previous hls
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    // If offline and station is saved, play from cache
    if (!navigator.onLine && isStationSaved(current.stationuuid)) {
      getCachedAudioUrl(current.stationuuid).then((blobUrl) => {
        if (!blobUrl) {
          setError("Station not cached — connect to internet");
          setLoading(false);
          setPlaying(false);
          return;
        }
        a.src = blobUrl;
        setPlayingOffline(true);
        a.play().catch((e) => {
          const m = (e as Error)?.message || "";
          if (m.includes("NotAllowedError")) setError("Tap Play to start audio");
          else setError("Cached playback failed");
          setLoading(false);
        });
      });
      clickStation(current.stationuuid);
      return;
    }

    const originalUrl = current.url_resolved || current.url;
    const isHttpsPage = typeof location !== "undefined" && location.protocol === "https:";
    const isHttp = originalUrl.startsWith("http://");

    // Build ordered list of URLs to try
    const candidates: string[] = [];
    if (isHttp && isHttpsPage) {
      candidates.push(originalUrl.replace("http://", "https://")); // 1. try HTTPS upgrade
      candidates.push(`/api/stream?url=${encodeURIComponent(originalUrl)}`); // 2. proxy
    } else {
      candidates.push(originalUrl); // just try the URL directly
    }

    function tryNextCandidate() {
      if (fallbackRef.current >= candidates.length) {
        setError("Stream unavailable — try another station");
        setLoading(false);
        setPlaying(false);
        return;
      }
      const url = candidates[fallbackRef.current];
      fallbackRef.current++;
      tryUrl(url);
    }

    function tryUrl(url: string) {
      // only treat as HLS if URL is m3u8 or m3u
      const isHls = url.includes(".m3u8") || url.includes(".m3u");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(a);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          a.play().catch((e) => {
            const m = (e as Error)?.message || "";
            if (m.includes("NotAllowedError")) setError("Tap Play to start audio");
            else setError("Autoplay blocked — tap Play again");
            setLoading(false);
          });
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            hls.destroy();
            hlsRef.current = null;
            // Try next candidate instead of retrying the same broken URL
            if (fallbackRef.current < candidates.length) {
              setError(`Trying fallback...`);
              setTimeout(tryNextCandidate, 500);
            } else {
              setError("Stream unavailable — try another station");
              setLoading(false);
              setPlaying(false);
            }
          }
        });
      } else {
        // Direct audio (MP3/AAC/etc)
        a.src = url;
        a.play().catch((e) => {
          const msg = (e as Error)?.message || "";
          if (msg.includes("NotAllowedError")) {
            setError("Tap Play to start");
            setLoading(false);
            return;
          }
          // Try next candidate
          if (fallbackRef.current < candidates.length) {
            setTimeout(tryNextCandidate, 300);
          } else {
            setError("Stream unavailable — try another station");
            setLoading(false);
            setPlaying(false);
          }
        });
        // Also listen for error event for network failures (not just play() rejection)
        const onError = () => {
          a.removeEventListener("error", onError);
          if (fallbackRef.current < candidates.length) {
            setTimeout(tryNextCandidate, 300);
          } else {
            setError("Stream unavailable — try another station");
            setLoading(false);
            setPlaying(false);
          }
        };
        a.addEventListener("error", onError);
        // Clean up error listener on next source change
        const cleanup = () => { a.removeEventListener("error", onError); };
        // Store cleanup for next effect run
        const prevCleanup = (a as HTMLAudioElement & { _cleanupOffline?: () => void })._cleanupOffline;
        if (prevCleanup) prevCleanup();
        (a as HTMLAudioElement & { _cleanupOffline?: () => void })._cleanupOffline = cleanup;
      }
    }

    // Start trying candidates
    tryNextCandidate();

    // click counting
    clickStation(current.stationuuid);
    // media session metadata
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
  }, [current]);

  // play/pause toggle
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (isPlaying) {
      if (a.paused) a.play().catch((e) => {
        setError(e?.message || "Playback failed");
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
