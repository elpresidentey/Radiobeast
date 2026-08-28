/* Radiobeast Service Worker — offline shell + API cache — v3 fixes stale chunk bug */
const CACHE_NAME = "radiobeast-v3";
const STATIC_CACHE = "radiobeast-static-v3";
const API_CACHE = "radiobeast-api-v3";

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CACHE_NAME, STATIC_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // never cache audio streams, proxy, or range requests
  if (req.headers.get("range") || url.pathname.startsWith("/api/stream") || url.pathname.match(/\.(mp3|aac|ogg|m3u8)$/i) || (url.hostname.includes("radio-browser") && req.url.includes("/json/url/"))) {
    return;
  }

  // Radio Browser API — network-first then cache
  if (url.hostname.includes("radio-browser.info") || url.hostname.includes("api.radio-browser")) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(API_CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Next static chunks — network-first to avoid stale factory bug (framer-motion)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // icons — cache first
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok) caches.open(STATIC_CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Navigation — network first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match("/")))
    );
    return;
  }

  // default: network-first
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok && req.method === "GET" && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
