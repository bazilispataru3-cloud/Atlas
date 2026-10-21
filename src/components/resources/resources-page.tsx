"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Crown, Heart, MessageCircleQuestion, Play, Search, SearchX, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import type { Resource, SubjectId } from "@/lib/types";
import { getTopicRef, SUBJECTS } from "@/data/syllabus";
import { Button, EmptyState, Label, Meridian, Notice, PageHeader, Segmented, Select, Sheet, Skeleton, Switch, buttonClasses } from "@/components/ui/primitives";
import { useIntegrations } from "@/lib/ai-client";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { useHydrated, useReducedMotion, useTopicStates } from "@/lib/hooks";
import { STATUS_LABEL } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { ResourceCard } from "./resource-card";
import { PremiumFab } from "./premium-fab";
import {
  DEFAULT_FILTERS,
  FREE,
  LANG_LABEL,
  LEVEL_LABEL,
  PREMIUM,
  SECTIONS,
  VERIFIED_ON,
  activeFilterCount,
  availableLanguages,
  featuredFor,
  filterCatalog,
  formatDay,
  groupOf,
  scoreResource,
  type Filters,
  type KindFilter,
  type KindGroup,
  type LangFilter,
  type LevelFilter,
} from "./catalog";

interface LiveResult {
  query: string;
  translated?: boolean;
  youtube: { status: "ok" | "not_configured" | "error"; items: Resource[]; message?: string; cached?: boolean };
  web: { status: "ok" | "not_configured" | "error"; items: Resource[]; message?: string; cached?: boolean };
}

