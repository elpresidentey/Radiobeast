"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Station, getStations, isGenreTagName } from "@/lib/radio";
import { GENRES } from "@/lib/genres";
import { usePlayerStore } from "@/stores/playerStore";
import { GroupCard } from "@/components/CuratedGroups";

type Interest = {
  key: string;
  kind: "genre" | "country" | "language";
  value: string;
  label: string;
  emoji?: string;
  color?: string;
  pinned: boolean;
};

const MAX_ROWS = 4;

function flag(code: string) {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function genreMeta(tag: string) {
  return GENRES.find((g) => g.tag === tag);
}

// Weighted taste profile: recently played stations count more than older ones
function useTaste() {
  const recent = usePlayerStore((s) => s.recent);
  return useMemo(() => {
    const tagScore = new Map<string, number>();
    const countryScore = new Map<string, number>();
    const langScore = new Map<string, number>();
    const countryNames = new Map<string, string>();
    recent.forEach((s, i) => {
      const w = Math.max(1, recent.length - i);
      if (s.countrycode && s.country) countryNames.set(s.countrycode, s.country);
      s.tags.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t && isGenreTagName(t)).slice(0, 4)
        .forEach((n) => tagScore.set(n, (tagScore.get(n) || 0) + w));
      if (s.countrycode) countryScore.set(s.countrycode, (countryScore.get(s.countrycode) || 0) + w);
      if (s.language) {
        s.language.split(",").map((l) => l.trim()).filter(Boolean).slice(0, 2)
          .forEach((l) => langScore.set(l, (langScore.get(l) || 0) + w));
      }
    });
    const top = (m: Map<string, number>, n: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
    return {
      tags: top(tagScore, 3),
      countries: top(countryScore, 2),
      langs: top(langScore, 2),
      countryNames,
    };
  }, [recent]);
}

function PinChip({
  label,
  pinned,
  onToggle,
}: {
  label: string;
  pinned: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={pinned}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold pressable transition-colors ${
        pinned
          ? "text-white"
          : "bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)]"
      }`}
      style={pinned ? { backgroundColor: "var(--foreground)", borderColor: "var(--foreground)" } : undefined}
    >
      {pinned ? "📌 " : ""}{label}
    </button>
  );
}

export function ForYou() {
  const {
    recent, pinnedGenres, pinnedCountries, pinnedLanguages,
    togglePinnedGenre, togglePinnedCountry, togglePinnedLanguage,
    play, setQueue, preferSelfHost,
  } = usePlayerStore();
  const taste = useTaste();
  const [rows, setRows] = useState<Map<string, Station[]>>(new Map());
  const [rowsKey, setRowsKey] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  // Pinned rows first, then rows learned from listening history fill the rest
  const interests: Interest[] = useMemo(() => {
    const out: Interest[] = [];
    pinnedGenres.forEach((tag) => {
      const g = genreMeta(tag);
      out.push({ key: `genre:${tag}`, kind: "genre", value: tag, label: g?.label || tag, emoji: g?.emoji || "🎵", color: g?.color, pinned: true });
    });
    pinnedCountries.forEach((code) => {
      out.push({ key: `country:${code}`, kind: "country", value: code, label: taste.countryNames.get(code) || code, pinned: true });
    });
    pinnedLanguages.forEach((lang) => {
      out.push({ key: `language:${lang}`, kind: "language", value: lang, label: lang, pinned: true });
    });
    for (const tag of taste.tags) {
      if (out.length >= MAX_ROWS) break;
      if (out.some((o) => o.value === tag && o.kind === "genre")) continue;
      const g = genreMeta(tag);
      out.push({ key: `learn:genre:${tag}`, kind: "genre", value: tag, label: g?.label || tag, emoji: g?.emoji || "🎵", color: g?.color, pinned: false });
    }
    for (const code of taste.countries) {
      if (out.length >= MAX_ROWS) break;
      if (out.some((o) => o.value === code && o.kind === "country")) continue;
      out.push({ key: `learn:country:${code}`, kind: "country", value: code, label: taste.countryNames.get(code) || code, pinned: false });
    }
    return out.slice(0, MAX_ROWS);
  }, [pinnedGenres, pinnedCountries, pinnedLanguages, taste]);

  // Refetch only when the row mix actually changes — recent updates on every
  // play, so keying the effect on the interest list identity would refetch endlessly
  const interestsKey = interests.map((i) => i.key).join("|");
  const loading = rowsKey !== interestsKey;

  useEffect(() => {
    if (!interests.length) return;
    let cancelled = false;
    const opts = { preferSelfHost };
    (async () => {
      const results = await Promise.allSettled(
        interests.map((it) =>
          it.kind === "genre"
            ? getStations({ tag: it.value, limit: 10, order: "votes", reverse: true }, opts)
            : it.kind === "country"
              ? getStations({ countrycode: it.value, limit: 10, order: "clickcount", reverse: true }, opts)
              : getStations({ language: it.value, limit: 10, order: "clickcount", reverse: true }, opts)
        )
      );
      if (cancelled) return;
      const seen = new Set<string>();
      const map = new Map<string, Station[]>();
      results.forEach((r, i) => {
        if (r.status !== "fulfilled") return;
        const uniq = r.value.filter((s) => !seen.has(s.stationuuid)).slice(0, 8);
        uniq.forEach((s) => seen.add(s.stationuuid));
        if (uniq.length) map.set(interests[i].key, uniq);
      });
      setRows(map);
      setRowsKey(interestsKey);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestsKey, preferSelfHost]);

  const totalPins = pinnedGenres.length + pinnedCountries.length + pinnedLanguages.length;
  const hasAnyData = totalPins > 0 || recent.length > 0;
  const showEditor = editorOpen || !hasAnyData;
  const jumpBack = recent.slice(0, 8);

  const rowTitle = (it: Interest) => {
    if (it.kind === "country") return `${it.pinned ? "Pinned" : "Because you tune in"} — ${it.label}`;
    if (it.kind === "language") return `${it.pinned ? "Pinned" : "Because you listen"} — ${it.label}`;
    return it.pinned ? `Pinned — ${it.label}` : `Because you like ${it.label}`;
  };

  const subtitle = !hasAnyData
    ? "Pin favourites and this becomes your front page."
    : totalPins
      ? `${totalPins} pinned · always here for you`
      : "Learned from what you play — pin to lock it in.";

  return (
    <section aria-label="For you" className="scroll-mt-[120px] sm:scroll-mt-24">
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[15px] sm:text-base font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <span aria-hidden="true">✨</span> For You
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>
        </div>
        {hasAnyData && (
          <button
            onClick={() => setEditorOpen((v) => !v)}
            aria-expanded={editorOpen}
            className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors pressable"
          >
            {editorOpen ? "Done" : "Tune your mix →"}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showEditor && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-3 mb-4">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">PIN GENRES</div>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => (
                    <PinChip
                      key={g.tag}
                      label={g.label}
                      pinned={pinnedGenres.includes(g.tag)}
                      onToggle={() => togglePinnedGenre(g.tag)}
                    />
                  ))}
                </div>
              </div>
              {(taste.countries.length > 0 || pinnedCountries.length > 0) && (
                <div>
                  <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">COUNTRIES</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set([...pinnedCountries, ...taste.countries])].map((code) => (
                      <PinChip
                        key={code}
                        label={`${flag(code)} ${taste.countryNames.get(code) || code}`}
                        pinned={pinnedCountries.includes(code)}
                        onToggle={() => togglePinnedCountry(code)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {(taste.langs.length > 0 || pinnedLanguages.length > 0) && (
                <div>
                  <div className="text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] mb-2">LANGUAGES</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set([...pinnedLanguages, ...taste.langs])].map((lang) => (
                      <PinChip
                        key={lang}
                        label={lang}
                        pinned={pinnedLanguages.includes(lang)}
                        onToggle={() => togglePinnedLanguage(lang)}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                Pinned rows always show up here. We also learn from what you play — no account needed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {jumpBack.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-7 w-7 rounded-lg grid place-items-center text-sm bg-[var(--muted)] border border-[var(--border)]">🕒</div>
            <h3 className="text-[14px] font-bold tracking-tight text-[var(--foreground)]">Jump back in</h3>
            <span className="text-[10px] font-bold text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-md">{jumpBack.length} recent</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-2">
            {jumpBack.map((s) => (
              <motion.div
                key={s.stationuuid}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0"
              >
                <GroupCard station={s} onPlay={() => { setQueue(jumpBack); play(s); }} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {interests.map((it) => {
        const stations = rows.get(it.key) || [];
        return (
          <div key={it.key} className="mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-lg grid place-items-center text-sm bg-[var(--muted)] border border-[var(--border)]" aria-hidden="true">
                {it.kind === "country" ? flag(it.value) : "🎵"}
              </div>
              <h3 className="text-[14px] font-bold tracking-tight text-[var(--foreground)] capitalize">{rowTitle(it)}</h3>
              {stations.length > 0 && (
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-md">{stations.length} live</span>
              )}
            </div>
            {stations.length ? (
              <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-1 px-1 pb-2">
                {stations.map((s) => (
                  <motion.div
                    key={s.stationuuid}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-shrink-0"
                  >
                    <GroupCard station={s} onPlay={() => { setQueue(stations); play(s); }} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-hidden">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[68px] w-[230px] sm:w-[270px] shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] skeleton" />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
