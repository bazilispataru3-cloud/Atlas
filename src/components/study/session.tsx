"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Pause, Play, Clock, Flag, Sparkles, ChevronRight, Info, BookOpenCheck } from "lucide-react";
import type { StudyMode } from "@/lib/types";
import { getTopicRef } from "@/data/syllabus";
import { getLesson } from "@/data/lessons";
import { MODE_INFO } from "@/data/academy";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { Badge, Button, Modal, Notice, ProgressBar, Segmented } from "@/components/ui/primitives";
import { buildSteps, SessionDataContext, ULTRA_RATIONALE, ultraKind, type StepCtx } from "./steps";
import type { QuizOutcome } from "@/components/exercises/quiz-runner";
import { SUBJECT_TONE, MODE_TONE, TONE } from "@/components/ui/tone";
import { cn, fmt } from "@/lib/utils";

const MODE_GLOW: Record<StudyMode, string> = {
  fast: "from-teal-400/25",
  deep: "from-indigo-400/25",
  ultra: "from-fuchsia-400/25",
};

/** Active study time: counts only while the tab is visible and not paused. */
function useActiveTimer() {
  const [paused, setPaused] = useState(false);
  const acc = useRef(0);
  const since = useRef<number | null>(Date.now());
  const [, force] = useState(0);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && since.current) {
        acc.current += Date.now() - since.current;
        since.current = null;
      } else if (!document.hidden && !paused && !since.current) since.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [paused]);

  const toggle = () => {
    if (!paused && since.current) {
      acc.current += Date.now() - since.current;
      since.current = null;
    } else if (paused) since.current = Date.now();
    setPaused((p) => !p);
    force((n) => n + 1);
  };
  const elapsedMs = () => acc.current + (since.current ? Date.now() - since.current : 0);
  const reset = () => {
    acc.current = 0;
    since.current = Date.now();
  };
  return { paused, toggle, elapsedMs, reset };
}