const LANGS = availableLanguages();
const KIND_COUNTS = Object.fromEntries(SECTIONS.map((s) => [s.id, FREE.filter((r) => groupOf(r) === s.id).length])) as Record<KindGroup, number>;
const SUBJECT_OPTIONS = [
  {
    value: "tutte" as const,
    label: (
      <>
        <span className="xl:hidden">Tutte</span>
        <span className="hidden xl:inline">Tutte le materie</span>
      </>
    ),
  },
  ...SUBJECTS.map((s) => ({ value: s.id, label: s.id === "chimica" ? "Chimica" : s.name })),
];
const FEMININE: Record<string, boolean> = { videolezione: true, piattaforma: true, corso: false, libro: false };

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** A limited grid: three cards on phones, six from `sm`, all of them after "Mostra tutte". */
function ResourceGrid({ id, items, allLabel, showKind = true }: { id: string; items: Resource[]; allLabel: string; showKind?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const MOBILE = 3;
  const LIMIT = 6;
  return (
    <>
      <ul ref={ref} id={`${id}-list`} className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {items.map((r, i) => (
          <li key={r.id} className={cn(!expanded && i >= MOBILE && "hidden", !expanded && i >= MOBILE && i < LIMIT && "sm:block")}>
            <ResourceCard r={r} showKind={showKind} />
          </li>
        ))}
      </ul>
      {items.length > MOBILE && (
        <div className={cn("mt-5 flex justify-center", items.length <= LIMIT && "sm:hidden")}>
          <Button
            variant="outline"
            aria-expanded={expanded}
            aria-controls={`${id}-list`}
            onClick={() => {
              const collapsing = expanded;
              setExpanded(!expanded);
              const top = ref.current?.getBoundingClientRect().top ?? 0;
              if (collapsing && top < 0) ref.current?.parentElement?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
            }}
          >
            {expanded ? "Mostra meno" : allLabel}
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
          </Button>
        </div>
      )}
    </>
  );
}

export function ResourcesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const topicParam = params.get("topic");
  const integrations = useIntegrations();
  const hydrated = useHydrated();
  const favoritesRaw = useAtlas((s) => s.favorites);
  const favorites = useMemo(() => (hydrated ? favoritesRaw : []), [hydrated, favoritesRaw]);
  const states = useTopicStates();
  const openStartStudy = useUI((s) => s.openStartStudy);
  const openProfessor = useUI((s) => s.openProfessor);

  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 200);
  const [topicId, setTopicId] = useState<string | undefined>(topicParam && getTopicRef(topicParam) ? topicParam : undefined);
  const [subject, setSubject] = useState<SubjectId | "tutte">(DEFAULT_FILTERS.subject);
  const [kind, setKind] = useState<KindFilter>(DEFAULT_FILTERS.kind);
  const [lang, setLang] = useState<LangFilter>(DEFAULT_FILTERS.lang);
  const [level, setLevel] = useState<LevelFilter>(DEFAULT_FILTERS.level);
  const [onlyFav, setOnlyFav] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumFocus, setPremiumFocus] = useState<string[]>([]);
  const [useWeb, setUseWeb] = useState(false);
  const [live, setLive] = useState<LiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  // A link from a topic page while this page is open (?topic= changes).
  useEffect(() => {
    if (topicParam && getTopicRef(topicParam)) setTopicId(topicParam);
  }, [topicParam]);

  const topicRef = topicId ? getTopicRef(topicId) : undefined;
  const liveAvailable = !!integrations && (integrations.youtube || integrations.webSearch);

  const filters: Filters = { query: debounced, topicId, subject, kind, lang, level, onlyFav };
  const nFilters = activeFilterCount(filters);
  const searching = !!debounced.trim() || !!topicId;
  const results = useMemo(
    () => filterCatalog(FREE, { query: debounced, topicId, subject, kind, lang, level, onlyFav }, favorites),
    [debounced, topicId, subject, kind, lang, level, onlyFav, favorites],
  );

  const premiumMatches = useMemo(
    () => (searching ? PREMIUM.filter((r) => (!topicId || r.topicTags.includes(topicId)) && scoreResource(r, debounced) > 0 && (!!debounced.trim() || !!topicId)) : []),
    [searching, topicId, debounced],
  );

  // "Per il tuo prossimo argomento": the first topic to consolidate, then in progress, then new.
  const next = !hydrated ? undefined : (states.find((s) => s.status === "da-consolidare") ?? states.find((s) => s.status === "in-corso") ?? states.find((s) => s.status === "nuovo"));
  const showFeatured = !searching && nFilters === 0;
  const featured = useMemo(() => (showFeatured && next ? featuredFor(next.ref.topic.id) : []), [showFeatured, next]);
  const featuredIds = new Set(featured.map((r) => r.id));
  const topicCount = next ? FREE.filter((r) => r.topicTags.includes(next.ref.topic.id)).length : 0;

  const sections = SECTIONS.filter((s) => kind === "tutti" || s.id === kind)
    .map((s) => ({ ...s, items: results.filter((r) => groupOf(r) === s.id && !featuredIds.has(r.id)) }))
    .filter((s) => s.items.length);

  const runLive = async (q: string) => {
    if (q.trim().length < 2 || !liveAvailable) return;
    setLoading(true);
    setError(null);
    const langs = lang === "tutte" ? ["it", "en"] : [lang];
    const sp = new URLSearchParams({ q, langs: langs.join(","), web: useWeb ? "1" : "0" });
    if (topicId) sp.set("topicId", topicId);
    try {
      const res = await fetch(`/api/resources/search?${sp}`);
      const json = await res.json();
      if (!res.ok) setError(res.status === 429 ? json.message : "La ricerca su YouTube non è riuscita. Riprova tra qualche minuto.");
      else setLive(json);
    } catch {
      setError("Connessione non disponibile. Controlla la rete e riprova.");
    }
    setLoading(false);
  };

  const clearQuery = () => {
    setQuery("");
    setLive(null);
    setError(null);
    inputRef.current?.focus();
  };
  const clearTopic = () => {
    setTopicId(undefined);
    router.replace("/risorse", { scroll: false });
  };
  const resetFilters = () => {
    setSubject(DEFAULT_FILTERS.subject);
    setKind(DEFAULT_FILTERS.kind);
    setLang(DEFAULT_FILTERS.lang);
    setLevel(DEFAULT_FILTERS.level);
    setOnlyFav(false);
  };
  const resetAll = () => {
    resetFilters();
    setQuery("");
    setLive(null);
    if (topicId) clearTopic();
    inputRef.current?.focus();
  };
  const openPremium = (focus: string[] = []) => {
    setPremiumFocus(focus);
    setPremiumOpen(true);
  };
  const showAllForTopic = (id: string) => {
    setTopicId(id);
    router.replace(`/risorse?topic=${id}`, { scroll: false });
    requestAnimationFrame(() => statusRef.current?.focus({ preventScroll: false }));
  };

  const liveItems = [...(live?.youtube.items ?? []), ...(live?.web.items ?? [])];
  const q = debounced.trim();
  const count = results.length;
  const nounFor = (n: number) => (n === 1 ? "risorsa gratuita" : "risorse gratuite");
  const summary = !searching && nFilters === 0 ? `${count} ${nounFor(count)} nel catalogo` : `${count} ${nounFor(count)}${q ? ` per «${q}»` : ""}${topicRef ? ` su ${topicRef.topic.title}` : ""}${nFilters ? " con i filtri scelti" : ""}`;
  const pct = next ? Math.round(next.mastery * 100) : 0;

  const kindSelect = (id: string, cls?: string) => (
    <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as KindFilter)} className={cls} aria-label={cls ? "Tipo di risorsa" : undefined}>
      <option value="tutti">Tutti i tipi</option>
      {SECTIONS.map((s) => (
        <option key={s.id} value={s.id}>
          {s.title} ({KIND_COUNTS[s.id]})
        </option>
      ))}
    </Select>
  );
  const langSelect = (id: string, cls?: string) => (
    <Select id={id} value={lang} onChange={(e) => setLang(e.target.value as LangFilter)} className={cls} aria-label={cls ? "Lingua" : undefined}>
      <option value="tutte">Tutte le lingue</option>
      {LANGS.map((l) => (
        <option key={l.id} value={l.id}>
          {LANG_LABEL[l.id]} ({l.count})
        </option>
      ))}
    </Select>
  );
  const levelSelect = (id: string, cls?: string) => (
    <Select id={id} value={level} onChange={(e) => setLevel(e.target.value as LevelFilter)} className={cls} aria-label={cls ? "Livello" : undefined}>
      <option value="tutti">Tutti i livelli</option>
      {(Object.keys(LEVEL_LABEL) as Resource["level"][]).map((l) => (
        <option key={l} value={l}>
          {LEVEL_LABEL[l]}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="pb-32 lg:pb-16 lg:pr-16 min-[1600px]:pr-0">
      <PageHeader
        title="Corsi, videolezioni e manuali gratuiti"
        description="Da MIT, Yale, OpenStax, Khan Academy, Federica e altri atenei, collegati agli argomenti del semestre filtro."
        actions={
          <Button
            id="premium-header-button"
            variant="outline"
            onClick={() => openPremium()}
            aria-haspopup="dialog"
            className="border-gold-400/40 text-gold-200 hover:border-gold-300/70 hover:bg-gold-500/[0.08]"
          >
            <Crown className="h-4 w-4 text-gold-300" aria-hidden />
            Risorse premium
            <span className="rounded-md bg-gold-500/[0.14] px-1.5 text-xs tabular-nums text-gold-200">{PREMIUM.length}</span>
          </Button>
        }
      />

      {/* Summary before the detail: what is in the catalogue, with a jump to each section. */}
      <p className="mt-4 flex max-w-[75ch] gap-2 text-sm leading-relaxed text-fg-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-azure-300" aria-hidden />
        <span>
          {FREE.length} risorse gratuite:{" "}
          {SECTIONS.map((s, i) => (
            <span key={s.id}>
              <a href={`#sez-${s.id}`} className="text-fg underline decoration-white/25 underline-offset-[3px] transition-colors hover:decoration-azure-300">
                {KIND_COUNTS[s.id]} {KIND_COUNTS[s.id] === 1 ? s.noun[0] : s.noun[1]}
              </a>
              {i < SECTIONS.length - 2 ? ", " : i === SECTIONS.length - 2 ? " e " : ""}
            </span>
          ))}
          . Ogni link è stato aperto e verificato il {formatDay(VERIFIED_ON)}.
        </span>
      </p>

      {/* Search and filters */}
      <form
        role="search"
        aria-label="Catalogo delle risorse"
        className="mt-7"
        onSubmit={(e) => {
          e.preventDefault();
          // Phones and tablets: close the on-screen keyboard by moving focus to the result summary (never to <body>).
          if (window.matchMedia("(max-width: 1023px)").matches) statusRef.current?.focus();
          if (liveAvailable) runLive(query);
        }}
      >
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="res-q" className="sr-only">
              Cerca nel catalogo
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              ref={inputRef}
              id="res-q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  clearQuery();
                }
              }}
              placeholder="Cerca un argomento, un corso o un docente"
              className="h-12 w-full rounded-control border border-white/[0.1] bg-white/[0.03] pl-11 pr-12 text-base text-fg transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-fg-subtle hover:border-white/[0.16] focus:border-azure-400/70 focus:bg-white/[0.05] focus:outline-none focus:ring-[3px] focus:ring-azure-500/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={clearQuery}
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
                aria-label="Cancella ricerca"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          {liveAvailable && (
            <Button type="submit" variant="secondary" size="lg" loading={loading} className="hidden sm:inline-flex" disabled={query.trim().length < 2}>
              Cerca su YouTube
            </Button>
          )}
          <Button type="button" variant="secondary" size="lg" className="px-4 xl:hidden" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Filtri</span>
            <span className="sr-only sm:hidden">Filtri</span>
            {nFilters - (subject !== "tutte" ? 1 : 0) > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-azure-500 px-1 text-xs font-semibold tabular-nums text-white">
                {nFilters - (subject !== "tutte" ? 1 : 0)}
                <span className="sr-only"> attivi</span>
              </span>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Segmented ariaLabel="Materia" value={subject} onChange={setSubject} options={SUBJECT_OPTIONS} />
          <div className="hidden xl:contents">
            {kindSelect("res-kind", "h-10 w-auto")}
            {langSelect("res-lang", "h-10 w-auto")}
            {levelSelect("res-level", "h-10 w-auto")}
            <button
              type="button"
              onClick={() => setOnlyFav((v) => !v)}
              aria-pressed={onlyFav}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-control border px-3.5 text-sm font-medium transition-colors duration-150",
                onlyFav ? "border-rose-400/40 bg-rose-500/[0.1] text-rose-200" : "border-white/[0.1] text-fg-muted hover:border-white/[0.16] hover:text-fg",
              )}
            >
              <Heart className={cn("h-4 w-4", onlyFav && "fill-current")} aria-hidden />
              Preferiti
              {favorites.length > 0 && <span className="tabular-nums text-fg-subtle">{favorites.length}</span>}
            </button>
          </div>
          {liveAvailable && integrations?.webSearch && (
            <label className="ml-auto inline-flex min-h-10 items-center gap-2.5 text-sm text-fg-muted">
              <Switch checked={useWeb} onChange={setUseWeb} label="Includi fonti accademiche dal web" />
              <span aria-hidden>Includi fonti accademiche dal web</span>
            </label>
          )}
        </div>
      </form>

      {/* What the list below shows (announced while filtering). */}
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", (searching || nFilters > 0) && "mt-5 min-h-9")}>
        {topicRef && (
          <span className="inline-flex h-9 max-w-full items-center gap-1 rounded-full border border-azure-400/30 bg-azure-500/[0.08] pl-3.5 pr-1 text-sm text-azure-100">
            <span className="truncate">Argomento: {topicRef.topic.title}</span>
            <button
              type="button"
              onClick={() => {
                clearTopic();
                inputRef.current?.focus();
              }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-azure-200 transition-colors hover:bg-azure-500/20 hover:text-white"
              aria-label="Rimuovi il filtro per argomento"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        )}
        <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={cn("text-sm text-fg-muted outline-none", !searching && nFilters === 0 && "sr-only")}>
          {summary}
        </p>
        {(searching || nFilters > 0) && (
          <button type="button" onClick={resetAll} className="inline-flex min-h-9 items-center rounded-md px-1 text-sm font-medium text-azure-300 underline decoration-azure-300/40 underline-offset-4 hover:decoration-azure-200">
            Azzera ricerca e filtri
          </button>
        )}
      </div>

      {error && (
        <Notice tone="warning" live className="mt-4">
          {error}
        </Notice>
      )}

      {/* Live results (only when the server has the YouTube or web search integration). */}
      {live && (liveItems.length > 0 || live.youtube.status === "error" || live.web.status === "error") && (
        <section aria-labelledby="live-title" className="mt-10">
          <h2 id="live-title" className="text-xl font-semibold tracking-[-0.01em] text-fg">
            Da YouTube e dal web per «{live.query}»
          </h2>
          {live.youtube.status === "error" && (
            <Notice tone="warning" className="mt-4">
              La ricerca su YouTube non è disponibile in questo momento. I risultati qui sotto vengono dal catalogo verificato.
            </Notice>
          )}
          {live.web.status === "error" && (
            <Notice tone="warning" className="mt-4">
              La ricerca nelle fonti accademiche non è disponibile in questo momento.
            </Notice>
          )}
          {liveItems.length > 0 && (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {liveItems.map((r) => (
                <li key={r.id}>
                  <ResourceCard r={r} />
                </li>
              ))}
            </ul>
          )}
          {live.translated && liveItems.length > 0 && <p className="mt-3 text-xs text-fg-subtle">I titoli in italiano sono traduzioni automatiche: il titolo originale resta indicato sotto.</p>}
        </section>
      )}

      {/* Feature: the student's next topic. The one bold moment of the page. */}
      {showFeatured && !hydrated && (
        <div className="mt-10 sm:mt-12" aria-hidden>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-3 h-9 w-80 max-w-full" />
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Skeleton className="aspect-video w-full rounded-card" />
            <div className="hidden gap-3 lg:grid">
              <Skeleton className="h-24 rounded-card" />
              <Skeleton className="h-24 rounded-card" />
              <Skeleton className="h-24 rounded-card" />
            </div>
          </div>
        </div>
      )}
      {showFeatured && next && featured.length > 0 && (
        <section aria-labelledby="featured-title" className="mt-10 sm:mt-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-fg-muted">Per il tuo prossimo argomento</p>
              <h2 id="featured-title" className="mt-1 font-display text-[1.75rem] leading-[1.12] tracking-[-0.01em] text-fg sm:text-4xl">
                {next.ref.topic.title}
              </h2>
              <div className="mt-3.5 flex max-w-md items-center gap-3">
                <Meridian value={next.mastery} label={`Padronanza: ${pct}%`} className="min-w-16 flex-1" />
                <span className="shrink-0 text-ui text-fg-muted">
                  {STATUS_LABEL[next.status]}
                  {next.status !== "nuovo" && <span className="tabular-nums">, {pct}%</span>}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => openStartStudy({ topicId: next.ref.topic.id, subject: next.ref.subject.id })} aria-haspopup="dialog">
                <Play className="h-4 w-4" aria-hidden /> Studia l’argomento
              </Button>
              {topicCount > featured.length && (
                <Button variant="ghost" onClick={() => showAllForTopic(next.ref.topic.id)}>
                  Tutte le risorse ({topicCount})
                </Button>
              )}
            </div>
          </div>
          <div className={cn("mt-6 grid gap-4 lg:gap-5", featured.length > 1 && "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]")}>
            <div className={cn(featured.length === 1 && "max-w-2xl")}>
              <ResourceCard r={featured[0]} variant="feature" />
            </div>
            {featured.length > 1 && (
              <ul className="grid content-start gap-3" aria-label="Altre risorse per questo argomento">
                {featured.slice(1).map((r) => (
                  <li key={r.id}>
                    <ResourceCard r={r} variant="row" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Catalogue: sections by kind while browsing, one ranked list while searching. */}
      {searching
        ? count > 0 && (
            <section aria-labelledby="results-title" className="mt-8">
              <h2 id="results-title" className="sr-only">
                Risultati
              </h2>
              <ResourceGrid key={`${q}|${topicId}`} id="risultati" items={results} allLabel={`Mostra tutti i ${count} risultati`} />
            </section>
          )
        : sections.map((s) => (
            <section key={s.id} id={`sez-${s.id}`} aria-labelledby={`sez-${s.id}-t`} className="mt-14 scroll-mt-20">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-white/[0.07] pb-3">
                <h2 id={`sez-${s.id}-t`} className="flex items-baseline gap-2.5 text-xl font-semibold tracking-[-0.01em] text-fg">
                  {s.title}
                  <span className="text-sm font-normal tabular-nums text-fg-subtle">
                    <span className="sr-only">, </span>
                    {s.items.length}
                  </span>
                </h2>
                <p className="text-sm text-fg-muted">{s.description}</p>
              </div>
              <ResourceGrid
                id={`sez-${s.id}`}
                items={s.items}
                showKind={false}
                allLabel={`Mostra ${FEMININE[s.id] ? "tutte le" : "tutti i"} ${s.items.length} ${s.noun[1]}`}
              />
            </section>
          ))}

      {searching && premiumMatches.length > 0 && count > 0 && (
        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
          <Crown className="h-4 w-4 text-gold-300" aria-hidden />
          {premiumMatches.length === 1 ? "Su questo tema c’è anche una risorsa premium." : `Su questo tema ci sono anche ${premiumMatches.length} risorse premium.`}
          <button type="button" onClick={() => openPremium(premiumMatches.map((r) => r.id))} className="inline-flex min-h-9 items-center rounded-md font-medium text-gold-200 underline decoration-gold-400/40 underline-offset-4 hover:decoration-gold-300" aria-haspopup="dialog">
            {premiumMatches.length === 1 ? "Vedila" : "Vedile"}
          </button>
        </p>
      )}

      {hydrated && count === 0 && !liveItems.length && (
        <EmptyState
          className="mt-10"
          icon={<SearchX aria-hidden />}
          title={q ? `Nessuna risorsa gratuita per «${q}»` : topicRef && nFilters === 0 ? "Nessuna risorsa gratuita per questo argomento" : "Nessuna risorsa con questi filtri"}
          description={
            q
              ? "Prova con un termine più generale, controlla l’ortografia o togli i filtri. Puoi anche chiedere consiglio all’AI Professor."
              : "Togli qualche filtro per vedere altre risorse del catalogo."
          }
          action={
            <>
              {q && (
                <Button variant="secondary" onClick={clearQuery}>
                  <X className="h-4 w-4" aria-hidden /> Cancella ricerca
                </Button>
              )}
              {(nFilters > 0 || topicId) && (
                <Button variant="secondary" onClick={() => { resetFilters(); if (topicId) clearTopic(); inputRef.current?.focus(); }}>
                  Azzera filtri
                </Button>
              )}
              {q && (
                <Button variant="ghost" onClick={() => openProfessor({ prompt: `Quali videolezioni o corsi mi consigli per studiare «${q}»?`, topicId })} aria-haspopup="dialog">
                  <MessageCircleQuestion className="h-4 w-4" aria-hidden /> Chiedi all’AI Professor
                </Button>
              )}
              {premiumMatches.length > 0 && (
                <Button variant="ghost" className="text-gold-200 hover:text-gold-100" onClick={() => openPremium(premiumMatches.map((r) => r.id))} aria-haspopup="dialog">
                  <Crown className="h-4 w-4" aria-hidden /> Guarda le risorse premium
                </Button>
              )}
            </>
          }
        />
      )}

      {/* Premium: separate from the free catalogue, one click away. */}
      <section aria-labelledby="premium-banner-title" className="mt-16">
        <button
          type="button"
          onClick={() => openPremium()}
          aria-haspopup="dialog"
          className="group flex w-full flex-col gap-4 rounded-panel border border-gold-400/25 bg-gold-500/[0.035] p-5 text-left transition-[border-color,background-color] duration-200 hover:border-gold-300/45 hover:bg-gold-500/[0.06] sm:flex-row sm:items-center sm:gap-5 sm:p-6"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-gold-400/35 bg-gold-500/[0.1] text-gold-300" aria-hidden>
            <Crown className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span id="premium-banner-title" className="block text-base font-semibold text-gold-200">
              Corsi e manuali a pagamento
            </span>
            <span className="mt-1 block max-w-[62ch] text-sm leading-relaxed text-fg-muted">
              Abbonamenti, corsi di preparazione e manuali per il test, con il prezzo letto sul sito ufficiale. ATLAS non riceve commissioni.
            </span>
          </span>
          <span className={buttonClasses("gold", "md", "shrink-0 self-start sm:self-auto")}>Vedi le {PREMIUM.length} risorse premium</span>
        </button>
      </section>

      <p className="mt-8 max-w-[75ch] text-xs leading-relaxed text-fg-subtle">
        Le copertine sono le anteprime pubblicate da YouTube e le immagini o copertine pubblicate dai siti ufficiali delle risorse; dove non esistono, ATLAS usa illustrazioni originali. I titoli italiani delle risorse in inglese sono traduzioni di ATLAS: il titolo originale è indicato sotto.
      </p>

      {/* Filters on phones, tablets and small laptops. */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtri" side="bottom">
        <div className="space-y-5 px-5 pb-2 pt-5">
          <div>
            <Label htmlFor="res-kind-m">Tipo di risorsa</Label>
            {kindSelect("res-kind-m")}
          </div>
          <div>
            <Label htmlFor="res-lang-m">Lingua</Label>
            {langSelect("res-lang-m")}
          </div>
          <div>
            <Label htmlFor="res-level-m">Livello</Label>
            {levelSelect("res-level-m")}
          </div>
          <div className="flex min-h-11 items-center justify-between gap-4">
            <span className="text-sm text-fg" aria-hidden>
              Solo i preferiti {favorites.length > 0 && <span className="tabular-nums text-fg-subtle">({favorites.length})</span>}
            </span>
            <Switch checked={onlyFav} onChange={setOnlyFav} label="Solo i preferiti" />
          </div>
        </div>
        <div className="sticky bottom-0 mt-4 flex gap-2 border-t border-white/[0.07] bg-ink-850 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <Button variant="ghost" onClick={resetFilters} disabled={nFilters === 0}>
            Azzera
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => setFiltersOpen(false)}>
            Mostra {count} {count === 1 ? "risorsa" : "risorse"}
          </Button>
        </div>
      </Sheet>

      <PremiumFab open={premiumOpen} onOpenChange={setPremiumOpen} focusIds={premiumFocus} hideWhileVisible="premium-header-button" />
    </div>
  );
}
