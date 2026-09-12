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
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

const PlayIcon = ({ playing }: { playing?: boolean }) =>
  playing ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5" aria-hidden="true"><path d="M8 5.14v14l11-7z" /></svg>
  );

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M12 21s-6.5-4.2-9-8.6A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 8.9 7.4C18.5 16.8 12 21 12 21z" />
  </svg>
);

export function StationCard({
  station,
  onPlay,
  layout = "grid",
}: {
  station: Station;
  onPlay?: () => void;
  layout?: "grid" | "list";
}) {
  const { current, isPlaying, favorites, toggleFavorite, play, dataSaver } = usePlayerStore();
  const [showInfo, setShowInfo] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "done">("idle");
  const isCurrent = current?.stationuuid === station.stationuuid;
  const isFav = favorites.includes(station.stationuuid);
  const tags = tagList(station.tags);
  const hasArt = !!station.favicon && !dataSaver;
  const estimatedHour = station.bitrate ? Math.round((station.bitrate * 3600) / 8 / 1024) : null;

  const doPlay = () => {
    play(station);
    onPlay?.();
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?station=${station.stationuuid}`;
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string; url: string }) => Promise<void> };
    try {
      if (nav.share) {
        await nav.share({ title: station.name, text: `Listen to ${station.name} on Radiobeast`, url: shareUrl });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("done");
        setTimeout(() => setShareState("idle"), 2000);
      }
    } catch { /* user cancelled — silent */ }
  };

  if (layout === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`group flex items-center gap-3 rounded-2xl border p-2.5 pr-3 transition-colors ${
          isCurrent ? "border-[var(--accent)]/50 bg-[var(--card)]" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]"
        }`}
      >
        <button onClick={doPlay} aria-label={isCurrent && isPlaying ? `Pause ${station.name}` : `Play ${station.name}`} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)] grid place-items-center pressable">
          {hasArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={station.favicon} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          ) : (
            <span className="text-xl" aria-hidden="true">{flagEmoji(station.countrycode)}</span>
          )}
          <span className={`absolute inset-0 grid place-items-center transition-opacity ${isCurrent && isPlaying ? "bg-black/45 opacity-100" : "bg-black/45 opacity-0 group-hover:opacity-100"}`}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-black"><PlayIcon playing={isCurrent && isPlaying} /></span>
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold tracking-tight">{station.name}</h3>
            {isCurrent && isPlaying && (
              <span className="flex items-end gap-[2px] h-3 shrink-0" aria-label="Now playing">
                <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "10px" }} />
                <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "6px", animationDelay: "0.15s" }} />
                <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "12px", animationDelay: "0.3s" }} />
              </span>
            )}
          </div>
          <p className="truncate text-xs text-[var(--muted-foreground)] mt-0.5">
            {station.country || "Unknown"} • {station.language || tags[0] || "Music"} • {station.bitrate ? `${station.bitrate}k` : station.codec || "Live"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => toggleFavorite(station.stationuuid)} aria-label={isFav ? "Remove from favourites" : "Add to favourites"} aria-pressed={isFav} className={`h-9 w-9 grid place-items-center rounded-xl border pressable ${isFav ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
            <HeartIcon filled={isFav} />
          </button>
          <button onClick={doPlay} className={`h-9 px-4 rounded-xl text-[13px] font-semibold pressable ${isCurrent && isPlaying ? "bg-[var(--accent)] text-white" : "bg-[var(--foreground)] text-[var(--background)]"}`}>
            {isCurrent && isPlaying ? "Listening" : "Play"}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-colors ${
        isCurrent ? "border-[var(--accent)]/50 bg-[var(--card)]" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]"
      }`}
    >
      {/* art header */}
      <div className="relative h-28 shrink-0 overflow-hidden bg-[var(--muted)]">
        {hasArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={station.favicon} alt="" loading="lazy" className="card-art absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[var(--muted)] to-[var(--card)]">
            <span className="text-4xl opacity-25" aria-hidden="true">📻</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md border ${station.lastcheckok ? "bg-black/55 text-emerald-300 border-white/10" : "bg-black/55 text-red-300 border-white/10"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${station.lastcheckok ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            {station.lastcheckok ? "Live" : "Offline"}
          </span>
          <span className="rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/85">
            {station.bitrate ? `${station.bitrate} kbps` : station.codec || "Live"}
          </span>
        </div>

        <button
          onClick={doPlay}
          aria-label={isCurrent && isPlaying ? `Pause ${station.name}` : `Play ${station.name}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all hover:scale-105 pressable"
        >
          <PlayIcon playing={isCurrent && isPlaying} />
        </button>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-2.5 py-1 min-w-0">
            <span className="text-sm leading-none" aria-hidden="true">{flagEmoji(station.countrycode)}</span>
            <span className="text-xs font-medium text-white truncate max-w-[130px]">{station.country || "Unknown"}</span>
          </div>
          {isCurrent && isPlaying && (
            <div className="flex items-end gap-[2px] rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-2.5 py-2 h-7" aria-label="Now playing">
              <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "10px" }} />
              <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "6px", animationDelay: "0.15s" }} />
              <span className="w-[2px] rounded-full bg-[var(--accent)] animate-[equalize_0.7s_ease-in-out_infinite]" style={{ height: "12px", animationDelay: "0.3s" }} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5 gap-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-tight tracking-tight" title={station.name}>{station.name}</h3>
          <p className="truncate text-xs text-[var(--muted-foreground)] mt-1">{station.country} • {station.language || tags[0] || "Music"}</p>
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
          {tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-md border border-[var(--border)] bg-[var(--muted)]/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)] uppercase">{t}</span>
          ))}
          {tags.length === 0 && <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">GENERAL</span>}
        </div>

        <div className="flex items-center gap-2 mt-auto pt-1">
          <button onClick={doPlay} className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl pressable ${isCurrent && isPlaying ? "bg-[var(--accent)] text-white" : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"}`}>
            {isCurrent && isPlaying ? (
              <><span className="h-2 w-2 rounded-full bg-white animate-pulse" /> Listening</>
            ) : (
              <><PlayIcon /> Play</>
            )}
          </button>
          <button aria-label={isFav ? "Remove from favourites" : "Add to favourites"} aria-pressed={isFav} onClick={() => toggleFavorite(station.stationuuid)} className={`h-10 w-10 grid place-items-center rounded-xl border pressable ${isFav ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
            <span className={isFav ? "animate-heart inline-flex" : "inline-flex"}><HeartIcon filled={isFav} /></span>
          </button>
          <button aria-label="Share station" onClick={handleShare} title="Share" className="h-10 w-10 grid place-items-center rounded-xl border bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] pressable">
            {shareState === "done" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
            )}
          </button>
          <button aria-label={showInfo ? "Hide details" : "Show details"} aria-expanded={showInfo} onClick={() => setShowInfo((v) => !v)} className={`h-10 w-10 grid place-items-center rounded-xl border text-xs font-bold pressable ${showInfo ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" : "bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>i</button>
        </div>

        <AnimatePresence initial={false}>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-3 text-xs space-y-2.5"
            >
              <div className="grid grid-cols-2 gap-2.5 text-[var(--muted-foreground)]">
                <div><span className="opacity-60">Country</span><br /><span className="text-[var(--foreground)] font-medium">{station.country} {station.state ? `· ${station.state}` : ""}</span></div>
                <div><span className="opacity-60">Language</span><br /><span className="text-[var(--foreground)] font-medium">{station.language || "—"}</span></div>
                <div><span className="opacity-60">Codec</span><br /><span className="text-[var(--foreground)] font-medium">{station.codec || "MP3"} · {station.bitrate || "—"} kbps{estimatedHour ? ` · ~${estimatedHour} MB/h` : ""}</span></div>
                <div><span className="opacity-60">Reputation</span><br /><span className="text-[var(--foreground)] font-medium">{Intl.NumberFormat().format(station.clickcount)} plays · ♥ {station.votes}</span></div>
              </div>
              {station.tags && <div className="text-[var(--muted-foreground)] leading-relaxed"><span className="opacity-60">Tags — </span>{station.tags}</div>}
              <div className="text-[var(--muted-foreground)]">Checked {formatLastCheck(station.lastchecktime)}</div>
              {station.homepage && <a href={station.homepage} target="_blank" rel="noreferrer" className="block rounded-lg bg-[var(--muted)] border border-[var(--border)] px-2 py-2 text-center font-semibold hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors">Visit website ↗</a>}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)] border-t border-[var(--border)] pt-2.5">
          <span>{Intl.NumberFormat().format(station.clickcount)} plays • ♥ {station.votes}</span>
          <span className="truncate max-w-[90px]">{station.languagecodes || station.countrycode}</span>
        </div>
      </div>
    </motion.article>
  );
}
