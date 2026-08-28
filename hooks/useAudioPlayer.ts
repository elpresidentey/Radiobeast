"use client";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/stores/playerStore";
import { clickStation } from "@/lib/radio";

export function useAudioPlayer() {
  const { current, isPlaying, volume, isMuted, setPlaying, sleepTimer } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // create audio element once
  useEffect(() => {
    const a = new Audio();
    // no crossOrigin — many Icecast servers don't send CORS, and anonymous would block playback
    a.crossOrigin = null;
    a.preload = "none";
    // @ts-ignore — playsInline for iOS
    a.playsInline = true;
    audioRef.current = a;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError = () => {
      retryCountRef.current++;
      if (retryCountRef.current <= maxRetries) {
        setError(`Retrying... (${retryCountRef.current}/${maxRetries})`);
        setLoading(true);
        setTimeout(() => {
          if (a.src) {
            a.load();
            a.play().catch(() => {
              setError("Stream unavailable after retries");
              setLoading(false);
              setPlaying(false);
            });
          }
        }, 2000 * retryCountRef.current);
      } else {
        setError("Stream unavailable");
        setLoading(false);
        setPlaying(false);
        retryCountRef.current = 0;
      }
    };
    const onEnded = () => setPlaying(false);

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("error", onError);
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
      a.removeEventListener("error", onError);
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
    setError(null);
    setLoading(true);
    retryCountRef.current = 0; // Reset retry count on source change

    // cleanup previous hls
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    let url = current.url_resolved || current.url;
    // fix: http on https page is blocked — try to upgrade or use proxy
    const isHttpsPage = typeof location !== "undefined" && location.protocol === "https:";
    const isHttp = url.startsWith("http://");
    if (isHttp && isHttpsPage) {
      // try https upgrade first; if that fails we'll fallback to proxy
      const httpsUrl = url.replace("http://", "https://");
      // we will try httpsUrl first, proxy as last resort
      url = httpsUrl;
    }

    // only treat as HLS if URL is m3u8 or m3u; hls flag alone is unreliable (many MP3 have hls=1)
    const isHls = url.includes(".m3u8") || url.includes(".m3u");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(a);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        a.play().catch((e) => {
          const m = (e as Error)?.message || "";
          if (m.includes("NotAllowedError") || m.includes("NotAllowed")) setError("Tap Play to start audio");
          else setError("Autoplay blocked — tap Play again");
          setLoading(false);
        });
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          retryCountRef.current++;
          if (retryCountRef.current <= maxRetries) {
            setError(`Retrying... (${retryCountRef.current}/${maxRetries})`);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setTimeout(() => hls.startLoad(), 2000 * retryCountRef.current);
            } else {
              hls.recoverMediaError();
            }
          } else {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // if we tried https upgrade and it failed, try proxy
              if (isHttp && isHttpsPage) {
                hls.destroy(); hlsRef.current = null;
                const proxy = `/api/stream?url=${encodeURIComponent(current.url_resolved || current.url)}`;
                a.src = proxy;
                a.play().catch(() => setError("Stream blocked (http). Try another station"));
              } else hls.startLoad();
            } else {
              hls.destroy(); hlsRef.current = null;
              a.src = url;
              a.play().catch(() => setError("Stream unavailable — try another"));
            }
            retryCountRef.current = 0;
          }
        }
      });
    } else {
      a.src = url;
      a.play().catch((e) => {
        const msg = (e as Error)?.message || "";
        if (msg.includes("NotAllowedError")) {
          setError("Tap Play to start");
          setLoading(false);
          return;
        }
        // if https upgrade failed, try proxy for original http
        if (isHttp && isHttpsPage && url.startsWith("https://")) {
          const proxy = `/api/stream?url=${encodeURIComponent(current.url_resolved || current.url)}`;
          a.src = proxy;
          a.play().catch(() => setError("Stream unavailable — try another station"));
          return;
        }
        if (url.startsWith("http://") && isHttpsPage) setError("Insecure http stream blocked on https. Using proxy…");
        else setError("Stream unavailable — try another station");
        setLoading(false);
      });
    }

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

  return { audioRef, error, loading, clearError: () => setError(null) };
}