function TimerChip({ elapsedMs, paused, onToggle }: { elapsedMs: () => number; paused: boolean; onToggle: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <button onClick={onToggle} className={cn("flex h-9 items-center gap-2 rounded-xl border px-3 font-mono text-[13px] transition", paused ? "border-amber-400/40 text-amber-200" : "border-white/10 text-fg")} aria-label={paused ? "Riprendi il timer" : "Metti in pausa il timer"}>
      {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      <Clock className="h-3.5 w-3.5 text-fg-subtle" />
      {fmt.clock(elapsedMs() / 1000)}
    </button>
  );
}

export function StudySession({ topicId, mode }: { topicId: string; mode: StudyMode }) {
  const router = useRouter();
  const ref = getTopicRef(topicId);
  const lesson = getLesson(topicId);
  const logSession = useAtlas((s) => s.logSession);
  const recordQuizScore = useAtlas((s) => s.recordQuizScore);
  const recordRecallScore = useAtlas((s) => s.recordRecallScore);
  const saveQuizResult = useAtlas((s) => s.saveQuizResult);
  const openProfessor = useUI((s) => s.openProfessor);
  const timer = useActiveTimer();

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [sessionData, setSessionData] = useState<{ quizWrong: string[]; recallLow: string[] }>({ quizWrong: [], recallLow: [] });
  const [scores, setScores] = useState<{ label: string; value: number }[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const logged = useRef(false);

  // Stable callbacks so the step list (and quizzes inside it) never re-initialises.
  const handlers = useRef({ onQuiz: (_o: QuizOutcome, _t: string) => {}, onRecall: (_s: number) => {} });
  handlers.current.onQuiz = (o, title) => {
    if (!ref) return;
    recordQuizScore(ref.topic.id, o.ratio);
    saveQuizResult({ kind: "sessione", date: new Date().toISOString(), subject: ref.subject.id, title, correct: o.correct, wrong: o.wrong, blank: o.blank, total: o.total, score: o.score, maxScore: o.maxScore, durationSec: o.durationSec, answers: o.answers });
    setSessionData((d) => ({ ...d, quizWrong: [...new Set([...d.quizWrong, ...o.answers.filter((a) => a.correct === false).map((a) => a.questionId)])] }));
    setScores((s) => [...s, { label: title, value: o.ratio }]);
  };
  handlers.current.onRecall = (score) => {
    if (!ref) return;
    recordRecallScore(ref.topic.id, score);
    setScores((s) => [...s, { label: "Richiamo", value: score }]);
    if (score < 0.75 && lesson) setSessionData((d) => ({ ...d, recallLow: [...new Set([...d.recallLow, ...lesson.activeRecall.slice(0, 2).map((a) => a.prompt)])] }));
  };
  const onQuiz = useCallback((o: QuizOutcome, t: string) => handlers.current.onQuiz(o, t), []);
  const onRecall = useCallback((s: number) => handlers.current.onRecall(s), []);

  const steps = useMemo(() => {
    if (!ref) return [];
    const ctx: StepCtx = { ref, lesson, mode, onQuiz, onRecall };
    return buildSteps(ctx);
  }, [ref, lesson, mode, onQuiz, onRecall]);

  // Reset when topic or mode changes.
  useEffect(() => {
    setStepIndex(0);
    setDone(new Set());
  }, [topicId, mode]);

  const timerRef = useRef(timer);
  timerRef.current = timer;
  const flush = useCallback(() => {
    if (!ref || logged.current) return;
    const ms = timerRef.current.elapsedMs();
    if (ms / 60000 >= 0.5) {
      logSession({ topicId: ref.topic.id, subject: ref.subject.id, mode, start: new Date(Date.now() - ms).toISOString(), minutes: ms / 60000 });
      logged.current = true;
    }
  }, [ref, mode, logSession]);

  // Log the session when leaving the page (navigation or tab close).
  useEffect(() => {
    const onUnload = () => flush();
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      flush();
    };
  }, [flush]);

  if (!ref) {
    return (
      <Notice tone="warning" title="Argomento non trovato">
        L’argomento richiesto non esiste nel syllabus. <Link className="underline" href="/materie">Torna alle materie</Link>.
      </Notice>
    );
  }

  const step = steps[stepIndex];
  const tone = SUBJECT_TONE[ref.subject.id];
  const info = MODE_INFO[mode];
  const markDone = (id: string) => setDone((d) => new Set(d).add(id));
  const next = () => {
    markDone(step.id);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else setSummaryOpen(true);
  };

  // The page remounts the session per mode: the unmount logs the time spent so far.
  const switchMode = (m: StudyMode) => router.replace(`/studio/${topicId}?mode=${m}`);

  return (
    <SessionDataContext.Provider value={sessionData}>
      <div className="relative">
        <div className={cn("pointer-events-none absolute -top-10 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-gradient-to-b to-transparent blur-3xl", MODE_GLOW[mode])} />

        {/* Header */}
        <header className="relative space-y-4">
          <nav className="flex flex-wrap items-center gap-1 text-[12.5px] text-fg-subtle" aria-label="Percorso">
            <Link href="/materie" className="hover:text-fg-muted">Materie</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/materie/${ref.subject.id}`} className="hover:text-fg-muted">{ref.subject.name}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Unità {ref.unit.number}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/materie/${ref.subject.id}/${ref.topic.id}`} className="truncate hover:text-fg-muted">{ref.topic.title}</Link>
          </nav>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={MODE_TONE[mode]}>{info.name} · {info.claim}</Badge>
                <Badge tone={tone} dot>{ref.subject.name}</Badge>
                <Badge tone="azure">PROGRAMMA UFFICIALE</Badge>
                {lesson ? <Badge tone="muted"><BookOpenCheck className="h-3 w-3" /> Lezione completa · {lesson.readingMinutes}′ di lettura</Badge> : <Badge tone="warning">Lezione in preparazione</Badge>}
              </div>
              <h1 className="mt-3 font-display text-4xl leading-[1.05] text-fg md:text-5xl">{ref.topic.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented value={mode} onChange={switchMode} options={(["fast", "deep", "ultra"] as StudyMode[]).map((m) => ({ value: m, label: MODE_INFO[m].name.split(" ")[0] }))} />
              <TimerChip elapsedMs={timer.elapsedMs} paused={timer.paused} onToggle={timer.toggle} />
              <Button variant="secondary" onClick={() => openProfessor({ topicId })}>
                <Sparkles className="h-4 w-4 text-azure-300" /> Professor
              </Button>
              <Button variant="primary" onClick={() => setSummaryOpen(true)}>
                <Flag className="h-4 w-4" /> Termina
              </Button>
            </div>
          </div>
          {mode === "ultra" && lesson && (
            <p className="flex max-w-3xl gap-2 text-[13px] leading-relaxed text-fg-subtle">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" /> Percorso costruito per questo argomento. {ULTRA_RATIONALE[ultraKind(ref)]}
            </p>
          )}
        </header>

        <div className="relative mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Steps rail */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 flex items-center justify-between text-[12px] text-fg-subtle">
              <span>Percorso · {done.size}/{steps.length}</span>
              <span>{Math.round((done.size / Math.max(1, steps.length)) * 100)}%</span>
            </div>
            <ProgressBar value={done.size / Math.max(1, steps.length)} tone={MODE_TONE[mode]} className="mb-3" />
            <ol className="no-scrollbar flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
              {steps.map((s, i) => {
                const active = i === stepIndex;
                const isDone = done.has(s.id);
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      onClick={() => setStepIndex(i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        active ? `${TONE[MODE_TONE[mode]].border} bg-white/[0.05]` : "border-transparent hover:bg-white/[0.03]",
                      )}
                      aria-current={active ? "step" : undefined}
                    >
                      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px]", isDone ? "bg-emerald-500/20 text-emerald-300" : active ? `${TONE[MODE_TONE[mode]].bg} ${TONE[MODE_TONE[mode]].text}` : "bg-white/[0.05] text-fg-subtle")}>
                        {isDone ? <Check className="h-3.5 w-3.5" /> : s.icon}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block whitespace-nowrap text-[13px] lg:whitespace-normal", active ? "text-fg" : "text-fg-muted")}>{s.title}</span>
                        <span className="hidden text-[11px] text-fg-subtle lg:block">{s.technique}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* Step content */}
          <section key={`${mode}-${step?.id}`} className="min-w-0 animate-fade-up">
            <div className="mb-5 flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-fg-subtle">
              Passo {stepIndex + 1} di {steps.length} · {step?.technique}
            </div>
            <h2 className="mb-6 font-display text-3xl text-fg">{step?.title}</h2>
            {step?.render()}
            <div className="mt-10 flex items-center justify-between border-t border-white/[0.06] pt-5">
              <Button variant="ghost" disabled={stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)}>
                <ArrowLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button variant="primary" onClick={next}>
                {stepIndex < steps.length - 1 ? (
                  <>
                    Completa e continua <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Concludi sessione <Flag className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </section>
        </div>

        <Modal
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          title="Riepilogo della sessione"
          description={`${ref.topic.title} · ${info.name}`}
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setSummaryOpen(false)}>Continua a studiare</Button>
              <Button
                variant="primary"
                onClick={() => {
                  flush();
                  router.push("/");
                }}
              >
                Salva e torna alla dashboard
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <div className="font-mono text-2xl text-fg">{fmt.minutes(timer.elapsedMs() / 60000)}</div>
              <div className="text-[11.5px] text-fg-subtle">tempo attivo</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <div className="font-mono text-2xl text-fg">{done.size}/{steps.length}</div>
              <div className="text-[11.5px] text-fg-subtle">passi completati</div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <div className="font-mono text-2xl text-fg">{scores.length ? fmt.percent(scores.reduce((a, s) => a + s.value, 0) / scores.length) : "—"}</div>
              <div className="text-[11.5px] text-fg-subtle">media verifiche</div>
            </div>
          </div>
          {scores.length > 0 ? (
            <ul className="mt-4 space-y-1.5 text-[13px]">
              {scores.map((s, i) => (
                <li key={i} className="flex justify-between text-fg-muted"><span>{s.label}</span><span className="font-mono text-fg">{fmt.percent(s.value)}</span></li>
              ))}
            </ul>
          ) : (
            <Notice tone="info" className="mt-4">
              Non hai svolto verifiche in questa sessione: il tempo viene registrato, ma l’argomento non avanza verso «consolidato» finché non ti metti alla prova.
            </Notice>
          )}
        </Modal>
      </div>
    </SessionDataContext.Provider>
  );
}
