"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Station, tagList } from "@/lib/radio";
import { usePlayerStore } from "@/stores/playerStore";

function flagEmoji(code: string) {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function formatLastCheck(s: string) {
  try { const d = new Date(s); return d.toLocaleDateString(); } catch { return s; }
}

export function StationCard({ station, onPlay }: { station: Station; onPlay?: () => void }) {
  const { current, isPlaying, favorites, toggleFavorite, play, dataSaver } = usePlayerStore();
  const [showInfo, setShowInfo] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const isCurrent = current?.stationuuid === station.stationuuid;
  const isFav = favorites.includes(station.stationuuid);
  const tags = tagList(station.tags);
  const hasArt = !!station.favicon && !dataSaver;
  const estimatedHour = station.bitrate ? Math.round((station.bitrate * 3600) / 8 / 1024) : null;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?station=${station.stationuuid}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col overflow-hidden liquid-card text-left ${isCurrent ? "border-[#ff3b30]/40 shadow-sm" : "border-[var(--border)]"} rounded-none hover:shadow-sm animate-fadeIn liquid-shine`}
    >
      {/* top flat bar when playing — no gradient */}
      {isCurrent && isPlaying && <div className="absolute inset-x-0 top-0 h-[2px] bg-[#ff3b30]" />}

      {/* header — flat, no gradient */}
      <div className="relative h-[96px] overflow-hidden bg-[var(--muted)]/60 border-b border-[var(--border)]">
        {hasArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={station.favicon} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-[0.9]" onError={(e)=>(e.currentTarget.style.display="none")} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[var(--card)]">
            <span className="text-3xl opacity-20">📻</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border rounded-none backdrop-blur ${station.lastcheckok ? "bg-[var(--card)]/90 text-emerald-600 border-[var(--border)]" : "bg-[var(--card)]/90 text-red-500 border-[var(--border)]"}`}>
            <span className={`h-1.5 w-1.5 ${station.lastcheckok ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} /> {station.lastcheckok ? "Live" : "Offline"}
          </span>
          <span className="bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--muted-foreground)] rounded-none">
            {station.bitrate ? `${station.bitrate} kbps` : station.codec || "Live"} {dataSaver && estimatedHour ? `· ~${estimatedHour}MB/h` : ""}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={()=>{ play(station); onPlay?.(); }}
          aria-label="Play"
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center bg-white text-black rounded-none shadow ${isCurrent && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"} hover:bg-zinc-100 pressable`}
        >
          {isCurrent && isPlaying ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M8 5.14v14l11-7z"/></svg>}
        </motion.button>

        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div className="flex items-center gap-1.5 bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] px-2.5 py-1 rounded-none">
            <span className="text-[14px] leading-none">{flagEmoji(station.countrycode)}</span>
            <span className="text-xs font-medium text-[var(--foreground)] truncate max-w-[110px]">{station.country || "Unknown"}</span>
          </div>
          {isCurrent && isPlaying && (
            <div className="flex items-end gap-[2px] bg-[var(--card)]/90 backdrop-blur border border-[var(--border)] px-2 py-1 rounded-none h-6">
              <span className="w-[2px] bg-[#ff3b30] animate-[equalize_0.7s_ease-in-out_infinite]" style={{height:"10px"}}/>
              <span className="w-[2px] bg-[#ff3b30] animate-[equalize_0.7s_ease-in-out_infinite]" style={{height:"6px", animationDelay:"0.15s"}}/>
              <span className="w-[2px] bg-[#ff3b30] animate-[equalize_0.7s_ease-in-out_infinite]" style={{height:"12px", animationDelay:"0.3s"}}/>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 gap-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-bold leading-tight">{station.name}</h3>
          <p className="truncate text-xs text-white/50 mt-0.5">{station.state ? `${station.state} • ` : ""}{station.language || tags[0] || "Music"}</p>
        </div>

        <div className="flex flex-wrap gap-1 min-h-[20px]">
          {tags.length ? tags.map(t=>(
            <span key={t} className="bg-[var(--muted)] border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] rounded-none capitalize">{t}</span>
          )) : <span className="bg-[var(--muted)] border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] rounded-none">general</span>}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <motion.button whileTap={{ scale: 0.97 }} onClick={()=>{ play(station); onPlay?.(); }} className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold border rounded-none pressable ${isCurrent && isPlaying ? "bg-[#ff3b30] border-[#ff3b30] text-white" : "bg-white border-white text-black hover:bg-zinc-100"}`}>
            {isCurrent && isPlaying ? <><span className="h-2 w-2 bg-white animate-pulse"/> Listening</> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7z"/></svg> Play</>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.88 }} aria-label="favorite" onClick={()=>toggleFavorite(station.stationuuid)} className={`h-9 w-9 grid place-items-center border rounded-none pressable ${isFav ? "bg-[#ff3b30] border-[#ff3b30] text-white animate-heart" : "bg-[#1e1e1e] border-[#262626] text-white/60 hover:text-white"}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-6.5-4.2-9-8.6A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 8.9 7.4C18.5 16.8 12 21 12 21z"/></svg>
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} aria-label="share" onClick={handleShare} className="h-9 w-9 grid place-items-center border rounded-none pressable bg-[#1e1e1e] border-[#262626] text-white/60 hover:text-white">
            {shareCopied ? <span className="text-[10px] font-bold text-[#4ade80]">✓</span> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} aria-label="info" onClick={()=>setShowInfo(v=>!v)} className={`h-9 w-9 grid place-items-center border rounded-none text-xs font-bold pressable ${showInfo ? "bg-white text-black border-white" : "bg-[#1e1e1e] border-[#262626] text-white/60 hover:text-white"}`}>i</motion.button>
        </div>

        <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="bg-[#0f0f0f] border border-[#262626] rounded-none p-2.5 text-xs space-y-2 overflow-hidden">
            <div className="font-bold text-white/90">Programme & Station Info</div>
            <div className="grid grid-cols-2 gap-2 text-white/60">
              <div><span className="text-white/30">Country</span><br/>{station.country} {station.state ? `· ${station.state}` : ""} ({station.countrycode})</div>
              <div><span className="text-white/30">Language</span><br/>{station.language || "—"} {station.languagecodes ? `· ${station.languagecodes}` : ""}</div>
              <div><span className="text-white/30">Codec / Bitrate</span><br/>{station.codec || "MP3"} · {station.bitrate || "—"} kbps {estimatedHour ? `· ~${estimatedHour} MB/h` : ""}</div>
              <div><span className="text-white/30">Stream</span><br/>{station.hls ? "HLS" : "ICE/SHOUTcast"} · {station.ssl_error ? "SSL issue" : "OK"}</div>
              <div><span className="text-white/30">Listeners</span><br/>{Intl.NumberFormat().format(station.clickcount)} plays · {station.clicktrend >=0 ? "+"+station.clicktrend : station.clicktrend} trend</div>
              <div><span className="text-white/30">Votes / Checked</span><br/>♥ {station.votes} · {formatLastCheck(station.lastchecktime)}</div>
            </div>
            {station.tags && <div className="text-white/50"><span className="text-white/30">Tags</span> {station.tags}</div>}
            {station.homepage && <a href={station.homepage} target="_blank" rel="noreferrer" className="block bg-[#1e1e1e] border border-[#262626] rounded-none px-2 py-1.5 text-center font-semibold text-white/80 hover:text-white pressable">Visit website ↗</a>}
            <div className="bg-[#1e1e1e] border border-[#262626] px-2 py-1.5 text-white/50">
              Live status varies by station. For exact now-playing title, check the station website — many Icecast streams expose it there. Data Saver prefers ≤96 kbps.
            </div>
            {station.geo_lat && <div className="text-white/40">📍 {station.geo_lat.toFixed(2)}, {station.geo_long?.toFixed(2)}</div>}
          </motion.div>
        )}
        </AnimatePresence>

        <div className="flex items-center justify-between text-[11px] text-white/40 border-t border-[#262626] pt-2">
          <span>{Intl.NumberFormat().format(station.clickcount)} plays · ♥ {station.votes}</span>
          <span className="truncate max-w-[80px]">{station.languagecodes || station.countrycode}</span>
        </div>
      </div>
    </motion.div>
  );
}
