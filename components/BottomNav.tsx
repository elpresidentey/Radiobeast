"use client";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePlayerStore } from "@/stores/playerStore";

export type NavTab = "trending" | "top" | "favorites" | "recent";

const ICON: Record<NavTab | "settings", ReactNode> = {
  trending: (
    <>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M14 8h6v6" />
    </>
  ),
  top: (
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.9z" />
  ),
  favorites: (
    <path d="M12 21s-6.5-4.2-9-8.6A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 8.9 7.4C18.5 16.8 12 21 12 21z" />
  ),
  recent: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
};

const ITEMS: { key: NavTab | "settings"; label: string }[] = [
  { key: "trending", label: "Trending" },
  { key: "top", label: "Top" },
  { key: "favorites", label: "Saved" },
  { key: "recent", label: "Recent" },
  { key: "settings", label: "Settings" },
];

export function BottomNav({ tab, onSelect }: { tab: NavTab; onSelect: (tab: NavTab) => void }) {
  const favorites = usePlayerStore((s) => s.favorites);
  const recent = usePlayerStore((s) => s.recent);
  const setSettingsOpen = usePlayerStore((s) => s.setSettingsOpen);

  const badgeFor = (key: NavTab | "settings") =>
    key === "favorites" ? favorites.length : key === "recent" ? recent.length : 0;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 md:hidden liquid-strong safe-bottom shadow-[0_-10px_30px_-18px_rgba(0,0,0,0.6)]"
    >
      <div className="mx-auto max-w-6xl px-2">
        <div className="grid h-16 grid-cols-5">
          {ITEMS.map(({ key, label }) => {
            const active = key !== "settings" && tab === key;
            const badge = badgeFor(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => (key === "settings" ? setSettingsOpen(true) : onSelect(key))}
                aria-current={active ? "page" : undefined}
                aria-haspopup={key === "settings" ? "dialog" : undefined}
                aria-label={badge ? `${label}, ${badge} ${badge === 1 ? "station" : "stations"}` : label}
                className="relative flex flex-col items-center justify-center gap-1 pressable"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-x-2.5 top-1.5 bottom-1.5 rounded-2xl bg-[var(--muted)] border border-[var(--border)]"
                  />
                )}
                <span className={`relative grid place-items-center ${active ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICON[key]}
                  </svg>
                  {badge > 0 && (
                    <span className="absolute -right-3 -top-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold grid place-items-center tabular-nums">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                <span className={`relative text-[10px] font-bold tracking-wide ${active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
