"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { StationCard } from "@/components/StationCard";
import { CuratedGroups } from "@/components/CuratedGroups";
import { PopularGenres } from "@/components/PopularGenres";
import { ForYou } from "@/components/ForYou";
import {
  Station, Country, Tag, Language,
  getCountries, getTags, getLanguages, getTopStations, getTopVoted,
  getStationsWithIcecastFallback, getStationByUuid, isGenreTagName,
} from "@/lib/radio";

function isGenre(t: Tag): boolean {
  if (!isGenreTagName(t.name)) return false;
  // skip if it's just a country/language name (no spaces unless it's a known compound)
  if (/^[A-Z][a-z]+$/.test(t.name) && t.stationcount < 200) return false;
  return true;
}
import { usePlayerStore } from "@/stores/playerStore";

type Tab = "trending" | "top" | "favorites" | "recent";
type Sort = "clicks" | "votes" | "name";
type View = "grid" | "list";

const COUNTRIES_FALLBACK = ["NG", "US", "GB", "DE", "FR", "IN", "BR", "CA", "ZA", "KE", "GH", "AU"];

function SkeletonCard({ list }: { list?: boolean }) {
  if (list) return <div className="h-[76px] rounded-2xl border border-[var(--border)] bg-[var(--card)] skeleton" />;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="h-28 skeleton" />
      <div className="p-3.5 space-y-3">
        <div className="h-4 w-3/4 rounded-lg skeleton" />
        <div className="h-3 w-1/2 rounded-lg skeleton" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded-xl skeleton" />
          <div className="h-10 w-10 rounded-xl skeleton" />
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] pl-3 pr-1.5 py-1 text-xs font-semibold text-[var(--foreground)] capitalize">
      {label}
      <button
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="grid h-4 w-4 place-items-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--background)] hover:bg-[var(--muted-foreground)] transition-colors leading-none"
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </span>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("trending");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<Sort>("clicks");
  const [view, setView] = useState<View>("grid");
  const [showAllTags, setShowAllTags] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { play, favorites, recent, setQueue, dataSaver, preferSelfHost, icecastFallback, clearFavorites, clearRecent } = usePlayerStore();
  const limit = dataSaver ? 18 : 24;

  // meta lookups
  useEffect(() => {
    const opts = { preferSelfHost };
    getCountries(opts).then(setCountries).catch(() => {});
    getTags(60, opts).then((all) => setTags(all.filter(isGenre).slice(0, 30))).catch(() => {});
    getLanguages(opts).then((l) => setLanguages(l.slice(0, 60))).catch(() => {});
  }, [preferSelfHost]);

  // shared ?station= link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stationId = params.get("station");
    if (stationId) {
      getStationByUuid(stationId, { preferSelfHost }).then((station) => {
        if (station) play(station);
        window.history.replaceState({}, "", window.location.pathname);
      }).catch(() => {});
    }
  }, [play, preferSelfHost]);

  // keyboard: space / arrows — only when a station exists & not typing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const { toggle, next, prev, current } = usePlayerStore.getState();
      if (!current && (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowLeft")) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const orderFor = useCallback((s: Sort) => (s === "votes" ? "votes" : s === "name" ? "name" : "clickcount"), []);

  const fetchStationsImpl = useCallback(async (reset = true) => {
    if (reset) { setLoading(true); } else { setLoadingMore(true); }
    setError(null);
    const maxAttempts = 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const off = reset ? 0 : offsetRef.current;
        let data: Station[] = [];
        const fetchOpts = { preferSelfHost };
        const base = {
          name: activeSearch || undefined,
          countrycode: country || undefined,
          language: language || undefined,
          tag: tag || undefined,
          limit, offset: off,
          order: activeSearch || country || tag || language ? orderFor(sort) : sort === "name" ? "name" : sort === "votes" ? "votes" : "clickcount",
          reverse: sort !== "name",
        };
        if (activeSearch || country || tag || language) {
          data = await getStationsWithIcecastFallback(base, fetchOpts, icecastFallback);
        } else if (tab === "trending") {
          const top = await getTopStations(limit + off, fetchOpts);
          data = top.slice(off, off + limit);
          if (icecastFallback && data.length < 6) {
            const { getIcecastStations } = await import("@/lib/radio");
            const extra = await getIcecastStations({ limit });
            const seen = new Set(data.map((s) => s.stationuuid));
            data = [...data, ...extra.filter((s) => !seen.has(s.stationuuid))].slice(0, limit);
          }
        } else if (tab === "top") {
          const top = await getTopVoted(limit + off, fetchOpts);
          data = top.slice(off, off + limit);
        }
        if (dataSaver) data = data.filter((s) => !s.bitrate || s.bitrate <= 128).slice(0, limit);
        if (sort === "name") data = [...data].sort((a, b) => a.name.localeCompare(b.name));

        if (reset) {
          setStations(data);
          offsetRef.current = limit;
          if (data.length) setQueue(data);
        } else {
          setStations((p) => {
            const seen = new Set(p.map((s) => s.stationuuid));
            const merged = [...p, ...data.filter((s) => !seen.has(s.stationuuid))];
            setQueue(merged);
            return merged;
          });
          offsetRef.current = off + limit;
        }
        setHasMore(data.length >= Math.min(limit, 12));
        return;
      } catch (e: unknown) {
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        setError(e instanceof Error ? e.message : "Failed to load stations. Check your connection and retry.");
      }
    }
    setLoading(false);
    setLoadingMore(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeSearch, country, language, tag, sort, limit, dataSaver, preferSelfHost, icecastFallback]);
  const fetchStations = useCallback((reset = true) => fetchStationsImpl(reset), [fetchStationsImpl]);

  // reset on filter change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "favorites" || tab === "recent") { setLoading(false); setStations([]); return; }
    offsetRef.current = 0;
    setHasMore(true);
    fetchStations(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeSearch, country, language, tag, sort, dataSaver, preferSelfHost, icecastFallback]);

  // infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || tab === "favorites" || tab === "recent") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !error) fetchStations(false);
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, error, tab]);

  const displayed: Station[] = useMemo(() => {
    if (tab === "favorites") {
      const pool = new Map([...stations, ...recent].map((s) => [s.stationuuid, s] as const));
      // fall back to recent-only hydration is handled below; show what we have
      return favorites.map((id) => pool.get(id)).filter(Boolean) as Station[];
    }
    if (tab === "recent") return recent;
    return stations;
  }, [tab, stations, favorites, recent]);

  // hydrate missing favourites (up to 12, not just 6)
  useEffect(() => {
    if (tab !== "favorites" || !favorites.length) return;
    const poolIds = new Set([...stations, ...recent].map((s) => s.stationuuid));
    const missing = favorites.filter((id) => !poolIds.has(id)).slice(0, 12);
    if (!missing.length) return;
    let cancelled = false;
    import("@/lib/radio").then(({ getStationByUuid }) => {
      Promise.all(missing.map((id) => getStationByUuid(id).catch(() => null))).then((r) => {
        if (cancelled) return;
        const found = r.filter(Boolean) as Station[];
        if (found.length) setStations((p) => [...p, ...found.filter((s) => !p.some((x) => x.stationuuid === s.stationuuid))]);
      });
    });
    return () => { cancelled = true; };
  }, [tab, favorites, stations, recent]);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setActiveSearch(v.trim());
    setTab("trending");
  }, []);

  const clear = () => { setCountry(""); setLanguage(""); setTag(""); setActiveSearch(""); setSearch(""); setSort("clicks"); };

  const surprise = () => {
    const pool = displayed.length ? displayed : stations;
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setQueue(pool);
    play(pick);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const selectGenre = useCallback((t: string) => {
    setTag(t);
    setTab("trending");
    requestAnimationFrame(() => {
      document.getElementById("browse")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const tabs: [Tab, string][] = [
    ["trending", "Trending"],
    ["top", "Top Voted"],
    ["favorites", `Favourites${favorites.length ? ` · ${favorites.length}` : ""}`],
    ["recent", `Recent${recent.length ? ` · ${recent.length}` : ""}`],
  ];

  const hasFilters = !!(country || language || tag || activeSearch || sort !== "clicks");
  const visibleTags = showAllTags ? tags.slice(0, 30) : tags.slice(0, 12);

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={handleSearch} searchValue={search} />

      {/* hero — compact, premium */}
      <div className="relative overflow-hidden mx-auto w-full max-w-6xl px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
        <div className="hero-glow" aria-hidden="true" />
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-[0.15em]">LIVE NOW</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 text-[40px] sm:text-[60px] lg:text-[72px] font-extrabold tracking-[-0.035em] leading-[0.95] text-[var(--foreground)]"
          >
            Radio.<br className="sm:hidden" />{" "}
            <span className="inline-block animate-float">Everywhere.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.13, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-[15px] sm:text-[17px] leading-[1.65] text-[var(--muted-foreground)] max-w-[440px]"
          >
            45,000 live stations. Any country, any genre. Just press play.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={surprise}
              disabled={!stations.length}
              className="rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-6 py-3 text-sm font-bold shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/30 transition-all pressable disabled:opacity-40 disabled:shadow-none"
            >
              Surprise me
            </button>
            <a
              href="#browse"
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)] hover:border-[var(--border-hover)] px-6 py-3 text-sm font-semibold shadow-sm transition-all pressable"
            >
              Browse all
            </a>
          </motion.div>
        </div>
      </div>

      {/* For You — personalized mix (pins + learned taste) */}
      {tab === "trending" && !activeSearch && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 mt-8">
          <ForYou />
        </div>
      )}

      {/* popular genres — quick sound picker */}
      {tab === "trending" && !activeSearch && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 mt-8">
          <PopularGenres activeTag={tag} onSelect={selectGenre} />
        </div>
      )}

      {/* curated genre groups — only on main view */}
      {tab === "trending" && !activeSearch && !country && !tag && !language && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 mt-8">
          <CuratedGroups />
        </div>
      )}

      {/* controls */}
      <div id="browse" className="mx-auto w-full max-w-6xl px-4 sm:px-6 mt-6 scroll-mt-[120px] sm:scroll-mt-24">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
          <div className="flex items-center rounded-2xl bg-[var(--muted)]/70 border border-[var(--border)] p-1 gap-1 shrink-0" role="tablist" aria-label="Station lists">
            {tabs.map(([k, label]) => (
              <button
                key={k} role="tab" aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`px-4 py-2 text-[13px] font-semibold whitespace-nowrap shrink-0 rounded-xl transition-colors pressable ${tab === k ? "bg-[var(--foreground)] text-[var(--background)] shadow" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto hidden md:flex items-center gap-2 shrink-0">
            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="app-select w-auto min-w-[150px]">
              <option value="clicks">Most played</option>
              <option value="votes">Most loved</option>
              <option value="name">A – Z</option>
            </select>
            <div className="flex rounded-xl border border-[var(--border)] bg-[var(--card)] p-1" role="group" aria-label="Layout">
              <button onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Grid view" className={`h-8 w-8 grid place-items-center rounded-lg pressable ${view === "grid" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
              </button>
              <button onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view" className={`h-8 w-8 grid place-items-center rounded-lg pressable ${view === "list" ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* filter row */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <label className="block">
            <span className="sr-only">Filter by country</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="app-select">
              <option value="">🌍 All countries</option>
              {countries.map((c) => <option key={c.iso_3166_1} value={c.iso_3166_1}>{c.name} ({c.stationcount})</option>)}
              {!countries.length && COUNTRIES_FALLBACK.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter by language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="app-select">
              <option value="">🗣 All languages</option>
              {languages.map((l) => <option key={l.name} value={l.name}>{l.name} ({l.stationcount})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Filter by genre</span>
            <select value={tag} onChange={(e) => setTag(e.target.value)} className="app-select capitalize">
              <option value="">🎶 All genres</option>
              {tags.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.stationcount})</option>)}
            </select>
          </label>
          <div className="col-span-2 md:col-span-1 flex gap-2">
            <label className="md:hidden flex-1">
              <span className="sr-only">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="app-select">
                <option value="clicks">Most played</option>
                <option value="votes">Most loved</option>
                <option value="name">A – Z</option>
              </select>
            </label>
            <button onClick={() => setView(view === "grid" ? "list" : "grid")} aria-label="Toggle layout" className="md:hidden h-11 w-11 grid place-items-center rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] transition-colors shrink-0 pressable">
              {view === "grid" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
              )}
            </button>
            {hasFilters && <button onClick={clear} className="h-11 rounded-xl bg-[var(--foreground)] text-[var(--background)] px-5 text-sm font-semibold shrink-0 pressable hover:opacity-90">Clear</button>}
          </div>
        </div>

        {/* genre pills */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" aria-label="Quick genres">
          {visibleTags.map((t, i) => (
            <motion.button
              key={t.name}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}
              onClick={() => setTag(tag === t.name ? "" : t.name)}
              aria-pressed={tag === t.name}
              className={`shrink-0 px-3.5 py-2 text-xs font-semibold border rounded-full capitalize transition-colors pressable ${tag === t.name ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/25" : "bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"}`}
            >
              {t.name}
            </motion.button>
          ))}
          {tags.length > 12 && (
            <button onClick={() => setShowAllTags((v) => !v)} className="shrink-0 px-3.5 py-2 text-xs font-semibold rounded-full border border-dashed border-[var(--border-hover)] text-[var(--muted-foreground)] pressable">
              {showAllTags ? "Show less −" : `+${tags.length - 12} more`}
            </button>
          )}
        </div>

        {/* active filter chips */}
        {(activeSearch || country || language || tag) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] mr-0.5">Filters</span>
            {activeSearch && <FilterChip label={`“${activeSearch}”`} onClear={() => { setSearch(""); setActiveSearch(""); }} />}
            {country && <FilterChip label={countries.find((c) => c.iso_3166_1 === country)?.name || country} onClear={() => setCountry("")} />}
            {language && <FilterChip label={language} onClear={() => setLanguage("")} />}
            {tag && <FilterChip label={tag} onClear={() => setTag("")} />}
            <button onClick={clear} className="ml-1 text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline underline-offset-2 pressable">Clear all</button>
          </div>
        )}

        {/* result meta */}
        <div className="mt-4 flex items-center justify-between gap-3" aria-live="polite">
          <p className="text-[13px] text-[var(--muted-foreground)] truncate">
            {activeSearch ? <>Results for <b className="text-[var(--foreground)]">“{activeSearch}”</b> — </> : null}
            {tab === "favorites" ? `${displayed.length} favourites` : tab === "recent" ? `${displayed.length} recent` : `${displayed.length} stations`}
            {hasFilters && tab !== "favorites" && tab !== "recent" ? " • filtered" : ""}
          </p>
          <div className="flex gap-2 shrink-0">
            {tab === "favorites" && !!favorites.length && <button onClick={clearFavorites} className="text-xs font-semibold text-red-400 hover:underline">Clear all</button>}
            {tab === "recent" && !!recent.length && <button onClick={clearRecent} className="text-xs font-semibold text-red-400 hover:underline">Clear</button>}
            {hasFilters && <button onClick={clear} className="text-xs font-semibold underline underline-offset-4 text-[var(--foreground)]">Reset filters</button>}
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 mt-4 flex-1">
        {loading && stations.length === 0 && tab !== "favorites" && tab !== "recent" ? (
          <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2.5 max-w-3xl"}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} list={view === "list"} />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 p-8 text-center" role="alert">
            <div className="h-10 w-10 mx-auto grid place-items-center rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)] text-lg mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
            </div>
            <p className="text-[var(--destructive)] font-semibold text-sm">{error}</p>
            <p className="text-[var(--muted-foreground)] text-xs mt-1">Check your connection or try a different server.</p>
            <button onClick={() => fetchStations(true)} className="mt-4 rounded-xl bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 text-sm font-semibold pressable">Retry</button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 sm:p-16 text-center">
            <div className="h-16 w-16 mx-auto grid place-items-center rounded-2xl bg-[var(--muted)] border border-[var(--border)] animate-float">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted-foreground)]"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            </div>
            <h3 className="font-bold mt-5 text-base">{tab === "favorites" ? "No favourites yet" : tab === "recent" ? "Nothing played yet" : "No stations found"}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-2 max-w-sm mx-auto leading-relaxed">{tab === "favorites" ? "Tap the heart on any station to save it here for quick access." : tab === "recent" ? "Hit play on anything — your listening history lands here." : "Try a different search or loosen your filters."}</p>
            <div className="mt-6 flex justify-center gap-2.5">
              {hasFilters && <button onClick={clear} className="rounded-xl bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 text-sm font-semibold pressable">Clear filters</button>}
              <button onClick={surprise} className="rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)] px-6 py-2.5 text-sm font-semibold pressable">Surprise me</button>
            </div>
          </div>
        ) : (
          <>
            <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-2.5 max-w-3xl"}>
              <AnimatePresence initial={false}>
                {displayed.map((s) => <StationCard key={s.stationuuid} station={s} layout={view} onPlay={() => setQueue(displayed)} />)}
              </AnimatePresence>
            </div>
            {loadingMore && (
              <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4" : "flex flex-col gap-2.5 max-w-3xl mt-2.5"}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} list={view === "list"} />)}
              </div>
            )}
            {tab !== "favorites" && tab !== "recent" && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                {hasMore ? (
                  <button onClick={() => fetchStations(false)} disabled={loadingMore} className="w-full sm:w-auto rounded-2xl bg-[var(--foreground)] text-[var(--background)] px-8 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity pressable">
                    {loadingMore ? "Loading…" : `Load ${limit} more`}
                  </button>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">You’ve reached the end — try new filters or 🔀 Surprise me.</p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[var(--border)] mt-10 pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-[var(--accent)] grid place-items-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            </div>
            <span className="font-semibold text-[var(--foreground)]">Radiobeast</span>
            <span className="text-[var(--border-hover)]">·</span>
            <span>45k+ stations · Free · No sign-up</span>
          </div>
          <span className="flex gap-3 items-center text-[11px] tracking-wide">
            <kbd className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> play
            <kbd className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px]">←→</kbd> skip
            <kbd className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px]">?</kbd> help
          </span>
        </div>
      </footer>
    </div>
  );
}
