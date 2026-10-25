"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, ListChecks, Play, Sparkles, Telescope } from "lucide-react";
import type { StudyMode } from "@/lib/types";
import { allTopicRefs, getTopicRef } from "@/data/syllabus";
import { getLesson } from "@/data/lessons";
import { questionsFor } from "@/data/questions";
import { MODE_INFO } from "@/data/academy";
import { sectionAnchor } from "@/components/study/steps";
import { Badge, Button, buttonClasses, ProgressRing, Skeleton, TabPanel, Tabs, tabIds } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status";
import { MODE_TONE, SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { useHydrated, useTopicStates } from "@/lib/hooks";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import type { TopicProgress, TopicStatus } from "@/lib/progress";
import { cn, fmt } from "@/lib/utils";
import { ScienceFigure } from "@/components/imagery/science-figure";
import { imageForTopic } from "@/data/imagery";
import { AdvancedBadge, cfu, useScrollPaddingTop } from "./shared";
import {
  AdvancedPanel,
  DiagramsPanel,
  ExamplesPanel,
  ExplanationPanel,
  FlashcardPanel,
  IntroPanel,
  OverviewPanel,
  QuizPanel,
  SourcesPanel,
  STICKY_OFFSET,
  VideoPanel,
  type TabId,
} from "./topic-panels";

const TAB_LABEL: Record<TabId, string> = {
  panoramica: "Introduzione",
  spiegazione: "Spiegazione",
  esempi: "Esempi ed esercizi",
  diagrammi: "Diagrammi e mappa",
  video: "Video e corsi",
  flashcard: "Flashcard",
  quiz: "Quiz",
  approfondimenti: "Approfondimenti",
  fonti: "Fonti",
};

const TABS_BASE = "argomento";
const MODES: StudyMode[] = ["fast", "deep", "ultra"];

/** The mode worth suggesting: a new topic deserves the full path; one to consolidate, a fast review and quiz. */
function suggestedMode(status: TopicStatus | undefined): StudyMode | null {
  if (status === "consolidato") return null;
  if (status === "da-consolidare") return "fast";
  return "deep";
}

/** What the status means and what moves it forward (thresholds from lib/progress: 45% and 80% + a quiz at 80%). */
function nextStep(status: TopicStatus, mastery: number, p: TopicProgress | undefined, hasLesson: boolean): { text: string; quiz: boolean; cards: boolean } {
  const bestQuiz = p?.quiz.length ? Math.max(...p.quiz.map((q) => q.score)) : null;
  const assessed = !!p && (p.quiz.length > 0 || p.recall.length > 0);
  switch (status) {
    case "nuovo":
      return {
        text: `${hasLesson ? "Scegli una modalità per iniziare." : "Inizia dalla sessione guidata."} La padronanza cresce con quiz, richiamo attivo e flashcard, non con la sola lettura.`,
        quiz: false,
        cards: false,
      };
    case "in-corso":
      return assessed
        ? { text: "Con il 45% di padronanza l’argomento passa a «Da consolidare». Ripassa e rifai il quiz.", quiz: true, cards: false }
        : { text: "Hai iniziato a studiarlo. Fai il quiz per misurare quanto ricordi: la lettura da sola non cambia la padronanza.", quiz: true, cards: false };
    case "da-consolidare": {
      const missing: string[] = [];
      if (mastery < 0.8) missing.push(`ti mancano ${Math.max(1, Math.ceil((0.8 - mastery) * 100))} punti di padronanza`);
      if (bestQuiz === null || bestQuiz < 0.8) missing.push(bestQuiz === null ? "serve un quiz con almeno l’80%" : `il tuo miglior quiz è ${fmt.percent(bestQuiz)}, serve l’80%`);
      return { text: `Per «Consolidato» servono l’80% di padronanza e un quiz con almeno l’80%: ${missing.join(" e ")}.`, quiz: true, cards: false };
    }
    case "consolidato":
      return { text: "Argomento consolidato. Ripassalo con le flashcard nei giorni indicati per non dimenticarlo.", quiz: false, cards: true };
  }
}

function Crumbs({ children }: { children: ReactNode[] }) {
  return (
    <nav aria-label="Percorso" className="text-sm text-fg-subtle">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {children.map((c, i) => (
          <li key={i} className={cn("inline-flex items-center gap-1", i === children.length - 1 && "max-md:hidden")}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-faint" aria-hidden />}
            {c}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function TopicPage({ topicId }: { topicId: string }) {
  const ref = getTopicRef(topicId)!;
  const lesson = getLesson(topicId);
  const photo = imageForTopic(topicId);
  const hydrated = useHydrated();
  const states = useTopicStates(ref.subject.id);
  const state = hydrated ? states.find((s) => s.ref.topic.id === topicId) : undefined;
  const progress = useAtlas((s) => (hydrated ? s.progress[topicId] : undefined));
  const showAdvanced = useAtlas((s) => s.settings.showAdvanced);
  const openProfessor = useUI((s) => s.openProfessor);
  const tone = SUBJECT_TONE[ref.subject.id];
  const hasQuestions = useMemo(() => questionsFor({ topicIds: [topicId] }).length > 0, [topicId]);

  const tabs: TabId[] = lesson
    ? ["panoramica", "spiegazione", "esempi", "diagrammi", "video", "flashcard", "quiz", ...(showAdvanced && lesson.advanced.length ? (["approfondimenti"] as TabId[]) : []), "fonti"]
    : ["panoramica", "video", ...(hasQuestions ? (["quiz"] as TabId[]) : []), "fonti"];
  const [tab, setTab] = useState<TabId>("panoramica");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pendingSection = useRef<string | null>(null);

  // Anchors and keyboard focus stop below the top bar and the sticky tab bar (WCAG 2.4.11).
  useScrollPaddingTop(STICKY_OFFSET / 16);

  // Deep links: /materie/biologia/bio-mitocondri#quiz, or #sezione-<id> for a section of the explanation.
  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (!h) return;
    if ((tabs as string[]).includes(h)) setTab(h as TabId);
    else if (lesson && h.startsWith(sectionAnchor(""))) {
      pendingSection.current = h;
      setTab("spiegazione");
    }
    // Read once on arrival; later changes go through `select`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (tab !== "spiegazione" || !pendingSection.current) return;
    const el = document.getElementById(pendingSection.current);
    pendingSection.current = null;
    if (el) requestAnimationFrame(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET }));
  }, [tab]);

  // Keeps the active tab visible inside the horizontally scrolling tab bar (phones, deep links).
  useEffect(() => {
    const el = document.getElementById(tabIds(TABS_BASE, tab).tab);
    const scroller = el?.closest<HTMLElement>(".overflow-x-auto");
    if (!el || !scroller) return;
    const r = el.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    if (r.left < s.left + 24) scroller.scrollLeft -= s.left + 24 - r.left;
    else if (r.right > s.right - 24) scroller.scrollLeft += r.right - (s.right - 24);
  }, [tab]);

  /** Switches panel; if the reader is deep in a long panel, the new one starts under the tab bar. */
  const select = (t: TabId) => {
    setTab(t);
    window.history.replaceState(null, "", `#${t}`);
    const s = sentinelRef.current;
    if (!s) return;
    const top = s.getBoundingClientRect().top + window.scrollY - 56;
    if (window.scrollY > top) window.scrollTo({ top });
  };
  /** From a button inside a panel or the header: switch, then focus the new panel so focus never falls to <body>. */
  const goTo = (t: TabId) => {
    if (!tabs.includes(t)) return;
    select(t);
    requestAnimationFrame(() => document.getElementById(tabIds(TABS_BASE, t).panel)?.focus({ preventScroll: true }));
  };

  // Neighbours in syllabus order, to keep going without returning to the subject.
  const { prev, next } = useMemo(() => {
    const list = allTopicRefs().filter((r) => r.subject.id === ref.subject.id);
    const i = list.findIndex((r) => r.topic.id === topicId);
    return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
  }, [ref.subject.id, topicId]);

  const status = state?.status;
  const mastery = state?.mastery ?? 0;
  const suggested = hydrated ? suggestedMode(status) : "deep";
  const step = hydrated && state ? nextStep(state.status, mastery, progress, !!lesson) : null;
  const bestQuiz = progress?.quiz.length ? Math.max(...progress.quiz.map((q) => q.score)) : null;
  const readCount = lesson ? lesson.sections.filter((s) => progress?.sectionsRead.includes(s.id)).length : 0;

  return (
    <div className="pb-10">
      <Crumbs>
        {[
          <Link key="m" href="/materie" className="inline-flex min-h-6 items-center transition-colors hover:text-fg">
            Le mie materie
          </Link>,
          <Link key="s" href={`/materie/${ref.subject.id}`} className="inline-flex min-h-6 items-center gap-1.5 transition-colors hover:text-fg">
            <span className={cn("h-2 w-2 rounded-full", TONE[tone].dot)} aria-hidden />
            {ref.subject.name}
          </Link>,
          <Link key="u" href={`/materie/${ref.subject.id}#${ref.unit.id}`} className="inline-flex min-h-6 items-center transition-colors hover:text-fg">
            Unità {ref.unit.number}
          </Link>,
          <span key="c">{ref.chapter.title}</span>,
        ]}
      </Crumbs>

      <header className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.08] tracking-[-0.015em] text-fg [text-wrap:balance] sm:text-4xl lg:text-5xl">{ref.topic.title}</h1>
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-fg-muted">
            Unità {ref.unit.number}. {ref.unit.title} ({cfu(ref.unit.cfu)})
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {ref.topic.advanced && <AdvancedBadge />}
            {lesson ? (
              <span className="inline-flex items-center gap-1.5 text-ui text-fg-muted">
                <Clock className="h-3.5 w-3.5 text-fg-subtle" aria-hidden /> Lettura di circa {lesson.readingMinutes} minuti
              </span>
            ) : (
              <Badge tone="muted">Lezione ATLAS in preparazione</Badge>
            )}
          </div>

          {/* Start: one click from the topic to a study session. */}
          {lesson ? (
            <div className="mt-7">
              <h2 className="text-ui font-medium text-fg-muted">Studia con una modalità</h2>
              <ul className="mt-2.5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                {MODES.map((m) => {
                  const primary = m === suggested;
                  const [first] = MODE_INFO[m].name.split(" ");
                  return (
                    <li key={m} className="min-w-0">
                      <Link
                        href={`/studio/${topicId}?mode=${m}`}
                        className={buttonClasses(
                          primary ? "primary" : "secondary",
                          "lg",
                          "h-auto min-h-14 w-full flex-col items-start justify-center gap-0.5 px-3.5 py-2 sm:w-auto sm:min-w-[9.75rem]",
                        )}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <Play className={cn("h-3.5 w-3.5 shrink-0 fill-current", !primary && TONE[MODE_TONE[m]].text)} aria-hidden />
                          <span className="sr-only">Studia in modalità </span>
                          {first}
                          <span className="max-sm:sr-only"> Study</span>
                        </span>
                        <span className={cn("text-xs font-normal", primary ? "text-white" : "text-fg-muted")}>
                          {MODE_INFO[m].time}
                          {primary && <span className="sr-only">, consigliata</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Button variant="ghost" className="-ml-3 mt-2" onClick={() => openProfessor({ topicId })}>
                <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> Chiedi all’AI Professor
              </Button>
            </div>
          ) : (
            <div className="mt-7">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="lg" href={`/studio/${topicId}`}>
                  <Play className="h-4 w-4 fill-current" aria-hidden /> Inizia la sessione guidata
                </Button>
                <Button variant="ghost" size="lg" onClick={() => openProfessor({ topicId })}>
                  <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> Chiedi all’AI Professor
                </Button>
              </div>
              <p className="mt-3 max-w-[60ch] text-ui leading-relaxed text-fg-subtle">
                Obiettivi, risorse, spiegazione dell’AI Professor e richiamo attivo. Le modalità Fast, Deep e Ultra arriveranno con la lezione ATLAS.
              </p>
            </div>
          )}
        </div>

        {/* Right column: the topic's licensed photograph (desktop only, so phones reach the lesson sooner), then progress. */}
        <div className="flex min-w-0 flex-col gap-4">
          {photo && <ScienceFigure image={photo} aspect="3/2" sizes="20rem" className="hidden lg:block" />}
          <section aria-labelledby="avanzamento-h" className="card p-5">
            <h2 id="avanzamento-h" className="text-ui font-medium text-fg-muted">
              Il tuo avanzamento
            </h2>
            <div className="mt-3 flex items-center gap-4">
              {hydrated ? (
                <ProgressRing value={mastery} size={64} stroke={6} tone={tone} label={`Padronanza ${fmt.percent(mastery)}`}>
                  <span className="text-base font-semibold tabular-nums text-fg">{fmt.percent(mastery)}</span>
                </ProgressRing>
              ) : (
                <Skeleton className="h-16 w-16 rounded-full" />
              )}
              <div className="min-w-0">
                <div className="text-sm text-fg">Padronanza</div>
                {status ? <StatusBadge status={status} className="mt-1.5" /> : <Skeleton className="mt-1.5 h-6 w-24" />}
              </div>
            </div>
            {step ? (
              <p className="mt-4 max-w-[60ch] text-ui leading-relaxed text-fg-reading">{step.text}</p>
            ) : (
              <Skeleton className="mt-4 h-10 w-full" />
            )}
            {step?.quiz && tabs.includes("quiz") && (
              <Button variant="secondary" size="sm" className="mt-3 h-10 sm:h-8" onClick={() => goTo("quiz")}>
                <ListChecks className="h-3.5 w-3.5" aria-hidden /> Fai il quiz
              </Button>
            )}
            {step?.cards && (
              <Button variant="secondary" size="sm" className="mt-3 h-10 sm:h-8" href="/flashcard">
                Ripassa le flashcard
              </Button>
            )}
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
              <div className="min-w-0">
                <dt className="text-xs text-fg-subtle">Ultimo studio</dt>
                <dd className="mt-0.5 text-sm text-fg">{progress?.lastStudied ? fmt.dateShort(progress.lastStudied) : "Mai"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-fg-subtle">Miglior quiz</dt>
                <dd className="mt-0.5 text-sm text-fg">
                  {bestQuiz !== null ? (
                    <>
                      {fmt.percent(bestQuiz)}
                      <span className="sr-only">, su {progress!.quiz.length} quiz</span>
                    </>
                  ) : (
                    "Nessuno"
                  )}
                </dd>
              </div>
              {lesson && (
                <div className="min-w-0">
                  <dt className="text-xs text-fg-subtle">Sezioni lette</dt>
                  <dd className="mt-0.5 text-sm tabular-nums text-fg">
                    {readCount} di {lesson.sections.length}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </header>

      {/* Sections of the topic: opaque, under the top bar (z-30), above the content. */}
      <div ref={sentinelRef} aria-hidden />
      <div className="sticky top-14 z-20 -mx-4 mt-10 bg-ink-950 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Tabs
          base={TABS_BASE}
          value={tab}
          onChange={select}
          ariaLabel="Sezioni dell’argomento"
          items={tabs.map((t) => ({
            value: t,
            label: t === "panoramica" && !lesson ? "Panoramica" : TAB_LABEL[t],
            icon: t === "approfondimenti" ? <Telescope /> : undefined,
          }))}
        />
      </div>

      <TabPanel key={tab} base={TABS_BASE} value={tab} className="mt-8 rounded-lg">
        {tab === "panoramica" && (lesson ? <IntroPanel ref={ref} lesson={lesson} onGoTo={goTo} /> : <OverviewPanel ref={ref} />)}
        {tab === "spiegazione" && lesson && <ExplanationPanel lesson={lesson} topicId={topicId} onGoTo={goTo} canQuiz={hasQuestions} />}
        {tab === "esempi" && lesson && <ExamplesPanel lesson={lesson} />}
        {tab === "diagrammi" && lesson && <DiagramsPanel lesson={lesson} />}
        {tab === "video" && <VideoPanel ref={ref} lesson={lesson} />}
        {tab === "flashcard" && lesson && <FlashcardPanel ref={ref} lesson={lesson} />}
        {tab === "quiz" && <QuizPanel ref={ref} />}
        {tab === "approfondimenti" && lesson && <AdvancedPanel lesson={lesson} />}
        {tab === "fonti" && <SourcesPanel ref={ref} lesson={lesson} />}
      </TabPanel>

      {(prev || next) && (
        <nav aria-label="Argomenti vicini" className="mt-20 grid gap-3 border-t border-white/[0.07] pt-8 sm:grid-cols-2">
          {prev ? (
            <Link href={`/materie/${prev.subject.id}/${prev.topic.id}`} className="card card-hover flex min-w-0 flex-col gap-1 p-4">
              <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Argomento precedente
                {prev.unit.id !== ref.unit.id && <span>, unità {prev.unit.number}</span>}
              </span>
              <span className="line-clamp-2 text-sm font-medium text-fg">{prev.topic.title}</span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link href={`/materie/${next.subject.id}/${next.topic.id}`} className="card card-hover flex min-w-0 flex-col items-end gap-1 p-4 text-right">
              <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
                Argomento successivo
                {next.unit.id !== ref.unit.id && <span>, unità {next.unit.number}</span>}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="line-clamp-2 text-sm font-medium text-fg">{next.topic.title}</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
