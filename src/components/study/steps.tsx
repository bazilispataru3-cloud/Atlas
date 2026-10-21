"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  ListChecks,
  Workflow,
  KeyRound,
  GalleryVerticalEnd,
  Target,
  Lightbulb,
  Network,
  Brain,
  NotebookPen,
  Calculator,
  Search,
  Image as ImageIcon,
  HelpCircle,
  MessageSquareText,
  Feather,
  Castle,
  Shuffle,
  Mic,
  CalendarCheck,
  Sparkles,
  ShieldCheck,
  Telescope,
  Check,
  ExternalLink,
  ChevronRight,
  EyeOff,
  Eye,
} from "lucide-react";
import type { Lesson, Question, StudyMode, TopicRef } from "@/lib/types";
import { Badge, Button, Card, Notice, ProgressBar, Textarea } from "@/components/ui/primitives";
import { Paragraphs, RichText } from "@/components/ui/rich-text";
import { LessonDiagram, DIAGRAM_CAPTION } from "@/components/diagrams/diagrams";
import { QuizRunner, type QuizOutcome } from "@/components/exercises/quiz-runner";
import { RevealPrompts, FlipCards, GuidedProblems } from "@/components/exercises/prompts";
import { CornellEditor } from "@/components/exercises/cornell";
import { ConceptMapView } from "@/components/exercises/concept-map";
import { FeynmanExercise } from "@/components/exercises/feynman";
import { MemoryPalace } from "@/components/exercises/memory-palace";
import { OralExam, LabelDiagramExercise } from "@/components/exercises/more";
import { ResourceMiniList } from "@/components/resources/resource-card";
import { questionsFor, QUESTIONS } from "@/data/questions";
import { resourcesForTopic } from "@/data/resources";
import { SYLLABUS_SOURCE } from "@/data/syllabus";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { toast } from "@/components/ui/toast";
import { addDays, capFirst, fmt, shuffle } from "@/lib/utils";
import { MODE_SEQUENCE, ULTRA_SEQUENCE, ultraKind, type StepKey } from "./paths";
import { cx } from "./cx";

// The path definitions live in ./paths (no React, no exercises) and are re-exported here for compatibility.
export { STEP_LABEL, MODE_SEQUENCE, ULTRA_SEQUENCE, ULTRA_RATIONALE, ultraKind, type UltraKind, type StepKey } from "./paths";

export interface SessionStep {
  id: string;
  title: string;
  technique: string;
  icon: ReactNode;
  render: () => ReactNode;
  /** Sections of a long reading step, for the in-step index. */
  toc?: { id: string; title: string }[];
  /** The step ends with a check (quiz, recall, Feynman…): the session can tell "seen" from "verified". */
  check?: boolean;
  /** The exercise has its own bottom action bar (the quiz runner): the session bar steps aside until it is done. */
  ownDock?: boolean;
}

/** Stable context passed to step builders (callbacks must be referentially stable). */
export interface StepCtx {
  ref: TopicRef;
  lesson?: Lesson;
  mode: StudyMode;
  onQuiz: (o: QuizOutcome, title: string, stepId?: string) => void;
  onRecall: (score: number, stepId?: string) => void;
  /** An exercise that already saved its own score (Feynman, oral exam): the session only notes it. */
  onPractice?: (stepId: string, label: string, score?: number) => void;
}

/** Live data of the running session (errors, weak recalls) for the gap analysis. */
export const SessionDataContext = createContext<{ quizWrong: string[]; recallLow: string[] }>({ quizWrong: [], recallLow: [] });

const I = "h-4 w-4";

/** Anchor id of a lesson section (used by the in-step index). */
export const sectionAnchor = (id: string) => `sezione-${id}`;

