"use client";
import { usePlayerStore } from "@/stores/playerStore";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useNowPlaying } from "@/hooks/useNowPlaying";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Station, getSimilarStations } from "@/lib/radio";

function flag(code: string) {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function fmtSleep(msLeft: number) {
  const m = Math.max(0, Math.round(msLeft / 60000));
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}

const IconPlay = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7z" /></svg>
);
const IconPause = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
);
const IconNext = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5l8 7-8 7V5zM16 5h2v14h-2z" /></svg>
);
const IconPrev = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 5l-8 7 8 7V5zM6 5h2v14H6z" /></svg>
);

const SLEEP_OPTIONS = [5, 15, 30, 60, 90];

export function GlobalPlayer() {
  const {
    current, isPlaying, toggle, volume, setVolume, isMuted, toggleMute,
    favorites, toggleFavorite, next, prev, queue, dataSaver,
    sleepTimer, setSleepTimer, play, powerOff,
  } = usePlayerStore();
  const { error, loading, playingOffline, streamFailed, clearError } = useAudioPlayer();
  const { title: nowPlayingTitle } = useNowPlaying();
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [sleepLeft, setSleepLeft] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [suggestionsFor, setSuggestionsFor] = useState<string | null>(null);

  const showSuggestions = streamFailed && !!current;
  const loadingSuggestions = showSuggestions && current.stationuuid !== suggestionsFor;
  const visibleSuggestions = showSuggestions && current.stationuuid === suggestionsFor ? suggestions : [];

  useEffect(() => {
    if (!streamFailed || !current) return;
    let cancelled = false;
    getSimilarStations(current, 6)
      .then((list) => { if (!cancelled) { setSuggestionsFor(current.stationuuid); setSuggestions(list); } })
      .catch(() => { if (!cancelled) { setSuggestionsFor(current.stationuuid); setSuggestions([]); } });
    return () => { cancelled = true; };
  }, [streamFailed, current]);

  useEffect(() => {
    if (!sleepTimer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSleepLeft(null);
      return;
    }
    const tick = () => setSleepLeft(sleepTimer - Date.now());
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [sleepTimer]);

  if (!current) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 liquid-strong safe-bottom">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-center gap-2 text-[13px] text-[var(--muted-foreground)] text-center">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-hover)] animate-pulse hidden sm:inline" />
          <span className="truncate">Pick a station — 45,000+ live worldwide</span>
          <span className="hidden sm:inline text-[var(--border-hover)]">•</span>
          <span className="hidden sm:inline">Space to play/pause • ←/→ to zap</span>
        </div>
      </div>
    );
  }

  const isFav = favorites.includes(current.stationuuid);
  const mbPerHour = current.bitrate ? Math.round((current.bitrate * 3600) / 8 / 1024) : null;
  const nowTitle = nowPlayingTitle || current.tags?.split(",")[0] || current.language || "Live broadcast";
  const queueIdx = queue.findIndex((s) => s.stationuuid === current.stationuuid);

  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed inset-x-0 bottom-0 z-50 liquid-strong safe-bottom shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.5)]">
      {error && (
        <div className="flex items-center justify-between gap-2 bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-sm text-red-400" role="alert">
          <span className="truncate text-xs sm:text-sm">{error}</span>
          <button onClick={clearError} className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-semibold shrink-0 pressable">Dismiss</button>
        </div>
      )}
      {streamFailed && (loadingSuggestions || visibleSuggestions.length > 0) && (
        <div className="border-b border-[var(--border)] bg-[var(--muted)]/40 px-3 sm:px-4 py-2">
          <div className="mx-auto max-w-6xl flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {loadingSuggestions ? "Finding similar…" : "Try instead →"}
            </span>
            {visibleSuggestions.map((s) => (
              <button
                key={s.stationuuid}
                onClick={() => play(s)}
                className="shrink-0 max-w-[220px] truncate rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] px-3 py-1.5 text-xs font-semibold pressable"
              >
                {flag(s.countrycode)} {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {playingOffline && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 text-xs text-emerald-400 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Playing from offline cache
        </div>
      )}
      <div className="h-[3px] w-full bg-[var(--border)] overflow-hidden" aria-hidden="true">
        <div
          className="h-full"
          style={{
            width: "100%",
            opacity: isPlaying ? 1 : 0.3,
            backgroundColor: isPlaying ? "var(--accent)" : "var(--border-hover)",
            transition: "opacity .35s ease, background-color .35s ease, width .4s cubic-bezier(.16,1,.3,1)",
            boxShadow: isPlaying ? "0 0 10px color-mix(in srgb, var(--accent) 40%, transparent)" : undefined,
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-3 sm:px-4">
        <div className="flex items-center gap-2.5 sm:gap-3 py-2.5">
          {/* art */}
          <div className={`relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)] border transition-colors ${isPlaying ? "border-[var(--accent)]/40 shadow-md shadow-[var(--accent)]/15" : "border-[var(--border)]"}`}>
            {current.favicon && !dataSaver ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.favicon} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            ) : (
              <div className="h-full w-full grid place-items-center text-lg">{flag(current.countrycode)}</div>
            )}
            {isPlaying && !loading && <div className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[var(--card)]" />}
            {loading && <div className="absolute inset-0 grid place-items-center bg-black/50"><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /></div>}
          </div>

          {/* meta */}
          <button onClick={() => setExpanded((v) => !v)} className="min-w-0 flex-1 text-left rounded-lg px-1 py-0.5 -ml-1 hover:bg-[var(--muted)]/50 transition-colors" aria-expanded={expanded} aria-label="Toggle player details">
            <div className="truncate text-[13px] sm:text-sm font-semibold leading-tight flex items-center gap-2">
              <span className="truncate">{current.name}</span>
              {loading && <span className="shrink-0 rounded-md bg-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)]">BUFFERING</span>}
              {sleepTimer && sleepLeft !== null && sleepLeft > 0 && (
                <span className="shrink-0 rounded-md bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 px-1.5 py-0.5 text-[10px] font-bold">⏾ {fmtSleep(sleepLeft)}</span>
              )}
            </div>
            <div className="truncate text-[11px] sm:text-xs text-[var(--muted-foreground)] mt-0.5">
              {flag(current.countrycode)} {current.country || "World"} • {nowPlayingTitle && <span className="text-[var(--foreground)]/80 font-medium">{nowPlayingTitle} • </span>}{current.bitrate ? `${current.bitrate} kbps` : current.codec || "Live"}{mbPerHour ? ` · ~${mbPerHour}MB/h` : ""}
            </div>
          </button>

          {/* transport — prev/next/play always visible now (mobile fix) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={prev} disabled={!queue.length} aria-label="Previous station" className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 pressable">
              <IconPrev />
            </button>
            <button onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"} className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--foreground)] text-[var(--background)] shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-transform pressable glow-accent">
              {isPlaying ? <IconPause /> : <span className="ml-0.5"><IconPlay /></span>}
            </button>
            <button onClick={next} disabled={!queue.length} aria-label="Next station" className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 pressable">
              <IconNext />
            </button>
            <button onClick={() => toggleFavorite(current.stationuuid)} aria-label={isFav ? "Remove favourite" : "Add favourite"} aria-pressed={isFav} className={`hidden sm:grid h-9 w-9 place-items-center rounded-xl border pressable ${isFav ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-6.5-4.2-9-8.6A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 8.9 7.4C18.5 16.8 12 21 12 21z" /></svg>
            </button>
            <button onClick={() => setQueueOpen(true)} aria-label="Open queue" className="hidden sm:grid h-9 w-9 place-items-center rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] pressable" title="Up next">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            </button>
            <div className="hidden lg:flex items-center gap-2 pl-2 ml-1 border-l border-[var(--border)]">
              <button onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"} className="h-8 w-8 grid place-items-center rounded-lg bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                {isMuted || volume === 0 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>
                )}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="range-slider w-24" aria-label="Volume" />
              <span className="text-xs text-[var(--muted-foreground)] w-9 text-right tabular-nums">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
            </div>
            <button onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Collapse player" : "Expand player"} className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] pressable">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`transition-transform ${expanded ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>
        </div>

        {/* expanded sheet */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pb-4 pt-1 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-3.5 text-xs space-y-1.5">
                  <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)]">NOW PLAYING</div>
                  <div className="text-sm font-semibold">{nowTitle}</div>
                  <div className="text-[var(--muted-foreground)]">{current.tags || "Live radio"} </div>
                  <div className="text-[var(--muted-foreground)]">{current.country}{current.state ? ` · ${current.state}` : ""} • {current.language || "—"}</div>
                  <div className="text-[var(--muted-foreground)]">{current.codec} {current.bitrate ? `· ${current.bitrate} kbps · ~${mbPerHour} MB/h` : ""}</div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => toggleFavorite(current.stationuuid)} className={`flex-1 rounded-xl border py-2.5 text-[13px] font-semibold pressable ${isFav ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--muted)] border-[var(--border)]"}`}>
                      {isFav ? "♥ Favourited" : "♡ Favourite"}
                    </button>
                    <button onClick={() => setQueueOpen(true)} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--muted)] py-2.5 text-[13px] font-semibold pressable">
                      Up next{queue.length ? ` (${queue.length})` : ""}
                    </button>
                  </div>
                  {current.homepage && <a href={current.homepage} target="_blank" rel="noreferrer" className="block rounded-xl border border-[var(--border)] bg-[var(--muted)] px-2 py-2.5 text-center font-semibold hover:border-[var(--border-hover)] transition-colors">Station website ↗</a>}
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-3.5">
                    <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2.5">VOLUME</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--muted-foreground)] w-11 tabular-nums">{isMuted ? "Muted" : Math.round(volume * 100) + "%"}</span>
                      <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="range-slider flex-1" aria-label="Volume" />
                      <button onClick={toggleMute} className="rounded-lg bg-[var(--foreground)] text-[var(--background)] px-3 py-1.5 text-xs font-bold pressable">{isMuted ? "Unmute" : "Mute"}</button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-3.5">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)]">SLEEP TIMER</div>
                      {sleepTimer && <button onClick={() => setSleepTimer(null)} className="text-[11px] font-semibold text-red-400 hover:underline">Cancel</button>}
                    </div>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sleep timer">
                      {SLEEP_OPTIONS.map((m) => {
                        // eslint-disable-next-line react-hooks/purity
                        const now = Date.now();
                        const active = sleepTimer && sleepTimer - now > (m - 5) * 60000 && sleepTimer - now <= (m + 5) * 60000;
                        return (
                          <button
                            key={m}
                            onClick={() => setSleepTimer(m)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold pressable ${active ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" : "bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                          >
                            {m}m
                          </button>
                        );
                      })}
                      {!sleepTimer && <span className="text-[11px] text-[var(--muted-foreground)] w-full mt-1">Stops playback so you can doze off.</span>}
                      {sleepTimer && sleepLeft !== null && <span className="text-[11px] text-indigo-300 font-semibold w-full mt-1">Stops in ~{fmtSleep(sleepLeft)}</span>}
                    </div>
                  </div>
                  <button onClick={powerOff} className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white py-2.5 text-[13px] font-bold transition-colors pressable">⏻ Power off</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* queue drawer */}
      <AnimatePresence>
        {queueOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQueueOpen(false)} className="fixed inset-0 z-[60] bg-[var(--overlay)] backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-w-lg rounded-t-3xl border border-[var(--border)] bg-[var(--card)] max-h-[70vh] flex flex-col overflow-hidden"
              role="dialog"
              aria-label="Up next queue"
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)]">
                <div>
                  <div className="text-sm font-bold">Up next</div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">{queue.length} stations{queueIdx >= 0 ? ` • #${queueIdx + 1} playing` : ""}</div>
                </div>
                <button onClick={() => setQueueOpen(false)} aria-label="Close queue" className="h-8 w-8 grid place-items-center rounded-full bg-[var(--muted)] border border-[var(--border)] text-lg leading-none hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] transition-colors pressable">×</button>
              </div>
              <div className="overflow-y-auto thin-scroll p-2">
                {queue.map((s, i) => (
                  <button
                    key={s.stationuuid}
                    onClick={() => { play(s); }}
                    className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${s.stationuuid === current.stationuuid ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30" : "border border-transparent hover:bg-[var(--muted)]"}`}
                  >
                    <span className="text-[11px] font-bold text-[var(--muted-foreground)] w-6 text-right tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{s.name}</span>
                      <span className="block truncate text-[11px] text-[var(--muted-foreground)]">{s.country} • {s.bitrate ? `${s.bitrate}k` : s.codec}</span>
                    </span>
                    {s.stationuuid === current.stationuuid && isPlaying && (
                      <span className="flex items-end gap-[2px] h-3 shrink-0" aria-hidden="true">
                        <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "10px" }} />
                        <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "6px", animationDelay: "0.15s" }} />
                      </span>
                    )}
                  </button>
                ))}
                {!queue.length && <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">Queue is empty — play something first.</div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
