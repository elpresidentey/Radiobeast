"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { GENRES } from "@/lib/genres";

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
