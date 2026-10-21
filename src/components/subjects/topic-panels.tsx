"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { Check, ChevronDown, ExternalLink, ListChecks, MonitorPlay, RotateCcw, Search, Sparkles, Telescope } from "lucide-react";
import type { Lesson, Resource, Source, TopicRef } from "@/lib/types";
import { SYLLABUS_SOURCE } from "@/data/syllabus";
import { getResource, resourcesForTopic } from "@/data/resources";
import { questionsFor } from "@/data/questions";
import { SectionsView, sectionAnchor } from "@/components/study/steps";
import { DIAGRAM_CAPTION, DIAGRAM_TITLE, LessonDiagram } from "@/components/diagrams/diagrams";
import { ConceptMapView } from "@/components/exercises/concept-map";
import { FlipCards, GuidedProblems } from "@/components/exercises/prompts";
import { QuizRunner } from "@/components/exercises/quiz-runner";
import { ResourceCard } from "@/components/resources/resource-card";
import { Button, EmptyState, Meridian } from "@/components/ui/primitives";
import { Paragraphs, RichText } from "@/components/ui/rich-text";
import { useReducedMotion } from "@/lib/hooks";
import { useRecordQuiz } from "@/lib/record";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { cn, fmt, pluralize } from "@/lib/utils";
import { cfu } from "./shared";

export type TabId = "panoramica" | "spiegazione" | "esempi" | "diagrammi" | "video" | "flashcard" | "quiz" | "approfondimenti" | "fonti";

const EMPTY: string[] = [];

/** Space taken by the top bar and the sticky tab bar (px), plus breathing room. */
export const STICKY_OFFSET = 56 + 44 + 16;

/** Panel title: Newsreader for lesson content, one size for every panel. */
function PanelTitle({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("font-display text-2xl leading-tight tracking-[-0.01em] text-fg [text-wrap:balance] sm:text-[1.75rem]", className)}>
      {children}
    </h2>
  );
}

// ── Syllabus ─────────────────────────────────────────────────

function Subtopics({ ref }: { ref: TopicRef }) {
  return (
    <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
      {ref.topic.subtopics.map((s) => (
        <li key={s} className="flex gap-3 py-2.5 text-sm leading-snug text-fg-reading">
          <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
          {s}
        </li>
      ))}
    </ul>
  );
}

