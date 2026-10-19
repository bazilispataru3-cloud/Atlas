"use client";

import Link from "next/link";
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
} from "lucide-react";
import type { Lesson, Question, StudyMode, TopicRef } from "@/lib/types";
import { Badge, Button, Card, Notice, ProgressBar } from "@/components/ui/primitives";
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
import { addDays, cn, fmt, shuffle } from "@/lib/utils";

export interface SessionStep {
  id: string;
  title: string;
  technique: string;
  icon: ReactNode;
  render: () => ReactNode;
}

/** Stable context passed to step builders (callbacks must be referentially stable). */
export interface StepCtx {
  ref: TopicRef;
  lesson?: Lesson;
  mode: StudyMode;
  onQuiz: (o: QuizOutcome, title: string) => void;
  onRecall: (score: number) => void;
}

/** Live data of the running session (errors, weak recalls) for the gap analysis. */
export const SessionDataContext = createContext<{ quizWrong: string[]; recallLow: string[] }>({ quizWrong: [], recallLow: [] });

const I = "h-4 w-4";

export function OfficialBox({ ref }: { ref: TopicRef }) {
  return (
    <div className="rounded-2xl border border-azure-400/25 bg-azure-500/[0.05] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="azure"><ShieldCheck className="h-3 w-3" /> PROGRAMMA UFFICIALE</Badge>
        <span className="text-[12px] text-fg-subtle">Syllabus MUR {SYLLABUS_SOURCE.label.split("a.a. ")[1]} · {ref.subject.name} · Unità {ref.unit.number} ({ref.unit.cfu} CFU)</span>
      </div>
      <p className="mt-2.5 text-[14px] leading-relaxed text-fg-muted">«{ref.topic.syllabusText}»</p>
      <a href={SYLLABUS_SOURCE.pdf[ref.subject.id]} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-azure-300 hover:underline">
        PDF ufficiale MUR <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function ReadSection({ topicId, id, title, children }: { topicId: string; id: string; title: string; children: ReactNode }) {
  const read = useAtlas((s) => s.progress[topicId]?.sectionsRead.includes(id) ?? false);
  const mark = useAtlas((s) => s.markSectionRead);
  return (
    <section className="scroll-mt-24">
      <h3 className="font-display text-[1.7rem] leading-tight text-fg">{title}</h3>
      <div className="mt-3">{children}</div>
      <button onClick={() => mark(topicId, id)} className={cn("mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] transition", read ? "text-emerald-300" : "text-fg-subtle hover:bg-white/[0.04] hover:text-fg-muted")}>
        <Check className="h-3.5 w-3.5" /> {read ? "Letto" : "Segna come letto"}
      </button>
    </section>
  );
}

function SectionsView({ lesson, topicId, compact }: { lesson: Lesson; topicId: string; compact?: boolean }) {
  return (
    <div className="space-y-10">
      {lesson.sections.map((s) => (
        <ReadSection key={s.id} topicId={topicId} id={s.id} title={s.title}>
          <Paragraphs items={compact ? s.body.slice(0, 2) : s.body} />
          {s.bullets && (
            <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {s.bullets.map((b, i) => (
                <li key={b} className="flex gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13.5px] text-fg-muted">
                  <span className="font-mono text-fg-subtle">{i + 1}</span> {b}
                </li>
              ))}
            </ol>
          )}
          {s.callout && <Notice tone={s.callout.tone === "clinical" ? "clinical" : s.callout.tone === "warning" ? "warning" : "info"} className="mt-4">{s.callout.text}</Notice>}
        </ReadSection>
      ))}
    </div>
  );
}

function Schema({ lesson }: { lesson: Lesson }) {
  return (
    <div>
      <div className="mb-3 text-[13px] text-fg-subtle">{lesson.schema.title}</div>
      <ol className="grid gap-3 md:grid-cols-5">
        {lesson.schema.steps.map((s, i) => (
          <li key={s.label} className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="font-mono text-[11px] text-teal-300">{String(i + 1).padStart(2, "0")}</div>
            <div className="mt-1 text-[14px] font-medium text-fg">{s.label}</div>
            <div className="mt-1 text-[12.5px] leading-relaxed text-fg-subtle">{s.detail}</div>
            {i < lesson.schema.steps.length - 1 && <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-fg-subtle md:block">→</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Definitions({ lesson }: { lesson: Lesson }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {lesson.definitions.map((d) => (
        <div key={d.term} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <dt className="text-[14px] font-semibold text-fg">{d.term}</dt>
          <dd className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{d.definition}</dd>
        </div>
      ))}
    </dl>
  );
}

function Objectives({ ref, lesson }: { ref: TopicRef; lesson?: Lesson }) {
  return (
    <div className="space-y-4">
      <OfficialBox ref={ref} />
      {lesson && (
        <div>
          <div className="mb-2 text-[13px] font-medium text-fg">Al termine sarai in grado di:</div>
          <ul className="space-y-1.5">
            {lesson.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-[13.5px] text-fg-muted"><Target className="mt-0.5 h-4 w-4 shrink-0 text-azure-300" /> {o}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <div className="mb-2 text-[13px] font-medium text-fg">Sottoargomenti del syllabus</div>
        <div className="flex flex-wrap gap-1.5">
          {ref.topic.subtopics.map((s) => (
            <span key={s} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[12px] text-fg-muted">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionQuiz({ ctx, questions, title, variant = "practice" }: { ctx: StepCtx; questions: Question[]; title: string; variant?: "practice" | "progressive" }) {
  if (!questions.length) return <Notice tone="info">La banca ATLAS non contiene ancora quesiti specifici per questo argomento. Prova il quiz misto della materia dalla sezione Quiz.</Notice>;
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-fg-subtle">Quesiti originali ATLAS nel formato d’esame (5 opzioni o completamento). Non sono quesiti ministeriali.</p>
      <QuizRunner questions={questions} variant={variant} title={title} onFinish={(o) => ctx.onQuiz(o, title)} />
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
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[12px] text-fg-subtle">Ultimo quiz</div>
          <div className="mt-1 font-mono text-2xl text-fg">{lastQuiz ? fmt.percent(lastQuiz.score) : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-fg-subtle">Richiami incompleti</div>
          <div className="mt-1 font-mono text-2xl text-fg">{session.recallLow.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] text-fg-subtle">Sezioni non segnate come lette</div>
          <div className="mt-1 font-mono text-2xl text-fg">{unread.length}</div>
        </Card>
      </div>
      {wrongQs.length > 0 && (
        <Card className="p-5">
          <div className="text-[13px] font-medium text-fg">Concetti da rivedere (dai quiz di questa sessione)</div>
          <ul className="mt-2 space-y-2">
            {wrongQs.map((q) => (
              <li key={q.id} className="text-[13px]">
                <div className="text-fg-muted">{q.stem}</div>
                <div className="text-fg-subtle">{q.explanation}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {session.recallLow.length > 0 && (
        <Card className="p-5">
          <div className="text-[13px] font-medium text-fg">Domande di richiamo da ripetere domani</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-fg-muted">
            {session.recallLow.map((p) => <li key={p}><RichText text={p} /></li>)}
          </ul>
        </Card>
      )}
      {!wrongQs.length && !session.recallLow.length && (
        <Notice tone="info">Completa il quiz progressivo e l’active recall: l’analisi delle lacune si basa sui tuoi errori reali, non sulla lettura.</Notice>
      )}
      {lesson && (
        <Button
          variant="secondary"
          onClick={() => {
            const n = addCards(lesson.flashcards.map((f) => ({ front: f.front, back: f.back, topicId: ref.topic.id, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
            toast(n ? `${n} flashcard aggiunte al ripasso` : "Flashcard già presenti", { tone: n ? "success" : "info" });
          }}
        >
          <GalleryVerticalEnd className="h-4 w-4" /> Programma il ripasso con le flashcard dell’argomento
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
    <div className="space-y-4">
      <p className="text-[13.5px] text-fg-muted">
        Chiudi il percorso programmando i ripassi. Le flashcard dell’argomento entrano nel sistema di ripetizione dilazionata: gli intervalli si adattano a quanto le ricordi.
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        {[1, 3, 7, 16].map((d) => (
          <div key={d} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="text-[11px] text-fg-subtle">+{d} {d === 1 ? "giorno" : "giorni"}</div>
            <div className="mt-0.5 text-[14px] capitalize text-fg">{fmt.weekday(addDays(today, d))} {fmt.dateShort(addDays(today, d))}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {lesson && (
          <Button
            variant="primary"
            onClick={() => {
              const n = addCards(lesson.flashcards.map((f) => ({ front: f.front, back: f.back, topicId: ref.topic.id, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
              setAdded(n);
            }}
          >
            <CalendarCheck className="h-4 w-4" /> Aggiungi {lesson.flashcards.length} flashcard al ripasso
          </Button>
        )}
        <Button variant="secondary" href="/calendario">Apri il calendario</Button>
      </div>
      {added !== null && <Notice tone="info">{added ? `${added} flashcard aggiunte: le prime saranno in scadenza da oggi.` : "Le flashcard erano già nel tuo mazzo."}</Notice>}
    </div>
  );
}

function AiExplain({ ref }: { ref: TopicRef }) {
  const openProfessor = useUI((s) => s.openProfessor);
  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-fg-muted">
        La lezione ATLAS completa per questo argomento è in preparazione. Puoi chiedere all’AI Professor una spiegazione al livello che preferisci, ancorata al testo ufficiale del syllabus: verifica sempre sulle fonti consigliate.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          ["Spiegazione introduttiva", "introduttivo"],
          ["Spiegazione universitaria", "universitario"],
          ["Approfondimento avanzato", "avanzato"],
        ].map(([label, level]) => (
          <Button key={level} variant="secondary" onClick={() => openProfessor({ topicId: ref.topic.id, prompt: `Spiegami l’argomento «${ref.topic.title}» a livello ${level}, seguendo i sottoargomenti del syllabus.` })}>
            <Sparkles className="h-4 w-4 text-azure-300" /> {label}
          </Button>
        ))}
      </div>
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
      <div className="space-y-3">
        <ResourceMiniList resources={resources.slice(0, 8)} />
        <Button variant="secondary" href={`/risorse?topic=${ref.topic.id}`}>
          <Search className="h-4 w-4" /> Cerca altre risorse per questo argomento
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
        render: () => (
          <RevealPrompts
            intro="Dopo aver studiato sulle fonti, prova a spiegare ogni sottoargomento senza guardare. Come riferimento c’è il testo ufficiale: confronta e valuta con onestà."
            items={ref.topic.subtopics.slice(0, 8).map((s) => ({ prompt: `Che cosa sai dire su: **${s}**?`, answer: `Riferimento ufficiale: «${s}». Controlla sulle fonti consigliate i punti che non hai saputo spiegare.` }))}
            onComplete={ctx.onRecall}
          />
        ),
      },
      {
        id: "quiz",
        title: topicQs.length ? "Quiz sull’argomento" : `Quiz misto di ${ref.subject.name}`,
        technique: "Pratica di recupero",
        icon: <ListChecks className={I} />,
        render: () => <SessionQuiz ctx={ctx} questions={fallbackQuiz} title={`Quiz · ${ref.topic.title}`} />,
      },
    ];
  }

  const quick = shuffle(topicQs.filter((q) => q.type !== "open"), 11).slice(0, 8);
  const progressive = topicQs;
  const others = shuffle(QUESTIONS.filter((q) => q.topicId !== ref.topic.id && q.type !== "open" && (q.subject === ref.subject.id || q.skill === "calcolo")), 17).slice(0, 4);
  const mine = shuffle(topicQs.filter((q) => q.type !== "open"), 19).slice(0, 4);
  const mixed = mine.flatMap((q, i) => (others[i] ? [q, others[i]] : [q]));

  const S = {
    riassunto: { id: "riassunto", title: "Riassunto essenziale", technique: "Sintesi", icon: <BookOpen className={I} />, render: () => (
      <ul className="space-y-3">
        {lesson.fastSummary.map((p, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-[14.5px] leading-relaxed text-fg-muted">
            <span className="font-mono text-[12px] text-teal-300">{String(i + 1).padStart(2, "0")}</span>
            <span><RichText text={p} /></span>
          </li>
        ))}
      </ul>
    ) },
    definizioni: { id: "definizioni", title: "Definizioni essenziali", technique: "Definizioni", icon: <KeyRound className={I} />, render: () => <Definitions lesson={lesson} /> },
    schema: { id: "schema", title: "Schema sintetico", technique: "Schema", icon: <Workflow className={I} />, render: () => <Schema lesson={lesson} /> },
    concetti: { id: "concetti", title: "Concetti chiave e syllabus", technique: "Obiettivi", icon: <Target className={I} />, render: () => (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {lesson.keyConcepts.map((k) => <span key={k} className="rounded-xl border border-teal-300/20 bg-teal-300/[0.06] px-3 py-1.5 text-[13px] text-teal-50">{k}</span>)}
        </div>
        <Objectives ref={ref} lesson={lesson} />
      </div>
    ) },
    flashcard: { id: "flashcard", title: "Flashcard rapide", technique: "Retrieval", icon: <GalleryVerticalEnd className={I} />, render: () => <FlipCards cards={lesson.flashcards.slice(0, 9)} topicId={ref.topic.id} subject={ref.subject.id} deck={ref.topic.title} /> },
    quizRapido: { id: "quiz", title: `Quiz rapido (${quick.length} domande)`, technique: "Pratica di recupero", icon: <ListChecks className={I} />, render: () => <SessionQuiz ctx={ctx} questions={quick} title={`Quiz rapido · ${ref.topic.title}`} /> },
    lezione: { id: "lezione", title: "Lezione introduttiva", technique: "Contesto", icon: <BookOpen className={I} />, render: () => (
      <div className="space-y-5">
        <Paragraphs items={lesson.intro} className="text-[15.5px]" />
        <OfficialBox ref={ref} />
      </div>
    ) },
    spiegazione: { id: "spiegazione", title: "Spiegazione approfondita", technique: "Studio strutturato", icon: <BookOpen className={I} />, render: () => <SectionsView lesson={lesson} topicId={ref.topic.id} compact={mode === "ultra"} /> },
    esempi: { id: "esempi", title: "Esempi e applicazioni", technique: "Esempi", icon: <Lightbulb className={I} />, render: () => (
      <div className="space-y-5">
        {lesson.diagram && (
          <Card className="p-4">
            <LessonDiagram kind={lesson.diagram} />
            <p className="mt-2 text-[12px] text-fg-subtle">{DIAGRAM_CAPTION[lesson.diagram]}</p>
          </Card>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {lesson.examples.map((e) => (
            <Card key={e.title} className="p-5">
              <div className="text-[14.5px] font-medium text-fg">{e.title}</div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">{e.body}</p>
            </Card>
          ))}
        </div>
      </div>
    ) },
    mappa: { id: "mappa", title: "Mappa concettuale", technique: "Organizzazione", icon: <Network className={I} />, render: () => <Card className="p-4"><ConceptMapView map={lesson.conceptMap} /></Card> },
    recall: { id: "recall", title: "Active recall", technique: "Active recall", icon: <Brain className={I} />, render: () => <RevealPrompts intro="Rispondi senza guardare la lezione, poi confronta." items={lesson.activeRecall.map((a) => ({ prompt: a.prompt, answer: a.answer }))} onComplete={ctx.onRecall} /> },
    cornell: { id: "cornell", title: "Metodo Cornell", technique: "Cornell", icon: <NotebookPen className={I} />, render: () => <CornellEditor topicId={ref.topic.id} seedCues={lesson.activeRecall.map((a) => a.prompt)} /> },
    problemi: { id: "problemi", title: "Problemi ed esercizi guidati", technique: "Problem solving", icon: <Calculator className={I} />, render: () => <GuidedProblems problems={lesson.guidedProblems} /> },
    quizProgressivo: { id: "quiz-progressivo", title: "Quiz progressivo", technique: "Pratica di recupero", icon: <ListChecks className={I} />, render: () => <SessionQuiz ctx={ctx} questions={progressive} title={`Quiz progressivo · ${ref.topic.title}`} variant="progressive" /> },
    lacune: { id: "lacune", title: "Analisi delle lacune", technique: "Metacognizione", icon: <Search className={I} />, render: () => <GapAnalysis ctx={ctx} /> },
    attivazione: { id: "attivazione", title: "Attivazione: cosa sai già?", technique: "Pre-test", icon: <Lightbulb className={I} />, render: () => (
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed text-fg-muted">Prima di studiare, prova a rispondere: anche sbagliare un pre-test migliora l’apprendimento successivo, perché orienta l’attenzione. Questa fase non conta nei progressi.</p>
        <ul className="space-y-2">
          {lesson.elaborative.slice(0, 3).map((e) => (
            <li key={e.question} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[14px] text-fg">{e.question}</li>
          ))}
        </ul>
        <textarea rows={4} className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-fg focus:border-azure-400/60 focus:outline-none" placeholder="Le tue ipotesi, in libertà…" aria-label="Ipotesi iniziali" />
        <Objectives ref={ref} lesson={lesson} />
      </div>
    ) },
    dual: { id: "dual", title: "Dual coding: immagine + parole", technique: "Dual coding", icon: <ImageIcon className={I} />, render: () => (
      <div className="space-y-4">
        {lesson.diagram && (
          <Card className="p-4">
            <LessonDiagram kind={lesson.diagram} />
            <p className="mt-2 text-[12px] text-fg-subtle">{DIAGRAM_CAPTION[lesson.diagram]}</p>
          </Card>
        )}
        <Schema lesson={lesson} />
        {lesson.diagram === "mitochondrion" ? (
          <Card className="p-5"><div className="mb-3 text-[14px] font-medium text-fg">Ora etichetta il diagramma senza aiuti</div><LabelDiagramExercise onComplete={ctx.onRecall} /></Card>
        ) : (
          <Notice tone="info">Ridisegna il diagramma su carta senza guardarlo e descrivilo ad alta voce: è il cuore del dual coding.</Notice>
        )}
      </div>
    ) },
    elaborazione: { id: "elaborazione", title: "Elaborazione: perché?", technique: "Elaborazione", icon: <HelpCircle className={I} />, render: () => <RevealPrompts label="Perché" intro="Prova a spiegare il perché prima di leggere la risposta." items={lesson.elaborative.map((e) => ({ prompt: e.question, answer: e.answer }))} onComplete={ctx.onRecall} /> },
    autospiegazione: { id: "autospiegazione", title: "Auto-spiegazione di un esempio svolto", technique: "Auto-spiegazione", icon: <MessageSquareText className={I} />, render: () => <RevealPrompts label="Passaggio" intro="Per ogni passaggio dell’esempio svolto, spiega a te stesso cosa succede e perché." items={lesson.selfExplanation.map((s) => ({ prompt: `${s.step}\n\n**${s.prompt}**`, answer: s.modelAnswer }))} onComplete={ctx.onRecall} /> },
    feynman: { id: "feynman", title: "Tecnica di Feynman", technique: "Feynman", icon: <Feather className={I} />, render: () => <FeynmanExercise topicId={ref.topic.id} onScore={() => undefined} /> },
    palazzo: { id: "palazzo", title: "Palazzo della memoria", technique: "Metodo dei loci", icon: <Castle className={I} />, render: () => (
      <div className="space-y-3">
        <p className="text-[13.5px] text-fg-muted">Colloca i concetti da memorizzare lungo il percorso della casa. Puoi partire dai suggerimenti della lezione e personalizzare le immagini.</p>
        <MemoryPalace topicId={ref.topic.id} />
      </div>
    ) },
    interleaving: { id: "interleaving", title: "Interleaving: pratica mista", technique: "Interleaving", icon: <Shuffle className={I} />, render: () => (
      <div className="space-y-3">
        <p className="text-[13.5px] text-fg-muted">Domande dell’argomento alternate a domande di altri argomenti: prima di rispondere chiediti «che tipo di problema è?».</p>
        <QuizRunner questions={mixed} title="Pratica mista" onFinish={(o) => ctx.onQuiz(o, "Pratica mista (interleaving)")} />
      </div>
    ) },
    orale: { id: "orale", title: "Simulazione orale", technique: "Interrogazione", icon: <Mic className={I} />, render: () => <OralExam topicId={ref.topic.id} onComplete={() => undefined} /> },
    ripasso: { id: "ripasso", title: "Piano di ripasso", technique: "Ripetizione dilazionata", icon: <CalendarCheck className={I} />, render: () => <ReviewPlan ctx={ctx} /> },
  } satisfies Record<string, SessionStep>;

  if (mode === "fast") return [S.riassunto, S.definizioni, S.schema, S.concetti, S.flashcard, S.quizRapido];
  if (mode === "deep") return [S.lezione, S.spiegazione, S.esempi, S.mappa, S.recall, S.cornell, S.problemi, S.quizProgressivo, S.lacune, resStep];

  // Ultra: the path adapts to the nature of the topic.
  const kind = ultraKind(ref);
  if (kind === "quantitativo") return [S.attivazione, S.dual, S.spiegazione, S.autospiegazione, S.problemi, S.interleaving, S.feynman, S.orale, S.ripasso];
  if (kind === "misto") return [S.attivazione, S.spiegazione, S.dual, S.autospiegazione, S.problemi, S.elaborazione, S.feynman, S.interleaving, S.ripasso];
  return [S.attivazione, S.dual, S.spiegazione, S.elaborazione, S.feynman, S.palazzo, S.interleaving, S.orale, S.ripasso];
}

export type UltraKind = "meccanistico" | "quantitativo" | "misto";

export function ultraKind(ref: TopicRef): UltraKind {
  if (ref.subject.id === "fisica") return "quantitativo";
  if (ref.subject.id === "chimica") return "misto";
  return "meccanistico";
}

export const ULTRA_RATIONALE: Record<UltraKind, string> = {
  meccanistico:
    "Argomento ricco di meccanismi e terminologia: il percorso privilegia dual coding ed elaborazione per la comprensione, Feynman per verificare la spiegazione, il palazzo della memoria per le sequenze e l’interrogazione per il recupero.",
  quantitativo:
    "Argomento quantitativo: il percorso privilegia auto-spiegazione di esempi svolti, problemi guidati e interleaving, che allenano a riconoscere quale legge applicare.",
  misto:
    "Argomento che unisce concetti e calcoli: alterna auto-spiegazione e problemi guidati all’elaborazione dei perché, poi verifica con Feynman e pratica mista.",
};

export function useStepProgressLabel(done: Set<string>, steps: SessionStep[]) {
  return useMemo(() => `${steps.filter((s) => done.has(s.id)).length}/${steps.length}`, [done, steps]);
}

export { ResourceMiniList, ProgressBar };
