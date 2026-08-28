"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { StationCard } from "@/components/StationCard";
import { Station, Country, Tag, getCountries, getTags, getTopStations, getTopVoted, getStations, getStationByUuid, getStationsWithIcecastFallback, getSelfHost } from "@/lib/radio";
import { usePlayerStore } from "@/stores/playerStore";

type Tab = "trending" | "top" | "favorites" | "recent";
const COUNTRIES_FALLBACK = ["NG", "US", "GB", "DE", "FR", "IN", "BR", "CA", "ZA", "KE", "GH", "AU"];

function SkeletonCard() {
  return <div className="h-[300px] border border-[var(--border)] bg-[var(--card)] overflow-hidden animate-pulse"><div className="h-[96px] bg-[var(--muted)]" /><div className="p-3 space-y-3"><div className="h-4 w-3/4 bg-[var(--muted)]" /><div className="h-3 w-1/2 bg-[var(--muted)]" /><div className="h-9 bg-[var(--muted)]" /></div></div>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("trending");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [country, setCountry] = useState("");
  const [tag, setTag] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [offset, setOffset] = useState(0);
  const limit = 24;
  const { play } = usePlayerStore();

  const { favorites, recent, setQueue, current, dataSaver, preferSelfHost, icecastFallback } = usePlayerStore();
  const effectiveLimit = dataSaver ? 16 : limit;

  useEffect(() => {
    const opts = { preferSelfHost };
    getCountries(opts).then(setCountries).catch(()=>{});
    getTags(30, opts).then(setTags).catch(()=>{});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferSelfHost]);

  // Handle shared station URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stationId = params.get('station');
    if (stationId) {
      getStationByUuid(stationId, { preferSelfHost }).then(station => {
        if (station) {
          play(station);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }).catch(() => {});
    }
  }, [play, preferSelfHost]);

  // Keyboard shortcuts
  useEffect(() => {
    const { toggle, next, prev } = usePlayerStore.getState();
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const fetchStations = useCallback(async (reset=true)=>{
    setLoading(true); setError(null);
    try{
      let data: Station[]=[]; const off = reset?0:offset;
      const l = effectiveLimit;
      const fetchOpts = { preferSelfHost };
      if(activeSearch){
        data=await getStationsWithIcecastFallback({ name:activeSearch, countrycode:country||undefined, tag:tag||undefined, limit:l, offset:off, order:"clickcount", reverse:true }, fetchOpts, icecastFallback);
      } else if(tab==="trending"){
        if(country||tag) data=await getStationsWithIcecastFallback({ countrycode:country||undefined, tag:tag||undefined, limit:l, offset:off, order:"clickcount", reverse:true }, fetchOpts, icecastFallback);
        else {
          const top = await getTopStations(l+off, fetchOpts);
          data = top.slice(off, off+l);
          if (icecastFallback && data.length < 6) {
            const { getIcecastStations } = await import("@/lib/radio");
            const extra = await getIcecastStations({ limit: l });
            const seen = new Set(data.map(s=>s.stationuuid));
            data = [...data, ...extra.filter(s=>!seen.has(s.stationuuid))].slice(0,l);
          }
        }
      } else if(tab==="top"){
        if(country||tag) data=await getStationsWithIcecastFallback({ countrycode:country||undefined, tag:tag||undefined, limit:l, offset:off, order:"votes", reverse:true }, fetchOpts, icecastFallback);
        else {
          const top = await getTopVoted(l+off, fetchOpts);
          data = top.slice(off, off+l);
        }
      }
      if(dataSaver) data = data.filter(s=> !s.bitrate || s.bitrate <= 128).slice(0,l);
      if(reset){ setStations(data); setOffset(l); } else { setStations(p=>[...p,...data]); setOffset(o=>o+l); }
      if(data.length) setQueue(reset?data:[...stations,...data]);
    }catch(e:unknown){ setError(e instanceof Error?e.message:"Failed to load"); } finally{ setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab,activeSearch,country,tag,offset,effectiveLimit,dataSaver,preferSelfHost,icecastFallback]);

  useEffect(()=>{ if(tab==="favorites"||tab==="recent"){ setLoading(false); setStations([]); return; } setOffset(0); fetchStations(true); // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab,activeSearch,country,tag,dataSaver,preferSelfHost,icecastFallback]);

  const displayed: Station[] = useMemo(()=>{
    if(tab==="favorites"){ const pool=[...stations,...recent]; const m=new Map(pool.map(s=>[s.stationuuid,s])); return favorites.map(id=>m.get(id)).filter(Boolean) as Station[]; }
    if(tab==="recent") return recent;
    return stations;
  },[tab,stations,favorites,recent]);

  useEffect(()=>{
    if(tab!=="favorites"||!favorites.length) return;
    const poolIds=new Set([...stations,...recent].map(s=>s.stationuuid));
    const missing=favorites.filter(id=>!poolIds.has(id)).slice(0,6);
    if(!missing.length) return;
    import("@/lib/radio").then(({getStationByUuid})=>{ Promise.all(missing.map(id=>getStationByUuid(id))).then(r=>{ const f=r.filter(Boolean) as Station[]; if(f.length) setStations(p=>[...p,...f]); }); });
  },[tab,favorites,stations,recent]);

  const handleSearch=(v:string)=>{ setSearch(v); setActiveSearch(v.trim()); setTab("trending"); };
  const clear=()=>{ setCountry(""); setTag(""); setActiveSearch(""); setSearch(""); };

  const tabs: [Tab,string][] = [["trending","Trending"],["top","Top Voted"],["favorites",`Favourites${favorites.length?` · ${favorites.length}`:""}`],["recent",`Recent${recent.length?` · ${recent.length}`:""}`]];

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <Header onSearch={handleSearch} searchValue={search} />

      {/* hero — more minimal, airy */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mx-auto w-full max-w-5xl px-5 sm:px-6 pt-12 sm:pt-20 pb-6">
        <div className="text-center max-w-[640px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.16em] text-[var(--muted-foreground)]">
            <span className="h-1 w-1 bg-emerald-500 animate-pulse" /> LIVE · WORLDWIDE
          </motion.div>
          <h1 className="mt-3 text-[36px] sm:text-[54px] font-[620] tracking-[-0.04em] leading-[0.95] text-[var(--foreground)]">Radio.<br className="sm:hidden" /> Everywhere.</h1>
          <p className="mt-4 max-w-[480px] mx-auto text-[15px] sm:text-[16px] leading-[1.6] text-[var(--muted-foreground)] font-normal">Any station, any country. Just press play.</p>
          <AnimatePresence>
            {dataSaver && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 inline-flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] text-xs font-medium px-3 py-1.5"><span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" /> Data Saver</motion.div>}
          </AnimatePresence>
          {(preferSelfHost || icecastFallback) && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-[var(--muted-foreground)]">
              {preferSelfHost && <span className="inline-flex items-center gap-1 border border-[var(--border)] bg-[var(--muted)] px-2 py-1">Mirror: {getSelfHost() || "not configured"} {getSelfHost() ? "· active" : ""}</span>}
              {icecastFallback && <span className="inline-flex items-center gap-1 border border-[var(--border)] bg-[var(--muted)] px-2 py-1">Icecast fallback ON</span>}
            </div>
          )}
        </div>
      </motion.div>

      {/* controls — Apple clean, minimal */}
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-6 mt-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-2">
          <div className="flex items-center bg-[var(--muted)]/60 p-1 gap-1 shrink-0 liquid">
            {tabs.map(([k,label])=>(
              <motion.button key={k} whileTap={{ scale: 0.96 }} onClick={()=>setTab(k)} className={`px-4 py-1.5 text-[13px] font-medium whitespace-nowrap shrink-0 rounded-none border transition-colors pressable ${tab===k?"bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]":"bg-transparent text-[var(--muted-foreground)] border-transparent hover:text-[var(--foreground)]"}`}>{label}</motion.button>
            ))}
          </div>
          <div className="hidden sm:flex ml-auto items-center gap-2 shrink-0">
            <select value={country} onChange={e=>setCountry(e.target.value)} className="h-9 bg-[var(--card)] border border-[var(--border)] px-3 text-sm text-[var(--foreground)] rounded-none focus:outline-none">
              <option value="">All Countries — A to Z</option>
              {countries.map(c=> <option key={c.iso_3166_1} value={c.iso_3166_1}>{c.name} ({c.stationcount})</option>)}
              {!countries.length && COUNTRIES_FALLBACK.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={tag} onChange={e=>setTag(e.target.value)} className="h-9 bg-[var(--card)] border border-[var(--border)] px-3 text-sm text-[var(--foreground)] rounded-none focus:outline-none">
              <option value="">All Genres</option>
              {tags.map(t=> <option key={t.name} value={t.name}>{t.name} ({t.stationcount})</option>)}
            </select>
            {(country||tag||activeSearch) && <button onClick={clear} className="h-9 bg-[var(--foreground)] text-[var(--background)] px-4 text-sm font-medium rounded-none hover:opacity-80 transition-opacity">Clear</button>}
          </div>
        </div>

        <div className="sm:hidden flex gap-2 mt-2">
          <select value={country} onChange={e=>setCountry(e.target.value)} className="h-10 flex-1 min-w-0 bg-[var(--card)] border border-[var(--border)] px-2.5 text-[13px] text-[var(--foreground)] rounded-none">
            <option value="">All Countries — A to Z</option>
            {countries.map(c=> <option key={c.iso_3166_1} value={c.iso_3166_1}>{c.name}</option>)}
            {!countries.length && COUNTRIES_FALLBACK.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={tag} onChange={e=>setTag(e.target.value)} className="h-10 flex-1 min-w-0 bg-[var(--card)] border border-[var(--border)] px-2.5 text-[13px] text-[var(--foreground)] rounded-none">
            <option value="">All Genres</option>
            {tags.map(t=> <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
          {(country||tag||activeSearch) && <button onClick={clear} className="h-10 bg-[var(--foreground)] text-[var(--background)] px-4 text-sm font-medium rounded-none shrink-0">Clear</button>}
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
          {tags.slice(0,10).map((t,i)=>(
            <motion.button key={t.name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} whileTap={{ scale: 0.96 }} onClick={()=>setTag(tag===t.name?"":t.name)} className={`shrink-0 px-3 py-1.5 text-xs font-medium border rounded-none capitalize transition-colors pressable ${tag===t.name?"bg-[#ff3b30] border-[#ff3b30] text-white":"bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]"}`}>{t.name}</motion.button>
          ))}
        </div>

        {activeSearch && (
          <div className="mt-3 bg-[var(--card)] border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--muted-foreground)] flex items-center justify-between gap-2">
            <span className="truncate">Search <b className="text-[var(--foreground)]">&quot;{activeSearch}&quot;</b> — {displayed.length} results</span>
            <button onClick={clear} className="text-xs font-medium underline underline-offset-4 shrink-0 text-[var(--foreground)] rounded-none">Clear</button>
          </div>
        )}
      </div>

      <main className="mx-auto w-full max-w-5xl px-5 sm:px-6 mt-6 flex-1">
        {loading && stations.length===0 && tab!=="favorites" && tab!=="recent" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({length:6}).map((_,i)=><SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="border border-[#ff3b30]/20 bg-[#ff3b30]/5 p-6 text-center">
            <p className="text-[#ff3b30] font-medium text-sm">{error}</p>
            <button onClick={()=>fetchStations(true)} className="mt-3 bg-[var(--foreground)] text-[var(--background)] px-5 py-2 text-sm font-medium rounded-none">Retry</button>
          </div>
        ) : displayed.length===0 ? (
          <div className="border border-[var(--border)] bg-[var(--card)] p-8 sm:p-10 text-center">
            <div className="h-12 w-12 mx-auto grid place-items-center bg-[var(--muted)] border border-[var(--border)] text-lg">📻</div>
            <h3 className="font-semibold mt-3 text-[15px] text-[var(--foreground)]">{tab==="favorites"?"No favourites yet":tab==="recent"?"No recent":"No stations found"}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1 font-normal">{tab==="favorites"?"Tap ♥ to save stations for quick access.":"Try another search or filter."}</p>
            {(country||tag||activeSearch) && <button onClick={clear} className="mt-4 bg-[var(--foreground)] text-[var(--background)] px-5 py-2.5 text-sm font-medium rounded-none">Clear filters</button>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {displayed.map(s=> <StationCard key={s.stationuuid} station={s} onPlay={()=>setQueue(displayed)} />)}
            </div>
            {tab!=="favorites" && tab!=="recent" && (
              <div className="flex justify-center py-8">
                <button onClick={()=>fetchStations(false)} disabled={loading} className="w-full sm:w-auto bg-[var(--foreground)] text-[var(--background)] px-8 py-3 text-sm font-medium rounded-none hover:opacity-80 disabled:opacity-50 transition-opacity">{loading?"Loading…":`Load ${effectiveLimit} more`}</button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[var(--border)] mt-8 bg-[var(--card)] pb-[76px]">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted-foreground)] font-normal">
          <span>Radiobeast · Radio Browser API</span>
          <span className="flex gap-2 items-center text-[11px] tracking-wide">MP3 · AAC · HLS {current && <span className="border border-[var(--border)] px-2 py-1 text-[var(--muted-foreground)] truncate max-w-[150px]">{current.name}</span>}</span>
        </div>
      </footer>
    </div>
  );
}
