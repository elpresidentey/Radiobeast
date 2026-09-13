"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Station, getStations } from "@/lib/radio";
import { usePlayerStore } from "@/stores/playerStore";

type CuratedGroup = {
  id: string;
  label: string;
  tag: string;
  emoji: string;
  color: string;
};

const GROUPS: CuratedGroup[] = [
  { id: "afrobeat", label: "Afrobeat Live", tag: "afrobeat", emoji: "🥁", color: "#f59e0b" },
  { id: "classical", label: "Classical", tag: "classical", emoji: "🎻", color: "#8b5cf6" },
  { id: "jazz", label: "Jazz & Blues", tag: "jazz", emoji: "🎷", color: "#3b82f6" },
  { id: "electronic", label: "Electronic", tag: "electronic", emoji: "🎛", color: "#06b6d4" },
  { id: "hiphop", label: "Hip-Hop", tag: "hip hop", emoji: "🎤", color: "#ef4444" },
  { id: "news", label: "News Radio", tag: "news", emoji: "📰", color: "#10b981" },
];

function flag(code: string) {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function GroupCard({ station, onPlay }: { station: Station; onPlay: () => void }) {
  const { current, isPlaying } = usePlayerStore();
  const isCurrent = current?.stationuuid === station.stationuuid && isPlaying;

  return (
    <button
      onClick={onPlay}
      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors shrink-0 w-[220px] sm:w-[260px] pressable ${
        isCurrent ? "border-[var(--accent)]/50 bg-[var(--accent)]/5" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]"
      }`}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)] border border-[var(--border)]">
        {station.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={station.favicon} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <div className="h-full w-full grid place-items-center text-sm">{flag(station.countrycode)}</div>
        )}
        {isCurrent && <div className="absolute inset-0 grid place-items-center bg-black/45"><span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold leading-tight">{station.name}</div>
        <div className="truncate text-[10px] text-[var(--muted-foreground)]">{station.country} • {station.bitrate ? `${station.bitrate}k` : station.codec}</div>
      </div>
    </button>
  );
}

export function CuratedGroups() {
  const { play, preferSelfHost, icecastFallback, setQueue } = usePlayerStore();
  const [groups, setGroups] = useState<Map<string, Station[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.allSettled(
        GROUPS.map((g) =>
          getStations({ tag: g.tag, limit: 6, order: "clickcount", reverse: true, hidebroken: true }, { preferSelfHost })
        )
      );
      if (cancelled) return;
      const map = new Map<string, Station[]>();
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value.length > 0) map.set(GROUPS[i].id, r.value);
      });
      setGroups(map);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [preferSelfHost, icecastFallback]);

  if (loading || groups.size === 0) return null;

  return (
    <section className="space-y-6" aria-label="Curated genre groups">
      {GROUPS.filter((g) => groups.get(g.id)?.length).map((group, gi) => {
        const stations = groups.get(group.id) || [];
        return (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base" aria-hidden="true">{group.emoji}</span>
              <h2 className="text-sm font-bold tracking-tight">{group.label}</h2>
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] bg-[var(--muted)] border border-[var(--border)] px-2 py-0.5 rounded-md">{stations.length} live</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-2">
              {stations.map((s, i) => (
                <motion.div
                  key={s.stationuuid}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: gi * 0.05 + i * 0.03 }}
                >
                  <GroupCard station={s} onPlay={() => { setQueue(stations); play(s); }} />
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
