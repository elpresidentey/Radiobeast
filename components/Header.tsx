"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePlayerStore } from "@/stores/playerStore";
import { useTheme } from "@/components/ThemeProvider";

export function Header({ onSearch, searchValue }: { onSearch: (v: string) => void; searchValue: string }) {
  const [local, setLocal] = useState(searchValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const { current, isPlaying, dataSaver, toggleDataSaver } = usePlayerStore();
  const { theme, toggle } = useTheme();
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => setLocal(searchValue), [searchValue]);

  useEffect(() => {
    const check = () => setCanInstall(!!(window as any).deferredPrompt);
    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => setCanInstall(false);
    window.addEventListener("pwa:installable" as any, onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    // initial check + standalone check
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (!isStandalone) {
      check();
      const t = setTimeout(check, 1500);
      return () => { clearTimeout(t); window.removeEventListener("pwa:installable" as any, onInstallable); window.removeEventListener("appinstalled", onInstalled); };
    }
    return () => {
      window.removeEventListener("pwa:installable" as any, onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      try { await prompt.prompt(); await prompt.userChoice; } catch {}
    } else {
      // fallback: scroll to banner or show iOS hint
      window.dispatchEvent(new CustomEvent("pwa:show-hint"));
    }
  };

  // "/" to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        const el = window.innerWidth < 640 ? mobileRef.current : inputRef.current;
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const clearSearch = () => {
    setLocal("");
    onSearch("");
  };

  return (
    <header className="sticky top-0 z-40 liquid-strong supports-[backdrop-filter]:bg-[var(--card)]/75">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        {/* main row */}
        <div className="h-[56px] sm:h-[60px] flex items-center gap-2 sm:gap-4">
          {/* brand */}
          <motion.a href="/" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0 group">
            <motion.div whileHover={{ rotate: 3 }} transition={{ type: "spring", stiffness: 300 }} className="relative grid h-9 w-9 sm:h-10 sm:w-10 place-items-center bg-[#ff3b30] text-white rounded-[10px] shadow-[0_4px_12px_rgba(255,59,48,0.25)] shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="sm:w-5 sm:h-5">
                <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9-4.03-9-9-9Z" stroke="white" strokeWidth="1.8" />
                <path d="M12 7a5 5 0 0 1 5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 10a2 2 0 0 1 2 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="12" r="1.2" fill="white" />
              </svg>
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--card)] animate-[pulse-live_1.8s_infinite]" />
            </motion.div>
            <div className="leading-none min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] sm:text-[16px] font-black tracking-[-0.03em] text-[var(--foreground)]">RADIOBEAST</span>
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="hidden lg:inline-flex items-center gap-1 bg-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold tracking-wide text-[var(--muted-foreground)]">LIVE</motion.span>
              </div>
              <div className="hidden sm:block text-[10px] font-semibold tracking-[0.14em] text-[var(--muted-foreground)] leading-none">WORLD RADIO • 45K+ STATIONS</div>
              <div className="sm:hidden text-[10px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] leading-none">WORLD RADIO</div>
            </div>
          </motion.a>

          {/* now playing — desktop */}
          {current && (
            <div className="hidden lg:flex items-center gap-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-[10px] px-2.5 py-1.5 ml-1 max-w-[220px] shrink-0">
              <div className={`h-7 w-7 grid place-items-center rounded-[7px] shrink-0 text-white ${isPlaying ? "bg-[#ff3b30]" : "bg-[var(--border)] text-[var(--muted-foreground)]"}`}>
                <span className="text-[11px] leading-none">{isPlaying ? "▶" : "॥"}</span>
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[12px] font-semibold max-w-[128px] text-[var(--foreground)]">{current.name}</div>
                <div className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] truncate">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-[var(--border-hover)]"}`} />
                  <span className="truncate">{isPlaying ? "Live" : "Paused"} • {current.country}</span>
                </div>
              </div>
              {isPlaying && (
                <div className="flex items-end gap-[2px] h-4 pl-1">
                  <span className="w-[2px] bg-[#ff3b30] rounded-full animate-[equalize_0.8s_ease-in-out_infinite]" style={{ height: "10px" }} />
                  <span className="w-[2px] bg-[#ff3b30] rounded-full animate-[equalize_0.8s_ease-in-out_infinite]" style={{ height: "6px", animationDelay: "0.2s" }} />
                  <span className="w-[2px] bg-[#ff3b30] rounded-full animate-[equalize_0.8s_ease-in-out_infinite]" style={{ height: "12px", animationDelay: "0.4s" }} />
                </div>
              )}
            </div>
          )}

          {/* desktop search — centered */}
          <div className="hidden sm:flex flex-1 justify-center max-w-[520px] mx-auto px-2">
            <div className="relative w-full group">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-[#ff3b30] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input
                ref={inputRef}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onSearch(local); if (e.key === "Escape") clearSearch(); }}
                placeholder="Search stations, genres, countries…"
                aria-label="Search stations"
                className="h-[40px] w-full bg-[var(--muted)] border border-[var(--border)] rounded-[10px] pl-9 pr-[96px] text-[14px] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#ff3b30]/40 focus:bg-[var(--card)] focus:ring-2 focus:ring-[#ff3b30]/15 transition-all"
              />
              {local ? (
                <button onClick={clearSearch} className="absolute right-[84px] top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-none text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)]">×</button>
              ) : (
                <span className="hidden lg:grid absolute right-[84px] top-1/2 -translate-y-1/2 h-6 place-items-center rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-1.5 text-[11px] font-medium text-[var(--muted-foreground)]">/</span>
              )}
              <button onClick={() => onSearch(local)} className="absolute right-1 top-1 bottom-1 bg-[#ff3b30] hover:bg-[#e8352b] text-white px-4 text-sm font-bold rounded-[8px] shadow-sm transition-colors">Search</button>
            </div>
          </div>

          {/* right controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">
            {canInstall && (
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleInstall} className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 bg-[#ff3b30] hover:bg-[#e8352b] text-white text-xs font-bold border border-[#ff3b30] rounded-none shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3M8 11l4 4 4-4"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></svg>
                Install App
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={toggleDataSaver}
              title={dataSaver ? "Data Saver ON — low bitrate, no images (~30 MB/h)" : "Data Saver OFF — best quality (~120 MB/h)"}
              className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-bold border rounded-none transition-colors ${dataSaver ? "bg-[#ff3b30] border-[#ff3b30] text-white shadow-sm" : "bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)]"}`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dataSaver ? "bg-white animate-ping" : "bg-emerald-500"}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${dataSaver ? "bg-white" : "bg-emerald-500"}`} />
              </span>
              {dataSaver ? "Saver" : "Saver Off"}
            </motion.button>

            <motion.button whileTap={{ scale: 0.92 }} onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`${theme === "dark" ? "Light" : "Dark"} mode`} className="h-9 w-9 grid place-items-center bg-[var(--muted)] border border-[var(--border)] rounded-none text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] transition-colors">
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
              )}
            </motion.button>

            {/* mobile install + saver */}
            {canInstall && (
              <motion.button whileTap={{ scale: 0.92 }} onClick={handleInstall} className="sm:hidden h-9 px-2.5 grid place-items-center bg-[#ff3b30] text-white text-xs font-bold border border-[#ff3b30] rounded-none shrink-0" aria-label="Install app">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3M8 11l4 4 4-4"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></svg>
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.92 }} onClick={toggleDataSaver} className={`sm:hidden h-9 w-9 grid place-items-center border rounded-none shrink-0 ${dataSaver ? "bg-[#ff3b30] border-[#ff3b30] text-white shadow-sm" : "bg-[var(--muted)] border-[var(--border)] text-[var(--muted-foreground)]"}`} aria-label="Data saver">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.97 16.97l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.97 7.03l2.83-2.83" /><circle cx="12" cy="12" r="3" /></svg>
            </motion.button>
          </div>
        </div>

        {/* mobile search row */}
        <div className="sm:hidden pb-2.5">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input
              ref={mobileRef}
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSearch(local); if (e.key === "Escape") clearSearch(); }}
              placeholder="Search stations, genres, countries…"
              aria-label="Search stations"
              className="h-[44px] w-full bg-[var(--muted)] border border-[var(--border)] rounded-[10px] pl-9 pr-[96px] text-[15px] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#ff3b30]/40 focus:bg-[var(--card)]"
            />
            {local ? (
              <button onClick={clearSearch} className="absolute right-[84px] top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-none text-[var(--muted-foreground)]">×</button>
            ) : null}
            <button onClick={() => onSearch(local)} className="absolute right-1 top-1 bottom-1 bg-[#ff3b30] text-white px-4 text-sm font-bold rounded-[8px]">Search</button>
          </div>
          <div className="flex items-center justify-between mt-2 px-0.5">
            <span className="text-[11px] font-medium text-[var(--muted-foreground)]">~{dataSaver ? "30–60 MB/h" : "60–150 MB/h"} · Tap ⓘ for info</span>
            {current ? (
              <span className="text-[11px] font-semibold text-[var(--foreground)] truncate max-w-[150px] flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-[var(--border-hover)]"}`} />{current.name}</span>
            ) : (
              <span className="text-[11px] text-[var(--muted-foreground)]">45k+ stations • PWA ready</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
