"use client";
import { usePlayerStore } from "@/stores/playerStore";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

function flag(code: string){
  if(!code||code.length!==2) return "🌍";
  return code.toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt(0)));
}

export function GlobalPlayer() {
  const { current, isPlaying, toggle, volume, setVolume, isMuted, toggleMute, favorites, toggleFavorite, next, prev, queue, dataSaver } = usePlayerStore();
  const { error, loading, clearError } = useAudioPlayer();
  const [expanded, setExpanded] = useState(false);
  const [nowTitle, setNowTitle] = useState<string | null>(null);

  useEffect(()=>{
    if(!current || !isPlaying) { setNowTitle(null); return; }
    const hint = current.tags?.split(",")[0] || current.language || "Live broadcast";
    setNowTitle(hint);
  },[current, isPlaying]);

  if (!current) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 liquid-strong safe-bottom">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-3 flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] text-center">
          <span className="h-1.5 w-1.5 bg-[var(--border-hover)] animate-pulse hidden sm:inline"/> <span className="truncate">Pick a station — 45k+ worldwide</span><span className="hidden sm:inline">• Data Saver {dataSaver ? "ON" : "OFF"}</span>
        </div>
      </div>
    );
  }
  const isFav = favorites.includes(current.stationuuid);
  const mbPerHour = current.bitrate ? Math.round((current.bitrate*3600)/8/1024) : null;

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed inset-x-0 bottom-0 z-50 liquid-strong safe-bottom">
      {error && (
        <div className="flex items-center justify-between gap-2 bg-[var(--muted)] border-b border-[var(--border)] px-3 py-2 text-sm text-[#ff3b30]">
          <span className="truncate text-xs sm:text-sm">{error}</span>
          <button onClick={clearError} className="bg-[#ff3b30] text-white px-3 py-1 text-xs font-bold rounded-none shrink-0">Dismiss</button>
        </div>
      )}
      <div className="h-[2px] w-full bg-[var(--border)] overflow-hidden"><div className={`h-full bg-[#ff3b30] ${isPlaying ? "w-full animate-[shimmer_1.2s_infinite]" : "w-[35%] opacity-60"}`} style={{ backgroundSize: "200% 100%", backgroundImage: isPlaying ? "linear-gradient(90deg, #ff3b30, #ff6b30, #ff3b30)" : undefined }} /></div>

      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3">
          <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden bg-[var(--muted)] border border-[var(--border)]">
            {current.favicon && !dataSaver ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.favicon} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e)=>(e.currentTarget.style.display="none")} />
            ) : (
              <div className="h-full w-full grid place-items-center bg-[var(--muted)] text-base sm:text-lg">{flag(current.countrycode)}</div>
            )}
            {isPlaying && <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 bg-emerald-500 border-2 border-[var(--card)]" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold leading-tight flex items-center gap-1.5">
              <span className="truncate">{current.name}</span>
              {loading && <span className="shrink-0 bg-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-bold hidden sm:inline">BUFFERING</span>}
            </div>
            <div className="truncate text-[11px] sm:text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
              <span className="truncate">{flag(current.countrycode)} {current.country}</span>
              <span className="h-1 w-1 bg-[var(--border-hover)] shrink-0"/> <span className="truncate hidden sm:inline">{nowTitle || current.language || "Live"} • {current.bitrate ? `${current.bitrate} kbps` : current.codec} {mbPerHour ? `· ~${mbPerHour}MB/h` : ""}</span><span className="truncate sm:hidden">{current.bitrate ? `${current.bitrate}k` : current.codec}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <motion.button whileTap={{ scale: 0.92 }} onClick={prev} disabled={!queue.length} className="hidden sm:grid h-9 w-9 place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)] disabled:opacity-30 pressable">‹‹</motion.button>
            <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.04 }} onClick={toggle} className="grid h-10 w-10 sm:h-10 sm:w-10 place-items-center bg-white text-black rounded-none font-black shrink-0 pressable shadow-sm" aria-label={isPlaying?"pause":"play"}>{isPlaying ? "॥" : "▶"}</motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={next} disabled={!queue.length} className="hidden sm:grid h-9 w-9 place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)] disabled:opacity-30 pressable">››</motion.button>
            <motion.button whileTap={{ scale: 0.85 }} onClick={()=>toggleFavorite(current.stationuuid)} className={`hidden sm:grid h-9 w-9 place-items-center border rounded-none shrink-0 pressable ${isFav?"bg-[#ff3b30] border-[#ff3b30] text-white animate-heart":"bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)]"}`}>♥</motion.button>
            <div className="hidden lg:flex items-center gap-2 pl-2 ml-1 border-l border-[var(--border)]">
              <button onClick={toggleMute} className="h-8 w-8 grid place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)]">{isMuted||volume===0?"🔇":"🔊"}</button>
              <input type="range" min={0} max={1} step={0.01} value={isMuted?0:volume} onChange={(e)=>setVolume(parseFloat(e.target.value))} className="range-slider w-24" />
              <span className="text-xs text-[var(--muted-foreground)] w-8 text-right">{Math.round((isMuted?0:volume)*100)}%</span>
            </div>
            <button onClick={()=>setExpanded(v=>!v)} className="grid sm:hidden h-10 w-10 place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)] shrink-0">{expanded?"∧":"∨"}</button>
          </div>
        </div>

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
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
