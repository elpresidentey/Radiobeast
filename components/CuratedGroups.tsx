"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Station, getStations, FetchOpts } from "@/lib/radio";
import { usePlayerStore } from "@/stores/playerStore";

type CuratedGroup = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  fetch: (opts: FetchOpts) => Promise<Station[]>;
};

const GROUPS: CuratedGroup[] = [
  {
    id: "afrobeat",
    label: "Afrobeats & Afro-Fusion",
    emoji: "🥁",
    color: "#f59e0b",
    fetch: async (opts) => {
      const [ng, gh] = await Promise.all([
        getStations({ countrycode: "NG", limit: 8, order: "clickcount", reverse: true, tag: "afrobeats" }, opts),
        getStations({ countrycode: "GH", limit: 4, order: "clickcount", reverse: true, tag: "afrobeats" }, opts),
      ]);
      const seen = new Set<string>();
      return [...ng, ...gh].filter((s) => { if (seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true; }).slice(0, 8);
    },
  },
  {
    id: "classical",
    label: "Classical",
    emoji: "🎻",
    color: "#8b5cf6",
    fetch: (opts) => getStations({ tag: "classical", limit: 8, order: "clickcount", reverse: true }, opts),
  },
  {
    id: "jazz",
    label: "Jazz & Blues",
    emoji: "🎷",
    color: "#3b82f6",
    fetch: (opts) => getStations({ tag: "jazz", limit: 8, order: "clickcount", reverse: true }, opts),
  },
  {
    id: "electronic",
    label: "Electronic & Dance",
    emoji: "🎛",
    color: "#06b6d4",
    fetch: (opts) => getStations({ tag: "electronic", limit: 8, order: "clickcount", reverse: true }, opts),
  },
  {
    id: "hiphop",
    label: "Hip-Hop & R&B",
    emoji: "🎤",
    color: "#ef4444",
    fetch: async (opts) => {
      const [hh, rb] = await Promise.all([
        getStations({ tag: "hip hop", limit: 6, order: "clickcount", reverse: true }, opts),
        getStations({ tag: "r&b", limit: 3, order: "clickcount", reverse: true }, opts),
      ]);
      const seen = new Set<string>();
      return [...hh, ...rb].filter((s) => { if (seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true; }).slice(0, 8);
    },
  },
  {
    id: "news",
    label: "News & Talk",
    emoji: "📰",
    color: "#10b981",
    fetch: (opts) => getStations({ tag: "news", limit: 8, order: "clickcount", reverse: true }, opts),
  },
];

function flag(code: string) {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function GroupCard({ station, onPlay }: { station: Station; onPlay: () => void }) {
  const { current, isPlaying } = usePlayerStore();
  const isCurrent = current?.stationuuid === station.stationuuid && isPlaying;

  return (
    <button
      onClick={onPlay}
      className={`card-lift flex items-center gap-3 rounded-2xl border p-3 text-left shrink-0 w-[230px] sm:w-[270px] pressable ${
        isCurrent
          ? "border-[var(--accent)]/45 bg-[var(--accent)]/5 shadow-md shadow-[var(--accent)]/10 glow-accent"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]"
      }`}
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--muted)] border border-[var(--border)]">
        {station.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={station.favicon} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <div className="h-full w-full grid place-items-center text-sm">{flag(station.countrycode)}</div>
        )}
        {isCurrent && <div className="absolute inset-0 grid place-items-center bg-black/45"><span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold leading-tight text-[var(--foreground)]">{station.name}</div>
        <div className="truncate text-[11px] text-[var(--muted-foreground)] mt-0.5">{station.country} · {station.bitrate ? `${station.bitrate} kbps` : station.codec}</div>
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
    const opts = { preferSelfHost };
    async function load() {
      const results = await Promise.allSettled(GROUPS.map((g) => g.fetch(opts)));
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
    <section className="space-y-7" aria-label="Curated genre groups">
      {GROUPS.filter((g) => groups.get(g.id)?.length).map((group) => {
        const stations = groups.get(group.id) || [];
        return (
          <div key={group.id}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-lg grid place-items-center text-sm" style={{ backgroundColor: `${group.color}15`, border: `1px solid ${group.color}25` }}>{group.emoji}</div>
              <h2 className="text-[14px] font-bold tracking-tight text-[var(--foreground)]">{group.label}</h2>
              <span className="text-[10px] font-bold text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-md">{stations.length} live</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-2">
              {stations.map((s) => (
                <motion.div
                  key={s.stationuuid}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-shrink-0"
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
