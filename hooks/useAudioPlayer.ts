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

  useEffect(() => {
    const a = new Audio();
    a.crossOrigin = null;
    a.preload = "none";
    // @ts-expect-error — playsInline is video-only in TS DOM lib, but works at runtime on iOS audio
    a.playsInline = true;
    audioRef.current = a;

    const onPlay = () => setPlaying(true);
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

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (!audioRef.current || !current) return;
    const a = audioRef.current;
    setError(null);
    setLoading(true);
    setPlayingOffline(false);
    fallbackRef.current = 0;
    sourceChangingRef.current = true;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const prevCleanup = (a as HTMLAudioElement & { _cleanupErr?: () => void })._cleanupErr;
    if (prevCleanup) prevCleanup();

    if (!navigator.onLine && isStationSaved(current.stationuuid)) {
      getCachedAudioUrl(current.stationuuid).then((blobUrl) => {
        if (!blobUrl) {
          setError("Station not cached — connect to internet");
          setLoading(false);
          setPlaying(false);
          sourceChangingRef.current = false;
          return;
        }
        a.src = blobUrl;
        setPlayingOffline(true);
        a.play().then(() => { sourceChangingRef.current = false; }).catch((e) => {
          sourceChangingRef.current = false;
          setError((e as Error)?.message?.includes("NotAllowedError") ? "Tap Play to start audio" : "Cached playback failed");
          setLoading(false);
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

    const finishSourceChange = () => { sourceChangingRef.current = false; };

    function tryNextCandidate() {
      if (fallbackRef.current >= candidates.length) {
        setError("Stream unavailable — try another station");
        setLoading(false);
        setPlaying(false);
        finishSourceChange();
        return;
      }
      tryUrl(candidates[fallbackRef.current++]);
    }

    function tryUrl(url: string) {
      const isHls = url.includes(".m3u8") || url.includes(".m3u");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(a);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          a.play().then(finishSourceChange).catch((e) => {
            finishSourceChange();
            setError((e as Error)?.message?.includes("NotAllowedError") ? "Tap Play to start audio" : "Autoplay blocked — tap Play again");
            setLoading(false);
          });
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            hls.destroy();
            hlsRef.current = null;
            if (fallbackRef.current < candidates.length) {
              setError("Trying fallback...");
              setTimeout(tryNextCandidate, 500);
            } else {
              setError("Stream unavailable — try another station");
              setLoading(false);
              setPlaying(false);
              finishSourceChange();
            }
          }
        });
      } else {
        a.src = url;
        const onError = () => {
          a.removeEventListener("error", onError);
          if (fallbackRef.current < candidates.length) {
            setTimeout(tryNextCandidate, 300);
          } else {
            setError("Stream unavailable — try another station");
            setLoading(false);
            setPlaying(false);
            finishSourceChange();
          }
        };
        a.addEventListener("error", onError);
        (a as HTMLAudioElement & { _cleanupErr?: () => void })._cleanupErr = () => a.removeEventListener("error", onError);

        a.play().then(finishSourceChange).catch((e) => {
          a.removeEventListener("error", onError);
          const msg = (e as Error)?.message || "";
          if (msg.includes("NotAllowedError")) {
            setError("Tap Play to start");
            setLoading(false);
            finishSourceChange();
            return;
          }
          if (fallbackRef.current < candidates.length) {
            setTimeout(tryNextCandidate, 300);
          } else {
            setError("Stream unavailable — try another station");
            setLoading(false);
            setPlaying(false);
            finishSourceChange();
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
  }, [current]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (sourceChangingRef.current) return;
    if (isPlaying) {
      if (a.paused) a.play().catch((e) => {
        setError(e?.message || "Playback failed");
        setPlaying(false);
      });
    } else {
      a.pause();
    }
  }, [isPlaying, current, setPlaying]);

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
