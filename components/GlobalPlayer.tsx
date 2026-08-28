"use client";
import { usePlayerStore } from "@/stores/playerStore";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSimilarStations } from "@/lib/radio";

function flag(code: string){
  if(!code||code.length!==2) return "🌍";
  return code.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));
}

export function GlobalPlayer() {
  const { current, isPlaying, toggle, volume, setVolume, isMuted, toggleMute, favorites, toggleFavorite, next, prev, queue, dataSaver, sleepTimer, setSleepTimer, play, compactMode, toggleCompactMode } = usePlayerStore();
  const { error, loading, clearError } = useAudioPlayer();
  const [expanded, setExpanded] = useState(false);
  const [nowTitle, setNowTitle] = useState<string | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [similarStations, setSimilarStations] = useState<typeof import("@/lib/radio").Station[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(()=>{
    if(!current || !isPlaying) { setNowTitle(null); return; }
    const hint = current.tags?.split(",")[0] || current.language || "Live broadcast";
    setNowTitle(hint);
  },[current, isPlaying]);

  // Load similar stations when current changes
  useEffect(() => {
    if (!current) {
      setSimilarStations([]);
      return;
    }
    setLoadingSimilar(true);
    getSimilarStations(current, 4)
      .then(setSimilarStations)
      .catch(() => setSimilarStations([]))
      .finally(() => setLoadingSimilar(false));
  }, [current]);

  const sleepMinutesLeft = sleepTimer ? Math.max(0, Math.ceil((sleepTimer - Date.now()) / 60000)) : null;

  if (!current) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 liquid-strong safe-bottom">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-3 flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] text-center">
          <span className="h-1.5 w-1.5 bg-[var(--border-hover)] rounded-sm animate-pulse hidden sm:inline"/> <span className="truncate">Pick a station — 45k+ worldwide</span><span className="hidden sm:inline">• Data Saver {dataSaver ? "ON" : "OFF"}</span>
        </div>
      </div>
    );
  }
  const isFav = favorites.includes(current.stationuuid);
  const mbPerHour = current.bitrate ? Math.round((current.bitrate*3600)/8/1024) : null;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`fixed inset-x-0 bottom-0 z-50 liquid-strong safe-bottom ${compactMode ? "h-16" : ""}`}>
      {error && (
        <div className="flex items-center justify-between gap-2 bg-[#1e1e1e] border-b border-[#262626] px-3 py-2 text-sm text-[#ff3b30]">
          <span className="truncate text-xs sm:text-sm">{error}</span>
          <button onClick={clearError} className="bg-[#ff3b30] text-white px-3 py-1 text-xs font-bold rounded-none shrink-0">Dismiss</button>
        </div>
      )}
      <div className="h-[2px] w-full bg-[var(--border)] overflow-hidden"><div className={`h-full bg-[#ff3b30] ${isPlaying ? "w-full animate-[shimmer_1.2s_infinite]" : "w-[35%] opacity-60"}`} style={{ backgroundSize: "200% 100%", backgroundImage: isPlaying ? "linear-gradient(90deg, #ff3b30, #ff6b30, #ff3b30)" : undefined }} /></div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        {compactMode ? (
          <div className="flex items-center gap-3 py-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden bg-[#0f0f0f] border border-[#262626] rounded-[6px]">
              {current.favicon && !dataSaver ? (
                <img src={current.favicon} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e)=>(e.currentTarget.style.display="none")} />
              ) : (
                <div className="h-full w-full grid place-items-center bg-[#1e1e1e] text-xs">{flag(current.countrycode)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold">{current.name}</div>
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggle} className="grid h-8 w-8 place-items-center bg-white text-black rounded-none font-black shrink-0 pressable">{isPlaying ? "॥" : "▶"}</motion.button>
            <button onClick={toggleCompactMode} className="h-8 w-8 grid place-items-center bg-[#1e1e1e] border border-[#262626] rounded-none text-white/60 hover:text-white">⛶</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden bg-[#0f0f0f] border border-[#262626] rounded-[8px]">
              {current.favicon && !dataSaver ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.favicon} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e)=>(e.currentTarget.style.display="none")} />
              ) : (
                <div className="h-full w-full grid place-items-center bg-[#1e1e1e] text-base sm:text-lg">{flag(current.countrycode)}</div>
              )}
              {isPlaying && <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 bg-[#4ade80] border-2 border-[#141414] rounded-sm" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] sm:text-[13px] font-bold leading-tight flex items-center gap-1.5">
                <span className="truncate">{current.name}</span>
                {loading && <span className="shrink-0 bg-[#1e1e1e] border border-[#262626] px-1.5 py-0.5 text-[10px] font-bold rounded-[4px] hidden sm:inline">BUFFERING</span>}
              </div>
              <div className="truncate text-[11px] sm:text-xs text-white/50 flex items-center gap-1 mt-0.5">
                <span className="truncate">{flag(current.countrycode)} {current.country}</span>
                <span className="h-1 w-1 bg-white/20 rounded-sm shrink-0"/> <span className="truncate hidden sm:inline">{nowTitle || current.language || "Live"} • {current.bitrate ? `${current.bitrate} kbps` : current.codec} {mbPerHour ? `· ~${mbPerHour}MB/h` : ""}</span><span className="truncate sm:hidden">{current.bitrate ? `${current.bitrate}k` : current.codec}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <motion.button whileTap={{ scale: 0.92 }} onClick={prev} disabled={!queue.length} className="hidden sm:grid h-9 w-9 place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)] disabled:opacity-30 pressable">‹‹</motion.button>
              <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.04 }} onClick={toggle} className="grid h-10 w-10 sm:h-10 sm:w-10 place-items-center bg-white text-black rounded-none font-black shrink-0 pressable shadow-sm" aria-label={isPlaying?"pause":"play"}>{isPlaying ? "॥" : "▶"}</motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={next} disabled={!queue.length} className="hidden sm:grid h-9 w-9 place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)] disabled:opacity-30 pressable">››</motion.button>
              <motion.button whileTap={{ scale: 0.85 }} onClick={()=>toggleFavorite(current.stationuuid)} className={`hidden sm:grid h-9 w-9 place-items-center border rounded-none shrink-0 pressable ${isFav?"bg-[#ff3b30] border-[#ff3b30] text-white animate-heart":"bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)]"}`}>♥</motion.button>
              <div className="hidden lg:flex items-center gap-2 pl-2 ml-1 border-l border-[#262626]">
                <button onClick={toggleMute} className="h-8 w-8 grid place-items-center bg-[#1e1e1e] border border-[#262626] rounded-none text-white/60">{isMuted||volume===0?"🔇":"🔊"}</button>
                <input type="range" min={0} max={1} step={0.01} value={isMuted?0:volume} onChange={(e)=>setVolume(parseFloat(e.target.value))} className="range-slider w-24" />
                <span className="text-xs text-white/50 w-8 text-right">{Math.round((isMuted?0:volume)*100)}%</span>
              </div>
              <button onClick={()=>setExpanded(v=>!v)} className="grid sm:hidden h-10 w-10 place-items-center bg-[#1e1e1e] border border-[#262626] rounded-[8px] text-white/70 shrink-0">{expanded?"∧":"∨"}</button>
              <button onClick={toggleCompactMode} className="hidden sm:grid h-9 w-9 place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)] hover:text-[var(--foreground)] pressable" title="Compact mode">⛶</button>
            </div>
          </div>
        )}

        <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pb-3 sm:hidden border-t border-[var(--border)] pt-3 space-y-3 overflow-hidden">
            <div className="bg-[var(--muted)]/60 border border-[var(--border)] p-2.5 text-xs space-y-1.5">
              <div className="font-bold text-sm">Now Playing</div>
              <div className="text-[var(--muted-foreground)]">Programme: <b className="text-[var(--foreground)]">{nowTitle || "Live broadcast"}</b> — {current.tags || "—"}</div>
              <div className="text-[var(--muted-foreground)]">Location: {current.country} {current.state?`· ${current.state}`:""} • Lang: {current.language || "—"}</div>
              <div className="text-[var(--muted-foreground)]">Stream: {current.codec} {current.bitrate?`· ${current.bitrate} kbps · ~${mbPerHour} MB/h`:""} {loading ? "· buffering" : ""}</div>
              {current.homepage && <a href={current.homepage} target="_blank" rel="noreferrer" className="block bg-[var(--muted)] border border-[var(--border)] px-2 py-2 text-center font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Station website ↗</a>}
            </div>
            <div className="flex gap-2">
              <button onClick={prev} className="flex-1 bg-[var(--muted)] border border-[var(--border)] py-3 text-sm font-medium rounded-none">Prev</button>
              <button onClick={next} className="flex-1 bg-[var(--muted)] border border-[var(--border)] py-3 text-sm font-medium rounded-none">Next</button>
              <button onClick={()=>toggleFavorite(current.stationuuid)} className={`px-4 py-3 text-sm font-bold border rounded-none ${isFav?"bg-[#ff3b30] border-[#ff3b30] text-white":"bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)]"}`}>{isFav?"♥":"♡"}</button>
            </div>
            <div className="flex items-center gap-2 bg-[var(--muted)]/60 border border-[var(--border)] px-3 py-2.5">
              <span className="text-xs text-[var(--muted-foreground)] w-10">{isMuted?"Muted":Math.round(volume*100)+"%"}</span>
              <input type="range" min={0} max={1} step={0.01} value={isMuted?0:volume} onChange={(e)=>setVolume(parseFloat(e.target.value))} className="range-slider flex-1" />
              <button onClick={toggleMute} className="bg-white text-black px-3 py-1.5 text-xs font-bold rounded-none">{isMuted?"Unmute":"Mute"}</button>
            </div>
            <div className="relative">
              <button onClick={()=>setShowSleepMenu(v=>!v)} className={`w-full bg-[var(--muted)]/60 border border-[var(--border)] px-3 py-2.5 text-xs font-medium flex items-center justify-between ${sleepTimer ? "text-[#ff3b30]" : "text-[var(--muted-foreground)]"}`}>
                <span>💤 Sleep Timer</span>
                <span>{sleepMinutesLeft !== null ? `${sleepMinutesLeft}m` : sleepTimer ? "On" : "Off"}</span>
              </button>
              <AnimatePresence>
                {showSleepMenu && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--card)] border border-[var(--border)] p-2 space-y-1 z-10">
                    {[15, 30, 45, 60, 90, 120].map(min=>(
                      <button key={min} onClick={()=>{ setSleepTimer(min); setShowSleepMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[var(--muted)] rounded-none transition-colors">{min} min</button>
                    ))}
                    {sleepTimer && <button onClick={()=>{ setSleepTimer(null); setShowSleepMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-[#ff3b30] hover:bg-[var(--muted)] rounded-none transition-colors">Cancel</button>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {similarStations.length > 0 && (
              <div className="bg-[var(--muted)]/60 border border-[var(--border)] p-2.5">
                <div className="text-xs font-bold text-[var(--foreground)] mb-2">Similar Stations</div>
                <div className="space-y-1.5">
                  {similarStations.map(s => (
                    <button key={s.stationuuid} onClick={()=>play(s)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-[var(--card)] rounded-none transition-colors flex items-center gap-2">
                      <span className="text-[10px]">{flag(s.countrycode)}</span>
                      <span className="truncate flex-1">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