function SyllabusQuote({ ref }: { ref: TopicRef }) {
  return (
    <figure className="border-l-2 border-azure-400/50 pl-4">
      <blockquote className="max-w-[68ch] text-sm leading-relaxed text-fg-reading">«{ref.topic.syllabusText}»</blockquote>
      <figcaption className="mt-2 text-xs leading-relaxed text-fg-subtle">
        Testo del syllabus MUR, {ref.subject.name}, unità {ref.unit.number}.{" "}
        <a
          href={SYLLABUS_SOURCE.pdf[ref.subject.id]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-azure-300 underline-offset-4 hover:text-azure-200 hover:underline"
        >
          PDF ufficiale <ExternalLink className="h-3 w-3" aria-hidden />
          <span className="sr-only">(si apre in una nuova scheda)</span>
        </a>
      </figcaption>
    </figure>
  );
}

/**
 * What the official syllabus asks: the text, the objectives of the ATLAS
 * lesson and the subtopics. On wide screens it is the rail of the
 * introduction; on narrower ones it folds above the lesson so the reading
 * starts at once.
 */
function SyllabusBlock({ ref, lesson, idBase }: { ref: TopicRef; lesson?: Lesson; idBase: string }) {
  return (
    <div className="space-y-6">
      <SyllabusQuote ref={ref} />
      {lesson && (
        <div>
          <h3 id={`${idBase}-obiettivi`} className="text-sm font-semibold text-fg">
            Al termine sarai in grado di
          </h3>
          <ul aria-labelledby={`${idBase}-obiettivi`} className="mt-3 space-y-2.5">
            {lesson.objectives.map((o) => (
              <li key={o} className="flex gap-2.5 text-sm leading-relaxed text-fg-reading">
                <Check className="mt-[3px] h-4 w-4 shrink-0 text-azure-300" aria-hidden />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 id={`${idBase}-sotto`} className="mb-2 text-sm font-semibold text-fg">
          Sottoargomenti del syllabus
        </h3>
        <Subtopics ref={ref} />
      </div>
    </div>
  );
}

// ── Introduction (or overview, when the lesson is not written yet) ──

export function IntroPanel({ ref, lesson, onGoTo }: { ref: TopicRef; lesson: Lesson; onGoTo: (t: TabId) => void }) {
  const summary = `${pluralize(lesson.objectives.length, "obiettivo", "obiettivi")}, ${pluralize(ref.topic.subtopics.length, "sottoargomento", "sottoargomenti")}`;
  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-14">
      {/* Narrow screens: the syllabus folds above the lesson. */}
      <details className="group rounded-card border border-white/[0.07] xl:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-fg">Cosa chiede il syllabus</span>
            <span className="block text-xs text-fg-subtle">{summary}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="border-t border-white/[0.07] px-4 pb-5 pt-4">
          <SyllabusBlock ref={ref} lesson={lesson} idBase="syl-m" />
        </div>
      </details>

      <div className="min-w-0 space-y-14">
        <section aria-labelledby="intro-h">
          <PanelTitle id="intro-h">Introduzione</PanelTitle>
          <Paragraphs items={lesson.intro} className="mt-4" />
        </section>

        <section aria-labelledby="concetti-h">
          <PanelTitle id="concetti-h">Concetti chiave</PanelTitle>
          <ul className="mt-5 max-w-[68ch] space-y-3">
            {lesson.keyConcepts.map((k) => (
              <li key={k} className="flex gap-3.5 text-base leading-relaxed text-fg-reading">
                <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-azure-400" aria-hidden />
                <RichText text={k} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="schema-h">
          <PanelTitle id="schema-h">Schema</PanelTitle>
          <p className="mt-1.5 text-sm text-fg-muted">{lesson.schema.title}</p>
          <ol aria-label={lesson.schema.title} className="relative mt-5 max-w-[68ch]">
            {lesson.schema.steps.map((s, i) => (
              <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
                {/* the path: a hairline joins the steps */}
                {i < lesson.schema.steps.length - 1 && <span className="absolute left-[13px] top-8 bottom-1 w-px bg-white/[0.12]" aria-hidden />}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-azure-400/40 bg-ink-950 text-xs font-semibold tabular-nums text-azure-200" aria-hidden>
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="text-base font-semibold leading-snug text-fg">{s.label}</div>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="definizioni-h">
          <PanelTitle id="definizioni-h">Definizioni</PanelTitle>
          <dl className="mt-5 max-w-[68ch] divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {lesson.definitions.map((d) => (
              <div key={d.term} className="grid gap-1 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
                <dt className="text-sm font-semibold leading-relaxed text-fg">{d.term}</dt>
                <dd className="text-sm leading-relaxed text-fg-muted">{d.definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ContinueTo label="Continua con la spiegazione" hint={`${pluralize(lesson.sections.length, "sezione", "sezioni")}, circa ${lesson.readingMinutes} minuti`} onClick={() => onGoTo("spiegazione")} />
      </div>

      <aside aria-labelledby="syl-d-h" className="hidden xl:block">
        <div className="card p-6">
          <h2 id="syl-d-h" className="mb-4 text-base font-semibold text-fg">
            Cosa chiede il syllabus
          </h2>
          <SyllabusBlock ref={ref} lesson={lesson} idBase="syl-d" />
        </div>
      </aside>
    </div>
  );
}

/** Topic with no ATLAS lesson yet: the official text and subtopics in the main column, then the AI Professor. */
export function OverviewPanel({ ref }: { ref: TopicRef }) {
  const openProfessor = useUI((s) => s.openProfessor);
  return (
    <div className="max-w-3xl space-y-12">
      <section aria-labelledby="syl-h" className="space-y-6">
        <PanelTitle id="syl-h">Cosa chiede il syllabus</PanelTitle>
        <SyllabusQuote ref={ref} />
        <div>
          <h3 className="mb-2 text-sm font-semibold text-fg">Sottoargomenti da coprire</h3>
          <Subtopics ref={ref} />
        </div>
      </section>
      <section aria-labelledby="ai-h">
        <PanelTitle id="ai-h">Fatti spiegare l’argomento</PanelTitle>
        <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-fg-muted">
          L’AI Professor parte dal testo del syllabus e segnala quando non è sicuro. Scegli il livello; verifica sempre sulle fonti consigliate.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["Introduttiva", "introduttivo"],
            ["Universitaria", "universitario"],
            ["Avanzata", "avanzato"],
          ].map(([label, level]) => (
            <Button
              key={level}
              variant="secondary"
              onClick={() =>
                openProfessor({ topicId: ref.topic.id, prompt: `Spiegami l’argomento «${ref.topic.title}» a livello ${level}, seguendo i sottoargomenti del syllabus.` })
              }
            >
              <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> Spiegazione {label.toLowerCase()}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ContinueTo({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <div className="max-w-[68ch] border-t border-white/[0.07] pt-6">
      <Button variant="secondary" size="lg" onClick={onClick}>
        {label}
      </Button>
      {hint && <p className="mt-2 text-ui text-fg-subtle">{hint}</p>}
    </div>
  );
}

// ── Explanation ──────────────────────────────────────────────

function useJumpToSection() {
  const reduced = useReducedMotion();
  return (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(sectionAnchor(id));
    if (!el) return;
    e.preventDefault();
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET, behavior: reduced ? "auto" : "smooth" });
    document.getElementById(`${sectionAnchor(id)}-h`)?.focus({ preventScroll: true });
    window.history.replaceState(null, "", `#${sectionAnchor(id)}`);
  };
}

function LessonIndex({ lesson, read, onJump, idBase }: { lesson: Lesson; read: string[]; onJump: (id: string) => (e: MouseEvent<HTMLAnchorElement>) => void; idBase: string }) {
  const n = lesson.sections.length;
  const done = lesson.sections.filter((s) => read.includes(s.id)).length;
  return (
    <div className="relative pl-5">
      {/* The meridian: how far along the lesson you are. */}
      <Meridian orientation="vertical" value={n ? done / n : 0} label={`Sezioni lette: ${done} di ${n}`} className="absolute bottom-1 left-0 top-1 h-auto" />
      <ol aria-labelledby={idBase} className="space-y-0.5">
        {lesson.sections.map((s) => {
          const isRead = read.includes(s.id);
          return (
            <li key={s.id}>
              <a
                href={`#${sectionAnchor(s.id)}`}
                onClick={onJump(s.id)}
                className="group flex min-h-10 items-start gap-2.5 rounded-lg px-2 py-2 text-ui leading-snug text-fg-muted transition-colors duration-150 hover:bg-white/[0.04] hover:text-fg"
              >
                <span className="mt-px grid h-4 w-4 shrink-0 place-items-center" aria-hidden>
                  {isRead ? <Check className="h-4 w-4 text-success" /> : <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle" />}
                </span>
                <span className={cn("min-w-0", isRead && "text-fg-reading")}>
                  {s.title}
                  {isRead && <span className="sr-only">, letta</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ExplanationPanel({ lesson, topicId, onGoTo, canQuiz }: { lesson: Lesson; topicId: string; onGoTo: (t: TabId) => void; canQuiz: boolean }) {
  const read = useAtlas((s) => s.progress[topicId]?.sectionsRead ?? EMPTY);
  const jump = useJumpToSection();
  const n = lesson.sections.length;
  const done = lesson.sections.filter((s) => read.includes(s.id)).length;
  const resume = done > 0 ? lesson.sections.find((s) => !read.includes(s.id)) : undefined;
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-14">
      <div className="min-w-0">
        <h2 className="sr-only">Spiegazione</h2>
        {/* Narrow screens: index and "resume" above the text. */}
        <div className="mb-10 space-y-3 xl:hidden">
          {resume && (
            <a href={`#${sectionAnchor(resume.id)}`} onClick={jump(resume.id)} className="flex min-h-11 items-center gap-2 text-sm text-azure-300 underline-offset-4 hover:text-azure-200 hover:underline">
              Riprendi da: <span className="font-medium">{resume.title}</span>
            </a>
          )}
          <details className="group rounded-card border border-white/[0.07]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 [&::-webkit-details-marker]:hidden">
              <span id="indice-m" className="text-sm font-medium text-fg">
                Indice <span className="font-normal text-fg-subtle">({done} di {n} lette)</span>
              </span>
              <ChevronDown className="h-4 w-4 text-fg-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-white/[0.07] px-3 py-3">
              <LessonIndex lesson={lesson} read={read} onJump={jump} idBase="indice-m" />
            </div>
          </details>
        </div>

        <SectionsView lesson={lesson} topicId={topicId} />

        <section aria-labelledby="verifica-h" className="mt-16 max-w-[68ch] border-t border-white/[0.07] pt-8">
          <h2 id="verifica-h" className="text-lg font-semibold text-fg">
            Verifica cosa ricordi
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">Leggere orienta, ma la padronanza sale solo con quiz, richiamo attivo e flashcard.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {canQuiz && (
              <Button variant="primary" onClick={() => onGoTo("quiz")}>
                <ListChecks className="h-4 w-4" aria-hidden /> Fai il quiz
              </Button>
            )}
            <Button variant="secondary" onClick={() => onGoTo("flashcard")}>
              Ripassa con le flashcard
            </Button>
          </div>
        </section>
      </div>

      <div className="hidden xl:block">
        <nav aria-labelledby="indice-d" className="sticky top-[8.5rem]">
          <div className="mb-3 flex items-baseline justify-between gap-3 pl-5">
            <h2 id="indice-d" className="text-sm font-semibold text-fg">
              In questa lezione
            </h2>
            <span className="text-xs tabular-nums text-fg-subtle">
              {done} di {n} lette
            </span>
          </div>
          <LessonIndex lesson={lesson} read={read} onJump={jump} idBase="indice-d" />
          {resume && (
            <a href={`#${sectionAnchor(resume.id)}`} onClick={jump(resume.id)} className="ml-5 mt-4 inline-flex min-h-9 items-center px-2 text-ui text-azure-300 underline-offset-4 hover:text-azure-200 hover:underline">
              Riprendi dalla prima non letta
            </a>
          )}
        </nav>
      </div>
    </div>
  );
}

// ── Examples and guided problems ─────────────────────────────

export function ExamplesPanel({ lesson }: { lesson: Lesson }) {
  return (
    <div className="max-w-3xl space-y-14">
      <section aria-labelledby="esempi-h">
        <PanelTitle id="esempi-h">Esempi e applicazioni</PanelTitle>
        <ul className="mt-5 divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {lesson.examples.map((e) => (
            <li key={e.title} className="py-6">
              <h3 className="text-base font-semibold leading-snug text-fg">{e.title}</h3>
              <RichText text={e.body} className="mt-2 block max-w-[68ch] text-base leading-relaxed text-fg-reading" />
            </li>
          ))}
        </ul>
      </section>
      {lesson.guidedProblems.length > 0 && (
        <section aria-labelledby="problemi-h">
          <PanelTitle id="problemi-h">Problemi guidati</PanelTitle>
          <p className="mb-5 mt-2 max-w-[65ch] text-sm leading-relaxed text-fg-muted">Prova a impostare il problema per iscritto prima di chiedere un suggerimento: è lo sforzo di ricordare che fissa il metodo.</p>
          <GuidedProblems problems={lesson.guidedProblems} />
        </section>
      )}
    </div>
  );
}

// ── Diagrams and concept map ─────────────────────────────────

export function DiagramsPanel({ lesson }: { lesson: Lesson }) {
  return (
    <div className="max-w-4xl space-y-14">
      {lesson.diagram && (
        <section aria-labelledby="diagramma-h">
          <PanelTitle id="diagramma-h">{DIAGRAM_TITLE[lesson.diagram]}</PanelTitle>
          <figure className="card mt-5 p-3 sm:p-6">
            <LessonDiagram kind={lesson.diagram} />
            <figcaption className="mt-5 max-w-[68ch] text-sm leading-relaxed text-fg-muted">{DIAGRAM_CAPTION[lesson.diagram]}</figcaption>
          </figure>
        </section>
      )}
      <section aria-labelledby="mappa-h">
        <PanelTitle id="mappa-h">Mappa concettuale</PanelTitle>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-fg-muted">I concetti dell’argomento e le relazioni che li legano. Prova a spiegare ogni freccia a voce prima di guardare la lezione.</p>
        <div className="card mt-5 p-3 sm:p-5">
          <ConceptMapView map={lesson.conceptMap} />
        </div>
      </section>
    </div>
  );
}

// ── Videos and courses ───────────────────────────────────────

export function VideoPanel({ ref, lesson }: { ref: TopicRef; lesson?: Lesson }) {
  const topicId = ref.topic.id;
  const { specific, general } = useMemo(() => {
    const fromLesson = (lesson?.videoIds ?? []).map((id) => getResource(id)).filter((r): r is Resource => !!r);
    const seen = new Set<string>();
    const all = [...fromLesson, ...resourcesForTopic(topicId, ref.subject.id)].filter((r) => r.access === "free" && !seen.has(r.id) && !!seen.add(r.id));
    const isSpecific = (r: Resource) => r.topicTags.includes(topicId) || (lesson?.videoIds ?? []).includes(r.id);
    return { specific: all.filter(isSpecific), general: all.filter((r) => !isSpecific(r)) };
  }, [lesson, topicId, ref.subject.id]);
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 6;
  const visible = showAll ? specific : specific.slice(0, LIMIT);
  const more = (
    <Button variant="secondary" size="sm" href={`/risorse?topic=${topicId}`} className="h-10 sm:h-8">
      <Search className="h-3.5 w-3.5" aria-hidden /> Cerca altre risorse
    </Button>
  );

  if (!specific.length && !general.length) {
    return (
      <EmptyState
        icon={<MonitorPlay />}
        title="Nessuna risorsa collegata a questo argomento"
        description="Il catalogo verificato non ha ancora video o corsi gratuiti per questo argomento. Cerca nelle Study Resources: trovi anche le ricerche su YouTube e sul web."
        action={
          <Button variant="primary" href={`/risorse?topic=${topicId}`}>
            <Search className="h-4 w-4" aria-hidden /> Cerca nelle Study Resources
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-14">
      {specific.length > 0 && (
        <section aria-labelledby="video-h">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <PanelTitle id="video-h">Per questo argomento</PanelTitle>
              <p className="mt-1.5 text-sm text-fg-muted">Video e materiali gratuiti scelti per «{ref.topic.title}».</p>
            </div>
            {more}
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((r) => (
              <li key={r.id}>
                <ResourceCard r={r} headingLevel="h3" />
              </li>
            ))}
          </ul>
          {specific.length > LIMIT && (
            <Button variant="ghost" className="mt-4" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? "Mostra meno" : `Mostra tutte (${specific.length})`}
            </Button>
          )}
        </section>
      )}
      {general.length > 0 && (
        <section aria-labelledby="corsi-h">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <PanelTitle id="corsi-h">Corsi di {ref.subject.name}</PanelTitle>
              <p className="mt-1.5 text-sm text-fg-muted">Non specifici dell’argomento: utili per ripassare la materia nel suo insieme.</p>
            </div>
            {!specific.length && more}
          </div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {general.map((r) => (
              <li key={r.id}>
                <ResourceCard r={r} variant="row" headingLevel="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── Flashcards ───────────────────────────────────────────────

export function FlashcardPanel({ ref, lesson }: { ref: TopicRef; lesson: Lesson }) {
  return (
    <section aria-labelledby="flash-h" className="max-w-5xl">
      <PanelTitle id="flash-h">Flashcard</PanelTitle>
      <p className="mb-5 mt-1.5 text-sm text-fg-muted">
        {pluralize(lesson.flashcards.length, "carta", "carte")} su «{ref.topic.title}». Aggiungile al ripasso per ritrovarle nei giorni giusti.
      </p>
      <FlipCards cards={lesson.flashcards} topicId={ref.topic.id} subject={ref.subject.id} deck={ref.topic.title} />
    </section>
  );
}

// ── Quiz ─────────────────────────────────────────────────────

export function QuizPanel({ ref }: { ref: TopicRef }) {
  const questions = useMemo(() => questionsFor({ topicIds: [ref.topic.id] }), [ref.topic.id]);
  const recordQuiz = useRecordQuiz();
  const [run, setRun] = useState(0);
  if (!questions.length) {
    return (
      <EmptyState
        icon={<ListChecks />}
        title="Ancora nessun quesito su questo argomento"
        description={`La banca ATLAS non ha quesiti per «${ref.topic.title}». Puoi esercitarti con un quiz misto di ${ref.subject.name}.`}
        action={
          <Button variant="primary" href="/quiz">
            Apri i quiz
          </Button>
        }
      />
    );
  }
  const title = `Quiz: ${ref.topic.title}`;
  return (
    <section aria-label="Quiz" className="max-w-3xl">
      <p className="mb-5 max-w-[65ch] text-ui leading-relaxed text-fg-muted">
        {pluralize(questions.length, "quesito originale ATLAS", "quesiti originali ATLAS")} nel formato d’esame, dal più facile al più difficile. Non sono quesiti ministeriali.
      </p>
      <QuizRunner
        key={run}
        questions={questions}
        variant="progressive"
        title={title}
        seed={run + 1}
        onFinish={(o) => recordQuiz(o, { kind: "quiz", title, subject: ref.subject.id })}
        finishedHeader={
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setRun((k) => k + 1)}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Rifai con le risposte in un altro ordine
            </Button>
          </div>
        }
      />
    </section>
  );
}

// ── Beyond the syllabus ──────────────────────────────────────

export function AdvancedPanel({ lesson }: { lesson: Lesson }) {
  return (
    <div className="max-w-3xl">
      <div className="flex gap-3 rounded-card border border-dashed border-indigo-300/35 bg-indigo-400/[0.04] px-4 py-3.5 text-sm leading-relaxed text-fg-muted">
        <Telescope className="mt-0.5 h-4 w-4 shrink-0 text-indigo-200" aria-hidden />
        <p>
          <span className="font-medium text-fg">Oltre il programma.</span> Questi contenuti aiutano a capire meglio, ma il syllabus del semestre filtro non li richiede.
        </p>
      </div>
      {lesson.advanced.map((a, i) => (
        <section key={a.title} aria-labelledby={`adv-${i}`} className={cn("pt-10", i > 0 && "mt-10 border-t border-white/[0.07]")}>
          <PanelTitle id={`adv-${i}`}>{a.title}</PanelTitle>
          <Paragraphs items={a.body} className="mt-4" />
        </section>
      ))}
    </div>
  );
}

// ── Sources ──────────────────────────────────────────────────

const SOURCE_GROUPS: { kind: Source["kind"]; title: string }[] = [
  { kind: "ufficiale", title: "Fonti ufficiali" },
  { kind: "manuale", title: "Manuali" },
  { kind: "articolo", title: "Articoli scientifici" },
  { kind: "risorsa-aperta", title: "Risorse aperte" },
];

function SourceRow({ s }: { s: Source }) {
  const href = s.url ?? (s.doi ? `https://doi.org/${s.doi}` : undefined);
  return (
    <li className="py-3.5">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium leading-relaxed text-fg underline-offset-4 hover:underline">
          {s.label}
          <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 align-[-2px] text-fg-subtle" aria-hidden />
          <span className="sr-only"> (si apre in una nuova scheda)</span>
        </a>
      ) : (
        <span className="text-sm font-medium leading-relaxed text-fg">{s.label}</span>
      )}
      {s.detail && <p className="mt-1 text-ui leading-relaxed text-fg-muted">{s.detail}</p>}
      {s.doi && <p className="mt-1 text-xs text-fg-subtle">DOI {s.doi}</p>}
    </li>
  );
}

export function SourcesPanel({ ref, lesson }: { ref: TopicRef; lesson?: Lesson }) {
  const official: Source = {
    label: `Syllabus del semestre aperto a.a. 2026-2027, ${ref.subject.name}`,
    url: SYLLABUS_SOURCE.pdf[ref.subject.id],
    detail: `MUR. Pubblicato il ${fmt.dateYear(SYLLABUS_SOURCE.published)}, verificato il ${fmt.dateYear(SYLLABUS_SOURCE.verifiedOn)}. Unità ${ref.unit.number}, ${cfu(ref.unit.cfu)}.`,
    kind: "ufficiale",
  };
  const sources = [official, ...(lesson?.sources ?? [])];
  return (
    <div className="max-w-3xl space-y-10">
      {SOURCE_GROUPS.map((g) => {
        const list = sources.filter((s) => s.kind === g.kind);
        if (!list.length) return null;
        return (
          <section key={g.kind} aria-labelledby={`fonti-${g.kind}`}>
            <h2 id={`fonti-${g.kind}`} className="text-base font-semibold text-fg">
              {g.title}
            </h2>
            <ol className="mt-2 divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {list.map((s) => (
                <SourceRow key={s.label} s={s} />
              ))}
            </ol>
          </section>
        );
      })}
      {!lesson && (
        <p className="max-w-[65ch] text-sm leading-relaxed text-fg-muted">
          Le fonti della lezione saranno elencate quando la lezione ATLAS sarà pubblicata. Nel frattempo usa i manuali aperti e i corsi della scheda «Video e corsi».
        </p>
      )}
    </div>
  );
}