export function OfficialBox({ ref }: { ref: TopicRef }) {
  return (
    <div className="rounded-card border border-azure-400/20 bg-azure-500/[0.05] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge tone="azure" icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}>
          Programma ufficiale
        </Badge>
        <span className="text-xs text-fg-subtle">
          Syllabus MUR {SYLLABUS_SOURCE.label.split("a.a. ")[1]}, {ref.subject.name}, unità {ref.unit.number} ({ref.unit.cfu} CFU)
        </span>
      </div>
      <blockquote className="mt-3 max-w-[68ch] text-sm leading-relaxed text-fg-reading">«{ref.topic.syllabusText}»</blockquote>
      <a
        href={SYLLABUS_SOURCE.pdf[ref.subject.id]}
        target="_blank"
        rel="noopener noreferrer"
        className="-my-2 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-ui text-azure-300 hover:text-azure-200 hover:underline sm:min-h-8"
      >
        PDF ufficiale MUR <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">(si apre in una nuova scheda)</span>
      </a>
    </div>
  );
}

function ReadSection({ topicId, id, title, children }: { topicId: string; id: string; title: string; children: ReactNode }) {
  const read = useAtlas((s) => s.progress[topicId]?.sectionsRead.includes(id) ?? false);
  const mark = useAtlas((s) => s.markSectionRead);
  return (
    <section id={sectionAnchor(id)} className="scroll-mt-24" aria-labelledby={`${sectionAnchor(id)}-h`}>
      <h3 id={`${sectionAnchor(id)}-h`} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold leading-snug tracking-[-0.01em] text-fg [text-wrap:balance]">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
      <button
        type="button"
        onClick={() => {
          if (!read) mark(topicId, id);
        }}
        aria-pressed={read}
        className={cx(
          "mt-4 inline-flex min-h-11 items-center gap-2 rounded-control border px-3.5 text-ui font-medium transition-colors duration-150 sm:min-h-9",
          read ? "border-success/25 bg-success/[0.06] text-green-300" : "border-white/[0.1] text-fg-muted hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-fg",
        )}
      >
        <Check className="h-4 w-4" aria-hidden /> {read ? "Sezione letta" : "Segna come letta"}
      </button>
    </section>
  );
}

export function SectionsView({ lesson, topicId, compact }: { lesson: Lesson; topicId: string; compact?: boolean }) {
  return (
    <div className="space-y-12">
      {lesson.sections.map((s) => (
        <ReadSection key={s.id} topicId={topicId} id={s.id} title={s.title}>
          <Paragraphs items={compact ? s.body.slice(0, 2) : s.body} />
          {s.bullets && (
            <ol className="mt-4 max-w-[68ch] list-decimal space-y-1.5 pl-6 text-base leading-relaxed text-fg-reading marker:text-sm marker:text-fg-subtle">
              {s.bullets.map((b) => (
                <li key={b} className="pl-1">
                  <RichText text={b} />
                </li>
              ))}
            </ol>
          )}
          {s.callout && (
            <Notice tone={s.callout.tone === "clinical" ? "clinical" : s.callout.tone === "warning" ? "warning" : "info"} className="mt-5 max-w-[68ch]">
              {s.callout.text}
            </Notice>
          )}
        </ReadSection>
      ))}
    </div>
  );
}

