# Radiobeast — World Radio

Listen to **any radio station from any part of the world**. 45k+ live stations, free, no sign-up.

Built with Next.js 16, Tailwind, Zustand, hls.js, and the free [Radio Browser API](https://api.radio-browser.info).

## Features
- 🔥 Trending / ⭐ Top voted / ❤ Favorites / 🕘 Recent
- 🔍 Search by name + filter by country (200+), genre/tag, language
- 📻 Play any station: MP3/AAC/HLS supported, Media Session API, background playback
- 🎛 Global sticky player: play/pause, next/prev queue, volume, mute, fav toggle
- 💾 Favorites & recent in localStorage; queue for next/prev
- 🌐 Fallback across `de1`/`de2`/`nl1` Radio Browser servers, `hidebroken=true`, click counting

## Getting Started
```bash
cd C:\Users\hp\Radiobeast
npm install
npm run dev   # http://localhost:3000
npm run build && npm start
```

## Tech
- Next.js App Router + TypeScript, Tailwind CSS 4
- `lib/radio.ts` — typed client with server fallback & caching
- `stores/playerStore.ts` — Zustand (fav/recent/vol persisted)
- `hooks/useAudioPlayer.ts` — Audio + hls.js + autoplay/mixed-content handling
- `components/StationCard.tsx`, `GlobalPlayer.tsx`, `Header.tsx`

## API
Uses `https://de1.api.radio-browser.info/json/*` (CORS enabled). No auth. Rate limit ~2-3 req/s; responses cached 5min server-side. Streams are `url_resolved`; http streams may be blocked on https — filtered warning shown.

## Deploy
Push to Vercel (Next defaults). Or `npm run build` anywhere Node 20+.
