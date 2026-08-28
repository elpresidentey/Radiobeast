"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/stores/playerStore";
import { useTheme } from "@/components/ThemeProvider";

export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dataSaver, toggleDataSaver } = usePlayerStore();
  const { theme, toggle } = useTheme();
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check = () => setCanInstall(!!(window as any).deferredPrompt);
    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => setCanInstall(false);
    window.addEventListener("pwa:installable" as any, onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone);
    check();
    return () => {
      window.removeEventListener("pwa:installable" as any, onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [open]);

  const handleInstall = async () => {
    const p = (window as any).deferredPrompt;
    if (p) {
      await p.prompt();
      await p.userChoice;
    } else {
      // iOS hint
      alert("On iPhone: tap Share → Add to Home Screen\nOn Android/Chrome: Menu → Install app");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 h-full w-[92%] max-w-[360px] bg-[var(--card)] border-l border-[var(--border)] flex flex-col"
          >
            <div className="h-[56px] flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
              <span className="text-sm font-semibold tracking-wide">Settings</span>
              <button onClick={onClose} className="h-8 w-8 grid place-items-center bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Install PWA — prominent */}
              <div className="border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                <div className="text-xs font-bold tracking-wide text-[var(--muted-foreground)] mb-2">APP</div>
                {isStandalone ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium"><span className="h-2 w-2 bg-emerald-500" /> Installed — running as app</div>
                ) : canInstall ? (
                  <button onClick={handleInstall} className="w-full flex items-center justify-center gap-2 bg-[#ff3b30] text-white py-3 text-sm font-bold border border-[#ff3b30] hover:bg-[#e8352b]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3M8 11l4 4 4-4"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></svg>
                    Install Radiobeast App
                  </button>
                ) : (
                  <div className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    Install for offline shell + instant launch.<br />
                    <span className="font-semibold text-[var(--foreground)]">Chrome/Edge:</span> Menu → Install app<br />
                    <span className="font-semibold text-[var(--foreground)]">iPhone:</span> Share → Add to Home Screen
                  </div>
                )}
                <p className="text-[11px] text-[var(--muted-foreground)] mt-2">Works offline • Less data • Home-screen icon</p>
              </div>

              {/* Appearance */}
              <div>
                <div className="text-xs font-bold tracking-wide text-[var(--muted-foreground)] mb-2">APPEARANCE</div>
                <button onClick={toggle} className="w-full flex items-center justify-between bg-[var(--muted)] border border-[var(--border)] px-3 py-3 hover:bg-[var(--card-hover)]">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-8 w-8 grid place-items-center bg-[var(--card)] border border-[var(--border)]">{theme === "dark" ? "☀" : "☾"}</span>
                    {theme === "dark" ? "Dark mode" : "Light mode"}
                  </span>
                  <span className="text-xs font-bold text-[var(--muted-foreground)]">Tap to switch → {theme === "dark" ? "Light" : "Dark"}</span>
                </button>
              </div>

              {/* Data */}
              <div>
                <div className="text-xs font-bold tracking-wide text-[var(--muted-foreground)] mb-2">DATA</div>
                <button onClick={toggleDataSaver} className={`w-full flex items-center justify-between px-3 py-3 border ${dataSaver ? "bg-[#ff3b30] border-[#ff3b30] text-white" : "bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card-hover)]"}`}>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className={`h-8 w-8 grid place-items-center border ${dataSaver ? "bg-white/20 border-white/20" : "bg-[var(--card)] border-[var(--border)]"}`}>◒</span>
                    Data Saver
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 border ${dataSaver ? "bg-white text-[#ff3b30] border-white" : "bg-[var(--card)] border-[var(--border)]"}`}>{dataSaver ? "ON · ~30MB/h" : "OFF · ~120MB/h"}</span>
                </button>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-2 leading-relaxed">When on, prefers ≤128 kbps streams and hides station images. Square buttons stay sharp — identity preserved.</p>
              </div>

              <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                Radiobeast · 45k+ stations via Radio Browser API · Not affiliated · <span className="text-[var(--foreground)] font-medium">PWA ready</span> · v1.0
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
