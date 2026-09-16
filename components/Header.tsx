"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayerStore } from "@/stores/playerStore";
import { useTheme } from "@/components/ThemeProvider";
import { Settings } from "@/components/Settings";

function LogoMark() {
  return (
    <div className="relative grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-[var(--accent)] text-white shadow-[0_6px_20px_rgba(255,59,48,0.35)] shrink-0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9-4.03-9-9-9Z" stroke="white" strokeWidth="1.8" />
        <path d="M12 7a5 5 0 0 1 5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 10a2 2 0 0 1 2 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.3" fill="white" />
      </svg>
      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--card)] animate-[pulse-live_1.8s_infinite]" />
    </div>
  );
}

export function Header({ onSearch, searchValue }: { onSearch: (v: string) => void; searchValue: string }) {
  const [local, setLocal] = useState(searchValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { current, isPlaying, dataSaver } = usePlayerStore();
  const { theme, toggle } = useTheme();
  const [canInstall, setCanInstall] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external prop into debounced local field
  useEffect(() => setLocal(searchValue), [searchValue]);

  useEffect(() => {
    const check = () => setCanInstall(!!(window as unknown as { deferredPrompt?: unknown }).deferredPrompt);
    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => setCanInstall(false);
    window.addEventListener("pwa:installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone;
    if (!isStandalone) {
      check();
      const t = setTimeout(check, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("pwa:installable", onInstallable);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }
    return () => {
      window.removeEventListener("pwa:installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // "/" focuses search
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

  // Debounced auto-search (veteran UX: no dead input, no enter-required)
  const queueSearch = (v: string) => {
    setLocal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(v), 450);
  };

  const commitNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch(local);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocal("");
    onSearch("");
  };

  const handleInstall = async () => {
    const w = window as unknown as { deferredPrompt?: { prompt: () => Promise<void>; userChoice: Promise<unknown> } };
    if (w.deferredPrompt) {
      try {
        await w.deferredPrompt.prompt();
        await w.deferredPrompt.userChoice;
      } catch { /* noop */ }
    } else {
      window.dispatchEvent(new CustomEvent("pwa:show-hint"));
    }
  };

  const searchField = (isMobile: boolean) => (
    <div className="relative w-full group">
      <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-[var(--accent)] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        ref={isMobile ? mobileRef : inputRef}
        value={local}
        onChange={(e) => queueSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitNow();
          if (e.key === "Escape") clearSearch();
        }}
        placeholder="Search stations, genres, countries…"
        aria-label="Search stations"
        role="searchbox"
        className="h-11 w-full rounded-xl bg-[var(--muted)] border border-[var(--border)] hover:border-[var(--border-hover)] pl-10 pr-24 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
      />
      {local ? (
        <button onClick={clearSearch} aria-label="Clear search" className="absolute right-[86px] top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)] text-lg leading-none">×</button>
      ) : (
        <kbd className="hidden lg:grid absolute right-[86px] top-1/2 -translate-y-1/2 h-6 w-6 place-items-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[11px] font-medium text-[var(--muted-foreground)]">/</kbd>
      )}
      <button onClick={commitNow} className="absolute right-1.5 top-1.5 bottom-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-4 text-sm font-semibold rounded-lg transition-colors pressable">Search</button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 liquid-strong">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="min-h-[60px] flex items-center gap-3 sm:gap-4 py-2">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 min-w-0 group" aria-label="Radiobeast home">
            <LogoMark />
            <div className="leading-none min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[19px] sm:text-[21px] font-extrabold tracking-tight leading-none text-[var(--foreground)]">Radiobeast</span>
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE
                </span>
              </div>
              <div className="text-[10px] font-semibold tracking-[0.22em] text-[var(--muted-foreground)] leading-none mt-1">WORLD RADIO</div>
            </div>
          </Link>

          {current && (
            <div className="hidden lg:flex items-center gap-2.5 rounded-xl bg-[var(--muted)]/70 border border-[var(--border)] px-2.5 py-1.5 ml-1 max-w-[230px] shrink-0" aria-live="polite">
              <div className={`h-7 w-7 grid place-items-center rounded-lg shrink-0 ${isPlaying ? "bg-[var(--accent)] text-white" : "bg-[var(--border)] text-[var(--muted-foreground)]"}`}>
                {isPlaying ? (
                  <span className="flex items-end gap-[2px] h-3" aria-hidden="true">
                    <span className="w-[2px] rounded-full bg-current animate-[equalize_0.8s_ease-in-out_infinite]" style={{ height: "10px" }} />
                    <span className="w-[2px] rounded-full bg-current animate-[equalize_0.8s_ease-in-out_infinite]" style={{ height: "6px", animationDelay: "0.2s" }} />
                    <span className="w-[2px] rounded-full bg-current animate-[equalize_0.8s_ease-in-out_infinite]" style={{ height: "12px", animationDelay: "0.4s" }} />
                  </span>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-xs font-semibold max-w-[140px] text-[var(--foreground)]">{current.name}</div>
                <div className="text-[11px] text-[var(--muted-foreground)] truncate">{isPlaying ? "Live" : "Paused"} • {current.country || "World"}</div>
              </div>
            </div>
          )}

          <div className="hidden sm:flex flex-1 justify-center max-w-[480px] mx-auto px-2">
            {searchField(false)}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            {canInstall && (
              <button onClick={handleInstall} className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm shadow-[var(--accent)]/25 transition-colors pressable">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 15V3M8 11l4 4 4-4" /><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /></svg>
                Install
              </button>
            )}
            {dataSaver && (
              <span className="hidden md:inline-flex items-center gap-1 h-9 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[11px] font-bold" title="Data saver is on">◒ Saver</span>
            )}
            <button onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings" className="icon-btn pressable">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
            </button>
            <button onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Toggle theme" className="icon-btn pressable">
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
              )}
            </button>
          </div>
        </div>

        <div className="sm:hidden pb-3">
          {searchField(true)}
        </div>
      </div>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
