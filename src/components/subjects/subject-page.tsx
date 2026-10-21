"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronDown, ExternalLink, Play, Search, SlidersHorizontal, Target, X } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { getSubject, SYLLABUS_SOURCE } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { questionsFor } from "@/data/questions";
import { Badge, Button, EmptyState, Input, Meridian, ProgressBar, Segmented, Sheet, Skeleton, Switch } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { StatusBadge } from "@/components/ui/status";
import { useHydrated, useTopicStates, type TopicState } from "@/lib/hooks";
import { programMastery } from "@/lib/insights";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { STATUS_LABEL, type TopicStatus } from "@/lib/progress";
import { norm, searchTopics } from "@/lib/search";
import { cn, fmt, pluralize } from "@/lib/utils";
import { AdvancedBadge, cfu, nextOf, StatusCounts, StatusDot, SUBJECT_ICONS } from "./shared";

type Filter = "tutti" | TopicStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "tutti", label: "Tutti" },
  { value: "nuovo", label: "Da iniziare" },
  { value: "in-corso", label: "In studio" },
  { value: "da-consolidare", label: "Da consolidare" },
  { value: "consolidato", label: "Consolidati" },
];

/**
 * Keeps anchors and keyboard focus clear of the top bar and of the sticky
 * filter bar (WCAG 2.4.11), whatever height the bar wraps to.
 */
