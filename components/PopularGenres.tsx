"use client";
import { useState } from "react";
import { motion } from "framer-motion";

type Genre = { tag: string; label: string; emoji: string; color: string };

// Curated popular genres — `tag` maps to a radio-browser tag search.
const GENRES: Genre[] = [
  { tag: "pop", label: "Pop", emoji: "🎤", color: "#ec4899" },
  { tag: "rock", label: "Rock", emoji: "🎸", color: "#ef4444" },
  { tag: "hip hop", label: "Hip-Hop", emoji: "🎧", color: "#8b5cf6" },
  { tag: "r&b", label: "R&B / Soul", emoji: "🎙", color: "#a855f7" },
  { tag: "electronic", label: "Electronic", emoji: "🎛", color: "#06b6d4" },
  { tag: "dance", label: "Dance", emoji: "💃", color: "#22d3ee" },
  { tag: "jazz", label: "Jazz", emoji: "🎷", color: "#3b82f6" },
  { tag: "classical", label: "Classical", emoji: "🎻", color: "#6366f1" },
  { tag: "afrobeats", label: "Afrobeats", emoji: "🥁", color: "#f59e0b" },
  { tag: "reggae", label: "Reggae", emoji: "🟢", color: "#22c55e" },
  { tag: "country", label: "Country", emoji: "🤠", color: "#eab308" },
  { tag: "latin", label: "Latin", emoji: "🪇", color: "#f43f5e" },
  { tag: "metal", label: "Metal", emoji: "🤘", color: "#94a3b8" },
  { tag: "oldies", label: "Oldies", emoji: "📻", color: "#fb7185" },
  { tag: "ambient", label: "Ambient", emoji: "🌙", color: "#818cf8" },
  { tag: "gospel", label: "Gospel", emoji: "🙏", color: "#fbbf24" },
  { tag: "news", label: "News", emoji: "📰", color: "#10b981" },
  { tag: "chillout", label: "Chillout", emoji: "🛋", color: "#2dd4bf" },
];

const COLLAPSED = 12;

export function PopularGenres({
  activeTag,
  onSelect,
}: {
  activeTag: string;
  onSelect: (tag: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? GENRES : GENRES.slice(0, COLLAPSED);

  return (
    <section aria-label="Popular genres" className="scroll-mt-[120px] sm:scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[15px] sm:text-base font-bold tracking-tight text-[var(--foreground)]">Popular genres</h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Pick a sound — we&apos;ll tune the stations to it.</p>
        </div>
        {GENRES.length > COLLAPSED && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors pressable"
          >
            {showAll ? "Show less −" : `See all ${GENRES.length} →`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {visible.map((g, i) => {
          const active = activeTag === g.tag;
          return (
            <motion.button
              key={g.tag}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.025, 0.3), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onSelect(active ? "" : g.tag)}
              aria-pressed={active}
              className={`group relative flex items-center gap-2.5 overflow-hidden rounded-2xl border p-3 text-left pressable card-lift ${
                active ? "border-transparent" : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hover)]"
              }`}
              style={
                active
                  ? { backgroundColor: `${g.color}1a`, borderColor: `${g.color}66`, boxShadow: `0 6px 20px ${g.color}22` }
                  : undefined
              }
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: `${g.color}1f`, border: `1px solid ${g.color}33` }}
                aria-hidden="true"
              >
                {g.emoji}
              </span>
              <span
                className="truncate text-[13px] font-bold leading-tight"
                style={{ color: active ? g.color : "var(--foreground)" }}
              >
                {g.label}
              </span>
              {active && (
                <span
                  className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: g.color }}
                  aria-hidden="true"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
