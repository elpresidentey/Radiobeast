"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SHORTCUTS = [
  { keys: "Space", label: "Play / Pause" },
  { keys: "←", label: "Previous station" },
  { keys: "→", label: "Next station" },
  { keys: "/", label: "Focus search" },
  { keys: "?", label: "Show shortcuts" },
  { keys: "Esc", label: "Close modal / panel" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-[81] -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[360px] rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl p-5"
            role="dialog"
            aria-label="Keyboard shortcuts"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">Keyboard Shortcuts</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="h-7 w-7 grid place-items-center rounded-full bg-[var(--muted)] border border-[var(--border)] text-sm leading-none pressable">×</button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[var(--muted-foreground)]">{s.label}</span>
                  <kbd className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold font-mono min-w-[32px] text-center">{s.keys}</kbd>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-4 text-center">Press <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-mono">?</kbd> anytime to toggle this.</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