function useStickyClearance(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = document.documentElement;
    const prev = html.style.scrollPaddingTop;
    const apply = () => {
      const top = parseFloat(getComputedStyle(el).top) || 56;
      html.style.scrollPaddingTop = `${Math.round(top + el.offsetHeight + 16)}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    // Unit links from the overview (/materie/chimica#chim-u4) land below the bar.
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    return () => {
      ro.disconnect();
      html.style.scrollPaddingTop = prev;
    };
  }, [ref]);
}

function UnitIndex({ subjectId, states, hydrated }: { subjectId: SubjectId; states: TopicState[]; hydrated: boolean }) {
  const subject = getSubject(subjectId)!;
  return (
    <ol className="grid gap-x-6 sm:grid-cols-2">
      {subject.units.map((u) => {
        const ul = states.filter((x) => x.ref.unit.id === u.id);
        const um = ul.reduce((a, x) => a + x.mastery, 0) / Math.max(1, ul.length);
        return (
          <li key={u.id} className="border-b border-white/[0.06]">
            <a href={`#${u.id}`} className="group flex items-baseline gap-3 rounded-lg px-1 py-2.5 text-sm transition-colors hover:bg-white/[0.03]">
              <span className="w-4 shrink-0 text-ui tabular-nums text-fg-subtle">{u.number}</span>
              <span className="min-w-0 flex-1 text-fg-reading group-hover:text-fg">{u.title}</span>
              <span className="shrink-0 text-ui tabular-nums text-fg-subtle">{hydrated ? fmt.percent(um) : ""}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function SubjectPage({ subjectId }: { subjectId: SubjectId }) {
  const subject = getSubject(subjectId)!;
  const hydrated = useHydrated();
  const raw = useTopicStates(subjectId);
  const states: TopicState[] = useMemo(() => (hydrated ? raw : raw.map((s) => ({ ...s, mastery: 0, status: "nuovo" as const }))), [hydrated, raw]);
  const byId = useMemo(() => new Map(states.map((s) => [s.ref.topic.id, s])), [states]);
  const progress = useAtlas((s) => s.progress);
  const openStartStudy = useUI((s) => s.openStartStudy);
  const [filter, setFilter] = useState<Filter>("tutti");
  const [q, setQ] = useState("");
  const [onlyLessons, setOnlyLessons] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useStickyClearance(barRef);

  const tone = SUBJECT_TONE[subjectId];
  const Icon = SUBJECT_ICONS[subjectId];
  const mastery = programMastery(states).bySubject[subjectId];
  const next = nextOf(states);
  const lessons = states.filter((x) => hasLesson(x.ref.topic.id)).length;
  const quizCount = useMemo(() => new Map(states.map((s) => [s.ref.topic.id, questionsFor({ topicIds: [s.ref.topic.id] }).length])), [states]);
  const countOf = (f: Filter) => (f === "tutti" ? states.length : states.filter((s) => s.status === f).length);

  const query = norm(q);
  const visible = (topicId: string, title: string, text: string) => {
    const st = byId.get(topicId);
    if (filter !== "tutti" && st?.status !== filter) return false;
    if (onlyLessons && !hasLesson(topicId)) return false;
    if (query) return norm(title).includes(query) || norm(text).includes(query);
    return true;
  };
  const shown = states.filter((s) => visible(s.ref.topic.id, s.ref.topic.title, s.ref.topic.syllabusText)).length;
  const activeFilters = (filter !== "tutti" ? 1 : 0) + (onlyLessons ? 1 : 0);
  const elsewhere = shown === 0 && query ? searchTopics(q, 6).filter((r) => r.ref.subject.id !== subjectId) : [];

  const reset = () => {
    setFilter("tutti");
    setOnlyLessons(false);
    setQ("");
    searchRef.current?.focus();
  };

  return (
    <div className="pb-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:gap-10">
        <header className="min-w-0">
          <Link href="/materie" className="inline-flex min-h-6 items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Le mie materie
          </Link>
          <div className="mt-4 flex items-center gap-3.5">
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-control border", TONE[tone].bg, TONE[tone].text, TONE[tone].border)}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <h1 className="min-w-0 font-display text-[2rem] leading-[1.08] tracking-[-0.015em] text-fg sm:text-4xl lg:text-5xl">{subject.name}</h1>
          </div>
          <p className="mt-3 text-ui text-fg-subtle">
            {subject.cfu} CFU, {pluralize(subject.units.length, "unità", "unità")}, {pluralize(states.length, "argomento", "argomenti")}, {pluralize(lessons, "lezione ATLAS completa", "lezioni ATLAS complete")}
          </p>

          <figure className="mt-6 max-w-[65ch] border-l-2 border-azure-400/40 pl-4">
            <figcaption className="text-xs text-fg-subtle">Obiettivo formativo, dal syllabus MUR</figcaption>
            <blockquote className="mt-1 text-base leading-relaxed text-fg-reading">«{subject.generalObjective}»</blockquote>
          </figure>
          <a
            href={SYLLABUS_SOURCE.pdf[subjectId]}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-6 items-center gap-1.5 text-ui text-azure-300 underline-offset-4 hover:underline"
          >
            PDF ufficiale del syllabus di {subject.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">(si apre in una nuova scheda)</span>
          </a>

          {/* Index of the units: open on large screens, folded on phones. */}
          <nav aria-label={`Unità di ${subject.name}`} className="mt-8 hidden lg:block">
            <h2 className="mb-1 text-xs font-medium text-fg-subtle">Unità didattiche</h2>
            <UnitIndex subjectId={subjectId} states={states} hydrated={hydrated} />
          </nav>
          <details className="group mt-6 rounded-card border border-white/[0.07] lg:hidden">
            <summary className="flex min-h-12 list-none items-center justify-between gap-3 px-4 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
              Indice delle unità ({subject.units.length})
              <ChevronDown className="h-4 w-4 text-fg-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <nav aria-label={`Unità di ${subject.name}`} className="px-3 pb-2">
              <UnitIndex subjectId={subjectId} states={states} hydrated={hydrated} />
            </nav>
          </details>
        </header>

        <aside aria-label={`Il tuo avanzamento in ${subject.name}`} className="card self-start p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-fg-muted">Padronanza</span>
            {hydrated ? <span className="font-display text-4xl leading-none text-fg">{fmt.percent(mastery)}</span> : <Skeleton className="h-9 w-20" />}
          </div>
          <Meridian value={hydrated ? mastery : 0} label={`Padronanza di ${subject.name}`} className="mt-5" />
          {hydrated ? <StatusCounts states={states} className="mt-4" /> : <Skeleton className="mt-4 h-5 w-full" />}
          {hydrated && next && (
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <div className="text-xs text-fg-subtle">Prossimo argomento</div>
              <Link
                href={`/materie/${subjectId}/${next.ref.topic.id}`}
                className="mt-1 line-clamp-2 text-sm font-medium text-fg underline-offset-4 hover:underline"
              >
                {next.ref.topic.title}
              </Link>
              {next.status !== "nuovo" && <StatusBadge status={next.status} className="mt-2" />}
              <Button variant="primary" className="mt-4 w-full" onClick={() => openStartStudy({ subject: subjectId, topicId: next.ref.topic.id })}>
                <Play className="h-4 w-4 fill-current" aria-hidden /> {next.status === "nuovo" ? "Inizia a studiare" : "Continua a studiare"}
              </Button>
            </div>
          )}
        </aside>
      </div>

      {/* Filters: opaque, above the rows (z-20), below the top bar (z-30). */}
      <div
        ref={barRef}
        className="sticky top-14 z-20 -mx-4 mt-10 border-y border-white/[0.07] bg-ink-950 px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div role="search" className="relative min-w-0 flex-1 md:min-w-[15rem] md:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && q) {
                  e.preventDefault();
                  setQ("");
                }
              }}
              placeholder={`Cerca in ${subject.name}`}
              aria-label={`Cerca argomenti di ${subject.name}`}
              className="h-11 pl-10 pr-11 md:h-10 [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  searchRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
                aria-label="Cancella la ricerca"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <Segmented
              ariaLabel="Filtra per stato"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({
                value: f.value,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {f.label}
                    <span className="tabular-nums text-fg-subtle">{hydrated ? countOf(f.value) : ""}</span>
                  </span>
                ),
              }))}
            />
            <label className="inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-control px-2 text-ui text-fg-muted">
              <Switch checked={onlyLessons} onChange={setOnlyLessons} label="Solo argomenti con lezione completa" />
              <span aria-hidden>Con lezione completa</span>
            </label>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="h-11 w-11 md:hidden"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-label={activeFilters ? `Filtri, ${activeFilters} attivi` : "Filtri"}
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-azure-500 px-1 text-[11px] font-semibold text-white" aria-hidden>
                {activeFilters}
              </span>
            )}
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {query || activeFilters ? `${pluralize(shown, "argomento", "argomenti")} trovati` : ""}
        </p>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} side="bottom" title="Filtri">
        <div className="space-y-6 px-5 py-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-fg">Stato</legend>
            <div className="divide-y divide-white/[0.06] rounded-card border border-white/[0.07]">
              {FILTERS.map((f) => (
                <label key={f.value} className="flex min-h-12 cursor-pointer items-center gap-3 px-4 text-sm text-fg-reading">
                  <input
                    type="radio"
                    name="filtro-stato"
                    value={f.value}
                    checked={filter === f.value}
                    onChange={() => setFilter(f.value)}
                    className="h-4 w-4 accent-azure-500"
                  />
                  <span className="flex-1">{f.label}</span>
                  <span className="tabular-nums text-fg-subtle">{hydrated ? countOf(f.value) : ""}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-card border border-white/[0.07] px-4 text-sm text-fg-reading">
            <span aria-hidden>Solo argomenti con lezione completa</span>
            <Switch checked={onlyLessons} onChange={setOnlyLessons} label="Solo argomenti con lezione completa" />
          </label>
        </div>
        <div className="flex gap-2 border-t border-white/[0.07] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => { setFilter("tutti"); setOnlyLessons(false); }} disabled={!activeFilters}>
            Azzera
          </Button>
          <Button variant="primary" size="lg" className="flex-[2]" onClick={() => setSheetOpen(false)}>
            Mostra {pluralize(shown, "argomento", "argomenti")}
          </Button>
        </div>
      </Sheet>

      {/* Units, chapters and topics in syllabus order. */}
      <div className="mt-6 space-y-5">
        {subject.units.map((u) => {
          const unitTopics = u.chapters.flatMap((c) => c.topics);
          const unitStates = unitTopics.map((t) => byId.get(t.id)).filter((x): x is TopicState => !!x);
          const um = unitStates.reduce((a, x) => a + x.mastery, 0) / Math.max(1, unitStates.length);
          if (!unitTopics.some((t) => visible(t.id, t.title, t.syllabusText))) return null;
          return (
            <section key={u.id} id={u.id} aria-labelledby={`${u.id}-titolo`} className="card overflow-hidden">
              <header className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 md:flex-row md:items-end md:justify-between md:gap-8">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-ui">
                    <span className={cn("font-medium", TONE[tone].text)}>Unità {u.number}</span>
                    <span className="text-fg-subtle">
                      {cfu(u.cfu)}
                      {u.exerciseShare != null && `, di cui almeno ${cfu(u.exerciseShare)} di esercitazioni`}
                    </span>
                  </div>
                  <h2 id={`${u.id}-titolo`} className="mt-1 text-lg font-semibold leading-snug text-fg">
                    {u.title}
                  </h2>
                  {u.officialLead.length > 30 && <p className="mt-1 max-w-[65ch] text-ui leading-relaxed text-fg-muted">{u.officialLead}.</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 md:w-44">
                  <ProgressBar value={hydrated ? um : 0} tone={tone} size="sm" className="flex-1" label={`Padronanza unità ${u.number}`} />
                  <span className="w-9 text-right text-ui tabular-nums text-fg-muted">{hydrated ? fmt.percent(um) : ""}</span>
                </div>
              </header>
              {u.chapters.map((c) => {
                const topics = c.topics.filter((t) => visible(t.id, t.title, t.syllabusText));
                if (!topics.length) return null;
                return (
                  <div key={c.id} className="border-b border-white/[0.05] px-2 pb-2 pt-3 last:border-0">
                    <h3 className="px-3 pb-1 text-xs font-medium text-fg-subtle">{c.title}</h3>
                    <ul>
                      {topics.map((t) => {
                        const st = byId.get(t.id);
                        const status = st?.status ?? "nuovo";
                        const p = hydrated ? progress[t.id] : undefined;
                        const lesson = hasLesson(t.id);
                        const nq = quizCount.get(t.id) ?? 0;
                        const study = () => openStartStudy({ subject: subjectId, topicId: t.id });
                        return (
                          <li key={t.id} className="relative rounded-control transition-colors duration-150 hover:bg-white/[0.03]">
                            <div className="flex items-start gap-3 px-3 py-3 md:items-center md:gap-4">
                              <StatusDot status={status} className="mt-1.5 md:mt-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <Link
                                    href={`/materie/${subjectId}/${t.id}`}
                                    className="text-sm font-medium text-fg outline-none after:absolute after:inset-0 after:rounded-control focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-azure-400 focus-visible:after:outline"
                                  >
                                    {t.title}
                                    {status === "nuovo" && <span className="sr-only">, {STATUS_LABEL.nuovo}</span>}
                                  </Link>
                                  {t.advanced && <AdvancedBadge />}
                                  {lesson && (
                                    <Badge tone="azure" icon={<BookOpen className="h-3 w-3" aria-hidden />}>
                                      Lezione completa
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-fg-subtle">
                                  {pluralize(t.subtopics.length, "sottoargomento", "sottoargomenti")}, {nq ? pluralize(nq, "quesito ATLAS", "quesiti ATLAS") : "quesiti in preparazione"}
                                  {p?.lastStudied ? `, ultimo studio ${fmt.dateShort(p.lastStudied)}` : ""}
                                </p>
                                {status !== "nuovo" && st && (
                                  <div className="mt-2 flex items-center gap-2 md:hidden">
                                    <StatusBadge status={status} />
                                    {st.mastery > 0 && <span className="text-xs tabular-nums text-fg-muted">{fmt.percent(st.mastery)}</span>}
                                  </div>
                                )}
                              </div>
                              <div className="relative z-[1] hidden shrink-0 items-center gap-1 md:flex">
                                <span className="w-[8.5rem]">{status !== "nuovo" && <StatusBadge status={status} />}</span>
                                <span className="w-10 pr-2 text-right text-ui tabular-nums text-fg-muted">{st && st.mastery > 0 ? fmt.percent(st.mastery) : ""}</span>
                                <Button size="sm" variant="ghost" onClick={study} aria-label={`Studia ${t.title}`}>
                                  <Play className="h-3.5 w-3.5" aria-hidden /> Studia
                                </Button>
                                {nq > 0 ? (
                                  <Button size="sm" variant="ghost" href={`/quiz?topic=${t.id}`} aria-label={`Quiz su ${t.title}`}>
                                    <Target className="h-3.5 w-3.5" aria-hidden /> Quiz
                                  </Button>
                                ) : (
                                  <span className="w-[4.375rem]" aria-hidden />
                                )}
                              </div>
                              <Button size="icon" variant="ghost" className="relative z-[1] -my-1.5 -mr-1.5 h-11 w-11 shrink-0 md:hidden" onClick={study} aria-label={`Studia ${t.title}`}>
                                <Play className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </section>
          );
        })}

        {shown === 0 && (
          <EmptyState
            icon={<Search />}
            title="Nessun argomento trovato"
            description={
              query
                ? `Nessun argomento di ${subject.name} contiene «${q.trim()}»${activeFilters ? " con i filtri attivi" : ""}.`
                : `Nessun argomento di ${subject.name} corrisponde ai filtri attivi.`
            }
            action={
              <>
                {query && (
                  <Button variant="secondary" onClick={() => { setQ(""); searchRef.current?.focus(); }}>
                    Cancella la ricerca
                  </Button>
                )}
                {(activeFilters > 0 || query) && (
                  <Button variant="ghost" onClick={reset}>
                    Mostra tutti gli argomenti
                  </Button>
                )}
              </>
            }
          />
        )}
        {elsewhere.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-medium text-fg">Trovati in altre materie</h2>
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {elsewhere.map(({ ref }) => (
                <li key={ref.topic.id}>
                  <Link href={`/materie/${ref.subject.id}/${ref.topic.id}`} className="flex items-center gap-3 py-2.5 text-sm text-fg-reading hover:text-fg">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[SUBJECT_TONE[ref.subject.id]].dot)} aria-hidden />
                    <span className="min-w-0 flex-1">{ref.topic.title}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">{ref.subject.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
