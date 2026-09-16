"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/stores/playerStore";
import { useTheme } from "@/components/ThemeProvider";
import { getCacheSizeMB } from "@/lib/offlineCache";

const SLEEP_OPTIONS = [5, 15, 30, 60, 90];

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    dataSaver, toggleDataSaver, preferSelfHost, togglePreferSelfHost,
    icecastFallback, toggleIcecastFallback, powerOff,
    sleepTimer, setSleepTimer, clearFavorites, clearRecent, favorites, recent,
    savedStations, clearSavedStations,
  } = usePlayerStore();
  const { theme, toggle } = useTheme();
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [exported, setExported] = useState(false);
  const [cacheMB, setCacheMB] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const w = window as unknown as { deferredPrompt?: unknown };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drawer-open hydration from PWA/install state
    setCanInstall(!!w.deferredPrompt);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as unknown as { standalone?: boolean }).standalone));
    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => setCanInstall(false);
    window.addEventListener("pwa:installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    getCacheSizeMB().then(setCacheMB);
    return () => {
      window.removeEventListener("pwa:installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [open ]);

  // esc to close + focus trap lite
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleInstall = async () => {
    const w = window as unknown as { deferredPrompt?: { prompt: () => Promise<void>; userChoice: Promise<unknown> } };
    if (w.deferredPrompt) {
      await w.deferredPrompt.prompt();
      await w.deferredPrompt.userChoice;
    } else {
      alert("On iPhone: tap Share → Add to Home Screen\nOn Android/Chrome: Menu → Install app");
    }
  };

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ favorites, exportedAt: new Date().toISOString() }, null, 2));
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch { /* clipboard denied */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] bg-[var(--overlay)] backdrop-blur-sm" />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 z-[71] h-full w-[92%] max-w-[380px] bg-[var(--card)] border-l border-[var(--border)] flex flex-col rounded-l-3xl overflow-hidden"
            role="dialog"
            aria-label="Settings"
          >
            <div className="min-h-[60px] flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
              <span className="text-sm font-bold tracking-tight">Settings</span>
              <button onClick={onClose} aria-label="Close settings" className="h-8 w-8 grid place-items-center rounded-full bg-[var(--muted)] border border-[var(--border)] text-lg leading-none hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] transition-colors pressable">×</button>
            </div>

            <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-6">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-3.5">
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2.5">APP</div>
                {isStandalone ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Installed — running as app</div>
                ) : canInstall ? (
                  <button onClick={handleInstall} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-white py-3 text-sm font-bold hover:bg-[var(--accent-hover)] pressable">
                    Install Radiobeast App
                  </button>
                ) : (
                  <div className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    <span className="font-semibold text-[var(--foreground)]">Chrome/Edge:</span> Menu → Install app<br />
                    <span className="font-semibold text-[var(--foreground)]">iPhone:</span> Share → Add to Home Screen
                  </div>
                )}
              </section>

              <section>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">APPEARANCE</div>
                <button onClick={toggle} className="w-full flex items-center justify-between rounded-2xl bg-[var(--muted)] border border-[var(--border)] px-3 py-3 hover:border-[var(--border-hover)] transition-colors pressable">
                  <span className="flex items-center gap-2.5 text-sm font-medium">
                    <span className="h-8 w-8 grid place-items-center rounded-xl bg-[var(--card)] border border-[var(--border)]">{theme === "dark" ? "☀" : "☾"}</span>
                    {theme === "dark" ? "Dark mode" : "Light mode"}
                  </span>
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Switch → {theme === "dark" ? "Light" : "Dark"}</span>
                </button>
              </section>

              <section>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">SLEEP TIMER</div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {SLEEP_OPTIONS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSleepTimer(sleepTimer ? null : m)}
                        aria-pressed={!!sleepTimer}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold pressable ${sleepTimer ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]" : "bg-[var(--card)] border-[var(--border)]"}`}
                      >
                        {m}m
                      </button>
                    ))}
                    {sleepTimer && (
                      <button onClick={() => setSleepTimer(null)} className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 px-3 py-1.5 text-xs font-bold">Cancel</button>
                    )}
                  </div>
                  {/* eslint-disable-next-line react-hooks/purity -- wall-clock countdown label, refreshes on open/timer change */}
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-2">{sleepTimer ? `On — stops in ~${Math.max(1, Math.round((sleepTimer - Date.now()) / 60000))} min` : "Off — playback runs until you stop it."}</p>
                </div>
              </section>

              <section>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">STREAMING</div>
                <div className="space-y-2">
                  <button onClick={togglePreferSelfHost} aria-pressed={preferSelfHost} className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl border text-left pressable ${preferSelfHost ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--muted)] border-[var(--border)] hover:border-[var(--border-hover)]"}`}>
                    <span className="text-sm font-medium">Self-hosted mirror<br /><span className="text-[11px] font-normal opacity-80">{process.env.NEXT_PUBLIC_RADIO_SELF_HOST || "Not set"}</span></span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border shrink-0 ${preferSelfHost ? "bg-white text-[var(--accent)] border-white" : "bg-[var(--card)] border-[var(--border)]"}`}>{preferSelfHost ? "ON" : "OFF"}</span>
                  </button>
                  <button onClick={toggleIcecastFallback} aria-pressed={icecastFallback} className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl border text-left pressable ${icecastFallback ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--muted)] border-[var(--border)] hover:border-[var(--border-hover)]"}`}>
                    <span className="text-sm font-medium">Icecast fallback<br /><span className="text-[11px] font-normal opacity-80">Enrich sparse results (&lt;8)</span></span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border shrink-0 ${icecastFallback ? "bg-white text-[var(--accent)] border-white" : "bg-[var(--card)] border-[var(--border)]"}`}>{icecastFallback ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </section>

              <section>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">DATA</div>
                <button onClick={toggleDataSaver} aria-pressed={dataSaver} className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl border pressable ${dataSaver ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--muted)] border-[var(--border)] hover:border-[var(--border-hover)]"}`}>
                  <span className="text-sm font-medium">Data Saver</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${dataSaver ? "bg-white text-[var(--accent)] border-white" : "bg-[var(--card)] border-[var(--border)]"}`}>{dataSaver ? "ON · ~30MB/h" : "OFF · ~120MB/h"}</span>
                </button>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-2 leading-relaxed">Prefers ≤128 kbps streams, hides artwork.</p>
              </section>

              <section>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">LIBRARY</div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>{favorites.length} favourites</span><span className="flex gap-1.5"><button onClick={handleExport} className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold pressable">{exported ? "Copied ✓" : "Export"}</button><button onClick={clearFavorites} className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-400 pressable">Clear</button></span></div>
                  <div className="flex items-center justify-between"><span>{recent.length} recent</span><button onClick={clearRecent} className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-400 pressable">Clear</button></div>
                </div>
              </section>

              <section>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">OFFLINE</div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-3 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{savedStations.length} saved station{savedStations.length !== 1 ? "s" : ""}</span>
                    {cacheMB !== null && <span className="text-xs text-[var(--muted-foreground)]">{cacheMB} MB</span>}
                  </div>
                  {savedStations.length > 0 && (
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto thin-scroll">
                      {savedStations.map((s) => {
                        const hrs = Math.max(0, Math.round((s.expiresAt - now) / 3600000));
                        return (
                          <div key={s.uuid} className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                            <span className="truncate max-w-[180px]">{s.name}</span>
                            <span className="text-emerald-400 shrink-0">{hrs >= 24 ? `${Math.floor(hrs / 24)}d` : `${hrs}h`}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {savedStations.length > 0 && (
                    <button onClick={clearSavedStations} className="w-full rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 px-3 py-2 text-xs font-bold pressable">Clear all saved</button>
                  )}
                  <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">Saved stations play offline for up to 24h. Tap the download icon on any station card to save it.</p>
                </div>
              </section>

              <section>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">POWER</div>
                <button onClick={() => { powerOff(); onClose(); }} className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white py-3 text-sm font-bold transition-colors pressable">⏻ Power off / Stop</button>
              </section>

              <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                Radiobeast · Radio Browser API · PWA ready · v1.1
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
