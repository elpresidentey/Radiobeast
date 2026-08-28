"use client";
import { useEffect, useState } from "react";

export function PWARegister() {
  const [updateReady, setUpdateReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // check standalone
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    setIsStandalone(!!standalone);
    // dismissed check (24h)
    const d = localStorage.getItem("radiobeast:pwa-dismissed");
    if (d && Date.now() - parseInt(d, 10) < 24 * 60 * 60 * 1000) setDismissed(true);
    // iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && !standalone) setShowIOSHint(true);

    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
        setInterval(() => reg.update().catch(() => {}), 60_000);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
          });
        });
      }).catch((e) => console.warn("SW register failed", e));
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa:installable"));
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const doUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => reg?.waiting?.postMessage("SKIP_WAITING"));
    setUpdateReady(false);
  };

  const doInstall = async () => {
    const prompt = deferredPrompt || (window as any).deferredPrompt;
    if (!prompt) {
      // fallback for iOS/manual
      setShowIOSHint(true);
      return;
    }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") setDeferredPrompt(null);
    } catch {}
  };

  const dismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    localStorage.setItem("radiobeast:pwa-dismissed", Date.now().toString());
  };

  if (installed || isStandalone) return null;

  const showBanner = (deferredPrompt || showIOSHint) && !dismissed && !installed;

  return (
    <>
      {updateReady && (
        <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] pl-4 pr-2 py-2 shadow-lg flex items-center gap-3 border border-[var(--border)] max-w-[92vw]">
          <span className="text-sm font-medium">New version available</span>
          <button onClick={doUpdate} className="bg-[#ff3b30] text-white px-3.5 py-1.5 text-xs font-bold rounded-none">Update</button>
          <button onClick={() => setUpdateReady(false)} className="h-7 w-7 grid place-items-center bg-black/10 rounded-none">×</button>
        </div>
      )}

      {/* Prominent PWA urge — top banner, visible on ALL devices */}
      {showBanner && (
        <div className="sticky top-[56px] sm:top-[60px] z-30 bg-[#1d1d1f] text-white border-b border-[#1d1d1f]">
          <div className="mx-auto max-w-5xl px-3 sm:px-6 py-3 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 grid place-items-center bg-[#ff3b30] text-white shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9-4.03-9-9-9Z" stroke="white" strokeWidth="1.8"/><path d="M12 7a5 5 0 0 1 5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="1.2" fill="white"/></svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] sm:text-sm font-bold leading-none">Install Radiobeast App</div>
              <div className="text-[11px] sm:text-xs text-white/75 leading-tight">Add to home screen — works offline, launches instantly, less data.</div>
            </div>
            <button onClick={doInstall} className="shrink-0 bg-[#ff3b30] hover:bg-[#e8352b] text-white px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-bold">Install</button>
            <button onClick={dismiss} aria-label="Dismiss" className="h-8 w-8 grid place-items-center text-white/70 hover:text-white shrink-0">×</button>
          </div>
          {showIOSHint && !deferredPrompt && (
            <div className="mx-auto max-w-5xl px-3 sm:px-6 pb-3 text-xs text-white/70">On iPhone: tap <span className="text-white font-bold">Share → Add to Home Screen</span></div>
          )}
        </div>
      )}

      {/* Fallback floating card — also now visible on mobile */}
      {deferredPrompt && !dismissed && !showBanner && (
        <div className="fixed right-3 left-3 sm:left-auto sm:right-3 bottom-[88px] z-40 flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] p-3 shadow-xl max-w-[420px] sm:max-w-[360px] ml-auto">
          <div className="h-10 w-10 grid place-items-center bg-[#ff3b30] text-white shrink-0">R</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold leading-none text-[var(--foreground)]">Install Radiobeast</div>
            <div className="text-xs text-[var(--muted-foreground)]">Offline & quick launch</div>
          </div>
          <button onClick={doInstall} className="bg-[#ff3b30] text-white px-4 py-2 text-sm font-bold shrink-0">Install</button>
          <button onClick={dismiss} aria-label="Dismiss" className="h-8 w-8 grid place-items-center text-[var(--muted-foreground)]">×</button>
        </div>
      )}
    </>
  );
}