/** A real sequence: numbered, in reading order (a vertical path in narrow columns, a row in wide ones). */
export function Schema({ lesson }: { lesson: Lesson }) {
  const n = lesson.schema.steps.length;
  return (
    <figure className="@container">
      <figcaption className="mb-3 text-ui font-medium text-fg-muted">{lesson.schema.title}</figcaption>
      <ol className="relative grid gap-2 @3xl:auto-cols-fr @3xl:grid-flow-col @3xl:gap-3">
        {lesson.schema.steps.map((s, i) => (
          <li key={s.label} className="inset-panel relative flex gap-3 p-3.5 @3xl:block @3xl:p-4">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-azure-400/30 text-xs font-medium tabular-nums text-azure-300" aria-hidden>
              {i + 1}
            </span>
            <div className="min-w-0 @3xl:mt-2.5">
              <div className="text-sm font-medium leading-snug text-fg">
                <span className="sr-only">Passaggio {i + 1}: </span>
                {s.label}
              </div>
              <div className="mt-1 text-ui leading-relaxed text-fg-muted">{s.detail}</div>
            </div>
            {i < n - 1 && (
              <ChevronRight className="absolute -right-[13px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-ink-900 text-fg-subtle @3xl:block" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function Definitions({ lesson }: { lesson: Lesson }) {
  return (
    <dl className="grid gap-2.5 md:grid-cols-2">
      {lesson.definitions.map((d) => (
        <div key={d.term} className="inset-panel p-4">
          <dt className="text-sm font-semibold text-fg">{d.term}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-fg-muted">{d.definition}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Objectives({ ref, lesson }: { ref: TopicRef; lesson?: Lesson }) {
  return (
    <div className="space-y-6">
      <OfficialBox ref={ref} />
      {lesson && (
        <div>
          <h3 className="mb-2.5 text-sm font-semibold text-fg">Al termine sarai in grado di</h3>
          <ul className="max-w-[68ch] space-y-2">
            {lesson.objectives.map((o) => (
              <li key={o} className="flex gap-2.5 text-base leading-relaxed text-fg-reading">
                <Target className="mt-1 h-4 w-4 shrink-0 text-azure-300" aria-hidden /> <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold text-fg">Sottoargomenti del syllabus</h3>
        <ul className="flex flex-wrap gap-1.5">
          {ref.topic.subtopics.map((s) => (
            <li key={s} className="rounded-chip border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-ui text-fg-muted">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SessionQuiz({ ctx, questions, title, variant = "practice", stepId }: { ctx: StepCtx; questions: Question[]; title: string; variant?: "practice" | "progressive"; stepId: string }) {
  if (!questions.length)
    return (
      <Notice tone="info" title="Ancora nessun quesito su questo argomento" action={<Button size="sm" href={`/quiz?topic=${ctx.ref.topic.id}`}>Apri i quiz</Button>}>
        La banca ATLAS non contiene ancora quesiti specifici. Prova il quiz misto di {ctx.ref.subject.name} dalla sezione Quiz.
      </Notice>
    );
  return (
    <div className="space-y-3">
      <p className="max-w-[68ch] text-ui text-fg-muted">Quesiti originali ATLAS nel formato d’esame (5 opzioni o completamento). Non sono quesiti ministeriali.</p>
      <QuizRunner questions={questions} variant={variant} title={title} onFinish={(o) => ctx.onQuiz(o, title, stepId)} />
    </div>
  );
}

function GapAnalysis({ ctx }: { ctx: StepCtx }) {
  const { lesson, ref } = ctx;
  const session = useContext(SessionDataContext);
  const progress = useAtlas((s) => s.progress[ref.topic.id]);
  const addCards = useAtlas((s) => s.addCards);
  const unread = lesson ? lesson.sections.filter((s) => !progress?.sectionsRead.includes(s.id)) : [];
  const wrongQs = session.quizWrong.map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean) as Question[];
  const lastQuiz = progress?.quiz.at(-1);
  return (
    <div className="space-y-6">
      <dl className="card grid grid-cols-3 divide-x divide-white/[0.06]">
        {[
          ["Ultimo quiz", lastQuiz ? fmt.percent(lastQuiz.score) : "—"],
          ["Richiami incompleti", String(session.recallLow.length)],
          ["Sezioni non lette", String(unread.length)],
        ].map(([k, v]) => (
          <div key={k} className="px-3 py-4 sm:px-5">
            <dt className="text-xs text-fg-subtle sm:text-ui">{k}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      {wrongQs.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-fg">Concetti da rivedere, dai quiz di questa sessione</h3>
          <ul className="max-w-[68ch] divide-y divide-white/[0.06]">
            {wrongQs.map((q) => (
              <li key={q.id} className="py-3 text-sm leading-relaxed">
                <div className="text-fg">{q.stem}</div>
                <div className="mt-1 text-fg-muted">{q.explanation}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {session.recallLow.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-fg">Domande di richiamo da ripetere domani</h3>
          <ul className="max-w-[68ch] list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
            {session.recallLow.map((p) => (
              <li key={p}>
                <RichText text={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {!wrongQs.length && !session.recallLow.length && (
        <Notice tone="info">Completa il quiz progressivo e l’active recall: l’analisi delle lacune si basa sui tuoi errori reali, non sulla lettura.</Notice>
      )}
      {unread.length > 0 && (
        <p className="max-w-[68ch] text-ui text-fg-muted">
          Sezioni ancora da segnare come lette: {unread.map((s) => s.title).join(", ")}.
        </p>
      )}
      {lesson && (
        <Button
          variant="secondary"
          className="h-auto min-h-10 whitespace-normal py-2 text-left"
          onClick={() => {
            const n = addCards(lesson.flashcards.map((f) => ({ front: f.front, back: f.back, topicId: ref.topic.id, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
            toast(n ? `${n} flashcard aggiunte al ripasso` : "Flashcard già presenti nel ripasso", { tone: n ? "success" : "info" });
          }}
        >
          <GalleryVerticalEnd className="h-4 w-4 shrink-0" aria-hidden /> Aggiungi le flashcard dell’argomento al ripasso
        </Button>
      )}
    </div>
  );
}

function ReviewPlan({ ctx }: { ctx: StepCtx }) {
  const { lesson, ref } = ctx;
  const addCards = useAtlas((s) => s.addCards);
  const [added, setAdded] = useState<number | null>(null);
  const today = new Date();
  return (
    <div className="space-y-5">
      <p className="max-w-[68ch] text-base leading-relaxed text-fg-reading">
        Chiudi il percorso programmando i ripassi. Le flashcard dell’argomento entrano nel sistema di ripetizione dilazionata: gli intervalli si adattano a quanto le ricordi.
      </p>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Intervalli di ripasso indicativi">
        {[1, 3, 7, 16].map((d) => (
          <li key={d} className="inset-panel p-3">
            <div className="text-xs text-fg-subtle">
              Tra {d} {d === 1 ? "giorno" : "giorni"}
            </div>
            <div className="mt-0.5 text-sm font-medium text-fg">
              {capFirst(fmt.weekday(addDays(today, d)))} {fmt.dateShort(addDays(today, d))}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {lesson && (
          <Button
            variant="secondary"
            onClick={() => {
              const n = addCards(lesson.flashcards.map((f) => ({ front: f.front, back: f.back, topicId: ref.topic.id, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
              setAdded(n);
            }}
          >
            <CalendarCheck className="h-4 w-4" aria-hidden /> Aggiungi {lesson.flashcards.length} flashcard al ripasso
          </Button>
        )}
        <Button variant="ghost" href="/calendario">
          Apri il calendario
        </Button>
      </div>
      {added !== null && (
        <Notice tone={added ? "success" : "info"} live>
          {added ? `${added} flashcard aggiunte: le prime saranno in scadenza da oggi.` : "Le flashcard erano già nel tuo mazzo."}
        </Notice>
      )}
    </div>
  );
}

export function AiExplain({ ref }: { ref: TopicRef }) {
  const openProfessor = useUI((s) => s.openProfessor);
  return (
    <div className="space-y-4">
      <p className="max-w-[68ch] text-base leading-relaxed text-fg-reading">
        La lezione ATLAS completa per questo argomento è in preparazione. Puoi chiedere all’AI Professor una spiegazione al livello che preferisci, ancorata al testo ufficiale del syllabus: verifica sempre sulle fonti consigliate.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          ["Spiegazione introduttiva", "introduttivo"],
          ["Spiegazione universitaria", "universitario"],
          ["Approfondimento avanzato", "avanzato"],
        ].map(([label, level]) => (
          <Button key={level} variant="secondary" onClick={() => openProfessor({ topicId: ref.topic.id, prompt: `Spiegami l’argomento «${ref.topic.title}» a livello ${level}, seguendo i sottoargomenti del syllabus.` })}>
            <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Dual coding in two phases: study the picture with words, then hide it and label it from memory. */
function DualCoding({ ctx, lesson }: { ctx: StepCtx; lesson: Lesson }) {
  const [testing, setTesting] = useState(false);
  const canLabel = lesson.diagram === "mitochondrion";
  return (
    <div className="space-y-5">
      {!testing && (
        <>
          {lesson.diagram && (
            <figure className="card p-4">
              <LessonDiagram kind={lesson.diagram} />
              <figcaption className="mt-2 text-xs text-fg-subtle">{DIAGRAM_CAPTION[lesson.diagram]}</figcaption>
            </figure>
          )}
          <Schema lesson={lesson} />
        </>
      )}
      {canLabel ? (
        testing ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-fg">Etichetta il diagramma senza aiuti</h3>
              <Button variant="ghost" size="sm" onClick={() => setTesting(false)}>
                <Eye className="h-4 w-4" aria-hidden /> Rivedi il diagramma
              </Button>
            </div>
            <LabelDiagramExercise onComplete={(s) => ctx.onRecall(s, "dual")} />
          </section>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setTesting(true)}>
              <EyeOff className="h-4 w-4" aria-hidden /> Nascondi e mettiti alla prova
            </Button>
            <span className="text-ui text-fg-muted">Il diagramma sparisce: lo ricostruisci a memoria.</span>
          </div>
        )
      ) : (
        <Notice tone="info">Ridisegna il diagramma su carta senza guardarlo e descrivilo ad alta voce: è il cuore del dual coding.</Notice>
      )}
    </div>
  );
}

// ── Step builders ─────────────────────────────────────────────

export function buildSteps(ctx: StepCtx): SessionStep[] {
  const { lesson, ref, mode } = ctx;
  const topicQs = questionsFor({ topicIds: [ref.topic.id] });
  const objStep: SessionStep = { id: "obiettivi", title: "Obiettivi del syllabus", technique: "Orientamento", icon: <Target className={I} />, render: () => <Objectives ref={ref} lesson={lesson} /> };
  const resources = resourcesForTopic(ref.topic.id, ref.subject.id);
  const resStep: SessionStep = {
    id: "risorse",
    title: "Video e corsi consigliati",
    technique: "Approfondimento",
    icon: <Telescope className={I} />,
    render: () => (
      <div className="space-y-4">
        <ResourceMiniList resources={resources.slice(0, 8)} />
        <Button variant="secondary" href={`/risorse?topic=${ref.topic.id}`}>
          <Search className="h-4 w-4" aria-hidden /> Cerca altre risorse per questo argomento
        </Button>
      </div>
    ),
  };

  if (!lesson) {
    const subjectQs = questionsFor({ subject: ref.subject.id, types: ["mcq", "cloze"] });
    const fallbackQuiz = shuffle(topicQs.length ? topicQs : subjectQs, 3).slice(0, 8);
    return [
      objStep,
      resStep,
      { id: "ai", title: "Spiegazione con l’AI Professor", technique: "Spiegazione", icon: <Sparkles className={I} />, render: () => <AiExplain ref={ref} /> },
      {
        id: "recall",
        title: "Active recall sui sottoargomenti",
        technique: "Active recall",
        icon: <Brain className={I} />,
        check: true,
        render: () => (
          <RevealPrompts
            intro="Dopo aver studiato sulle fonti, prova a spiegare ogni sottoargomento senza guardare. Come riferimento c’è il testo ufficiale: confronta e valuta con onestà."
            items={ref.topic.subtopics.slice(0, 8).map((s) => ({ prompt: `Che cosa sai dire su: **${s}**?`, answer: `Riferimento ufficiale: «${s}». Controlla sulle fonti consigliate i punti che non hai saputo spiegare.` }))}
            onComplete={(s) => ctx.onRecall(s, "recall")}
          />
        ),
      },
      {
        id: "quiz",
        title: topicQs.length ? "Quiz sull’argomento" : `Quiz misto di ${ref.subject.name}`,
        technique: "Pratica di recupero",
        icon: <ListChecks className={I} />,
        check: true,
        ownDock: fallbackQuiz.length > 0,
        render: () => <SessionQuiz ctx={ctx} questions={fallbackQuiz} title={`Quiz: ${ref.topic.title}`} stepId="quiz" />,
      },
    ];
  }

  const quick = shuffle(topicQs.filter((q) => q.type !== "open"), 11).slice(0, 8);
  const progressive = topicQs;
  const others = shuffle(QUESTIONS.filter((q) => q.topicId !== ref.topic.id && q.type !== "open" && (q.subject === ref.subject.id || q.skill === "calcolo")), 17).slice(0, 4);
  const mine = shuffle(topicQs.filter((q) => q.type !== "open"), 19).slice(0, 4);
  const mixed = mine.flatMap((q, i) => (others[i] ? [q, others[i]] : [q]));
  const toc = lesson.sections.map((s) => ({ id: sectionAnchor(s.id), title: s.title }));

  const S = {
    riassunto: { id: "riassunto", title: "Riassunto essenziale", technique: "Sintesi", icon: <BookOpen className={I} />, render: () => (
      <ul className="max-w-[68ch] divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {lesson.fastSummary.map((p, i) => (
          <li key={i} className="flex gap-3.5 py-3.5 text-reading text-fg-reading">
            <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-azure-400" aria-hidden />
            <span>
              <RichText text={p} />
            </span>
          </li>
        ))}
      </ul>
    ) },
    definizioni: { id: "definizioni", title: "Definizioni essenziali", technique: "Definizioni", icon: <KeyRound className={I} />, render: () => <Definitions lesson={lesson} /> },
    schema: { id: "schema", title: "Schema sintetico", technique: "Schema", icon: <Workflow className={I} />, render: () => <Schema lesson={lesson} /> },
    concetti: { id: "concetti", title: "Concetti chiave e syllabus", technique: "Obiettivi", icon: <Target className={I} />, render: () => (
      <div className="space-y-6">
        <div>
          <h3 className="mb-2.5 text-sm font-semibold text-fg">Concetti chiave</h3>
          <ul className="flex flex-wrap gap-2">
            {lesson.keyConcepts.map((k) => (
              <li key={k} className="rounded-chip border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-sm text-fg">
                {k}
              </li>
            ))}
          </ul>
        </div>
        <Objectives ref={ref} lesson={lesson} />
      </div>
    ) },
    flashcard: { id: "flashcard", title: "Flashcard rapide", technique: "Retrieval", icon: <GalleryVerticalEnd className={I} />, render: () => <FlipCards cards={lesson.flashcards.slice(0, 9)} topicId={ref.topic.id} subject={ref.subject.id} deck={ref.topic.title} /> },
    quizRapido: { id: "quiz", title: `Quiz rapido (${quick.length} domande)`, technique: "Pratica di recupero", icon: <ListChecks className={I} />, check: true, ownDock: quick.length > 0, render: () => <SessionQuiz ctx={ctx} questions={quick} title={`Quiz rapido: ${ref.topic.title}`} stepId="quiz" /> },
    lezione: { id: "lezione", title: "Lezione introduttiva", technique: "Contesto", icon: <BookOpen className={I} />, render: () => (
      <div className="space-y-8">
        <Paragraphs items={lesson.intro} />
        <OfficialBox ref={ref} />
      </div>
    ) },
    spiegazione: { id: "spiegazione", title: "Spiegazione approfondita", technique: "Studio strutturato", icon: <BookOpen className={I} />, toc, render: () => <SectionsView lesson={lesson} topicId={ref.topic.id} compact={mode === "ultra"} /> },
    esempi: { id: "esempi", title: "Esempi e applicazioni", technique: "Esempi", icon: <Lightbulb className={I} />, render: () => (
      <div className="space-y-8">
        {lesson.diagram && (
          <figure className="card p-4">
            <LessonDiagram kind={lesson.diagram} />
            <figcaption className="mt-2 text-xs text-fg-subtle">{DIAGRAM_CAPTION[lesson.diagram]}</figcaption>
          </figure>
        )}
        <div className="max-w-[68ch] space-y-7">
          {lesson.examples.map((e) => (
            <section key={e.title}>
              <h3 className="text-lg font-semibold leading-snug text-fg">{e.title}</h3>
              <p className="mt-2 text-reading text-fg-reading">{e.body}</p>
            </section>
          ))}
        </div>
      </div>
    ) },
    mappa: { id: "mappa", title: "Mappa concettuale", technique: "Organizzazione", icon: <Network className={I} />, render: () => <Card className="p-4"><ConceptMapView map={lesson.conceptMap} /></Card> },
    recall: { id: "recall", title: "Active recall", technique: "Richiamo attivo", icon: <Brain className={I} />, check: true, render: () => <RevealPrompts intro="Rispondi senza guardare la lezione, poi confronta." items={lesson.activeRecall.map((a) => ({ prompt: a.prompt, answer: a.answer }))} onComplete={(s) => ctx.onRecall(s, "recall")} /> },
    cornell: { id: "cornell", title: "Metodo Cornell", technique: "Appunti strutturati", icon: <NotebookPen className={I} />, render: () => <CornellEditor topicId={ref.topic.id} seedCues={lesson.activeRecall.map((a) => a.prompt)} /> },
    problemi: { id: "problemi", title: "Problemi ed esercizi guidati", technique: "Problem solving", icon: <Calculator className={I} />, render: () => <GuidedProblems problems={lesson.guidedProblems} /> },
    quizProgressivo: { id: "quiz-progressivo", title: "Quiz progressivo", technique: "Pratica di recupero", icon: <ListChecks className={I} />, check: true, ownDock: progressive.length > 0, render: () => <SessionQuiz ctx={ctx} questions={progressive} title={`Quiz progressivo: ${ref.topic.title}`} variant="progressive" stepId="quiz-progressivo" /> },
    lacune: { id: "lacune", title: "Analisi delle lacune", technique: "Metacognizione", icon: <Search className={I} />, render: () => <GapAnalysis ctx={ctx} /> },
    attivazione: { id: "attivazione", title: "Attivazione: cosa sai già?", technique: "Pre-test", icon: <Lightbulb className={I} />, render: () => (
      <div className="space-y-6">
        <p className="max-w-[68ch] text-reading text-fg-reading">
          Prima di studiare, prova a rispondere: anche sbagliare un pre-test migliora l’apprendimento successivo, perché orienta l’attenzione. Questa fase non conta nei progressi.
        </p>
        <ol className="max-w-[68ch] list-decimal space-y-2.5 pl-6 text-base leading-relaxed text-fg marker:text-fg-subtle">
          {lesson.elaborative.slice(0, 3).map((e) => (
            <li key={e.question} className="pl-1">
              {e.question}
            </li>
          ))}
        </ol>
        <div className="max-w-[68ch]">
          <label htmlFor="attivazione-ipotesi" className="mb-1.5 block text-ui font-medium text-fg-muted">
            Le tue ipotesi, in libertà
          </label>
          <Textarea id="attivazione-ipotesi" rows={4} placeholder="Scrivi quello che ti viene in mente: resta qui finché la sessione è aperta." />
        </div>
        <Objectives ref={ref} lesson={lesson} />
      </div>
    ) },
    dual: { id: "dual", title: "Dual coding: immagine e parole", technique: "Dual coding", icon: <ImageIcon className={I} />, check: lesson.diagram === "mitochondrion", render: () => <DualCoding ctx={ctx} lesson={lesson} /> },
    elaborazione: { id: "elaborazione", title: "Elaborazione: perché?", technique: "Elaborazione", icon: <HelpCircle className={I} />, check: true, render: () => <RevealPrompts label="Perché" intro="Prova a spiegare il perché prima di leggere la risposta." items={lesson.elaborative.map((e) => ({ prompt: e.question, answer: e.answer }))} onComplete={(s) => ctx.onRecall(s, "elaborazione")} /> },
    autospiegazione: { id: "autospiegazione", title: "Auto-spiegazione di un esempio svolto", technique: "Auto-spiegazione", icon: <MessageSquareText className={I} />, check: true, render: () => <RevealPrompts label="Passaggio" intro="Per ogni passaggio dell’esempio svolto, spiega a te stesso cosa succede e perché." items={lesson.selfExplanation.map((s) => ({ prompt: `${s.step}\n\n**${s.prompt}**`, answer: s.modelAnswer }))} onComplete={(s) => ctx.onRecall(s, "autospiegazione")} /> },
    feynman: { id: "feynman", title: "Tecnica di Feynman", technique: "Spiegare con parole semplici", icon: <Feather className={I} />, check: true, render: () => <FeynmanExercise topicId={ref.topic.id} onScore={(s) => ctx.onPractice?.("feynman", "Feynman", s)} /> },
    palazzo: { id: "palazzo", title: "Palazzo della memoria", technique: "Metodo dei loci", icon: <Castle className={I} />, render: () => (
      <div className="space-y-4">
        <p className="max-w-[68ch] text-base leading-relaxed text-fg-reading">Colloca i concetti da memorizzare lungo il percorso della casa. Puoi partire dai suggerimenti della lezione e personalizzare le immagini.</p>
        <MemoryPalace topicId={ref.topic.id} />
      </div>
    ) },
    interleaving: { id: "interleaving", title: "Interleaving: pratica mista", technique: "Interleaving", icon: <Shuffle className={I} />, check: mixed.length > 0, ownDock: mixed.length > 0, render: () => (
      <div className="space-y-4">
        <p className="max-w-[68ch] text-base leading-relaxed text-fg-reading">Domande dell’argomento alternate a domande di altri argomenti: prima di rispondere chiediti «che tipo di problema è?».</p>
        <QuizRunner questions={mixed} title="Pratica mista" onFinish={(o) => ctx.onQuiz(o, "Pratica mista (interleaving)", "interleaving")} />
      </div>
    ) },
    orale: { id: "orale", title: "Simulazione orale", technique: "Interrogazione", icon: <Mic className={I} />, check: true, render: () => <OralExam topicId={ref.topic.id} onComplete={(s) => ctx.onPractice?.("orale", "Simulazione orale", s)} /> },
    ripasso: { id: "ripasso", title: "Piano di ripasso", technique: "Ripetizione dilazionata", icon: <CalendarCheck className={I} />, render: () => <ReviewPlan ctx={ctx} /> },
  } satisfies Record<Exclude<StepKey, "risorse">, SessionStep>;

  const all: Record<StepKey, SessionStep> = { ...S, risorse: resStep };
  const seq = mode === "ultra" ? ULTRA_SEQUENCE[ultraKind(ref)] : MODE_SEQUENCE[mode];
  return seq.map((k) => all[k]);
}

export function useStepProgressLabel(done: Set<string>, steps: SessionStep[]) {
  return useMemo(() => `${steps.filter((s) => done.has(s.id)).length}/${steps.length}`, [done, steps]);
}

export { ResourceMiniList, ProgressBar };
