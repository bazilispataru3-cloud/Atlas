"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  FileText,
  Flag,
  GalleryVerticalEnd,
  Hourglass,
  ListChecks,
  MoreHorizontal,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import type { StudyMode } from "@/lib/types";
import { getTopicRef } from "@/data/syllabus";
import { getLesson } from "@/data/lessons";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { useReducedMotion, useTopicStates } from "@/lib/hooks";
import { Button, EmptyState, Meridian, Modal, Notice, Sheet } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { buildSteps, SessionDataContext, type SessionStep, type StepCtx } from "./steps";
import { clockLabel, minutesLabel, MODE_META, MODES, nextTopic, NO_LESSON_STEPS, ULTRA_KIND_SUBJECT, ULTRA_RATIONALE, ultraKind } from "./paths";
import type { QuizOutcome } from "@/components/exercises/quiz-runner";
import { SUBJECT_TONE, MODE_TONE, TONE } from "@/components/ui/tone";
import { fmt } from "@/lib/utils";
import { cx } from "./cx";

/** After this long without any input the timer pauses itself (and counts only up to the last input). */
const IDLE_MS = 10 * 60_000;
/** Sessions shorter than this are not recorded (same threshold as the store's progress). */
const MIN_LOGGED_MS = 30_000;

// ── Active timer ──────────────────────────────────────────────

/** Active study time: counts only while the tab is visible, not paused and the student is there. */
function useActiveTimer() {
  const [paused, setPaused] = useState(false);
  const [idle, setIdle] = useState(false);
  const acc = useRef(0);
  const since = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const idleRef = useRef(false);
  const lastInput = useRef(0);

  const stop = useCallback((at?: number) => {
    if (since.current === null) return;
    acc.current += Math.max(0, (at ?? Date.now()) - since.current);
    since.current = null;
  }, []);
  const start = useCallback(() => {
    if (since.current === null) since.current = Date.now();
  }, []);

  useEffect(() => {
    lastInput.current = Date.now();
    if (!document.hidden) start();

    const onVis = () => {
      if (document.hidden) stop();
      else if (!pausedRef.current) {
        lastInput.current = Date.now();
        start();
      }
    };
    const onInput = () => {
      lastInput.current = Date.now();
      if (idleRef.current) {
        idleRef.current = false;
        pausedRef.current = false;
        start();
        setIdle(false);
        setPaused(false);
        toast("Timer ripreso", { tone: "info" });
      }
    };
    const check = window.setInterval(() => {
      if (pausedRef.current || since.current === null) return;
      if (Date.now() - lastInput.current >= IDLE_MS) {
        stop(Math.max(since.current, lastInput.current));
        pausedRef.current = true;
        idleRef.current = true;
        setPaused(true);
        setIdle(true);
        toast("Timer in pausa", { description: "Nessuna attività da 10 minuti: quel tempo non viene contato. Il timer riparte appena torni.", tone: "info" });
      }
    }, 15_000);
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    document.addEventListener("visibilitychange", onVis);
    events.forEach((ev) => window.addEventListener(ev, onInput, { passive: true }));
    return () => {
      window.clearInterval(check);
      document.removeEventListener("visibilitychange", onVis);
      events.forEach((ev) => window.removeEventListener(ev, onInput));
    };
  }, [start, stop]);

  const toggle = () => {
    if (pausedRef.current) {
      pausedRef.current = false;
      idleRef.current = false;
      lastInput.current = Date.now();
      start();
      setPaused(false);
      setIdle(false);
    } else {
      stop();
      pausedRef.current = true;
      setPaused(true);
    }
  };
  const elapsedMs = useCallback(() => acc.current + (since.current !== null ? Date.now() - since.current : 0), []);
  return { paused, idle, toggle, elapsedMs };
}

function SessionTimer({ elapsedMs, paused, idle, onToggle, className }: { elapsedMs: () => number; paused: boolean; idle: boolean; onToggle: () => void; className?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <button
      type="button"
      onClick={onToggle}
      title={paused ? "Riprendi il timer" : "Metti in pausa il timer"}
      className={cx(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-sm transition-colors duration-150 lg:h-10",
        paused ? "border-warning/30 bg-warning/[0.07] text-orange-200 hover:bg-warning/[0.12]" : "border-white/[0.09] text-fg hover:border-white/[0.16] hover:bg-white/[0.04]",
        className,
      )}
    >
      {paused ? <Play className="h-3.5 w-3.5 fill-current" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
      <span className="sr-only">{paused ? "Riprendi il timer." : "Metti in pausa il timer."} </span>
      <span className={cx("hidden text-ui sm:inline", paused ? "text-orange-200" : "text-fg-muted")}>{paused ? (idle ? "In pausa, inattivo" : "In pausa") : "Tempo attivo"}</span>
      <span className="font-medium tabular-nums">{clockLabel(elapsedMs())}</span>
    </button>
  );
}

// ── Mode switch ───────────────────────────────────────────────

/** The three modes as links (each one is another page); switching asks first when progress would be lost. */
function ModeSwitch({ topicId, mode, onRequest, className }: { topicId: string; mode: StudyMode; onRequest: (m: StudyMode, e: ReactMouseEvent) => void; className?: string }) {
  return (
    <nav aria-label="Modalità di studio" className={cx("grid grid-cols-3 gap-0.5 rounded-control border border-white/[0.08] bg-white/[0.03] p-[3px]", className)}>
      {MODES.map((m) => {
        const meta = MODE_META[m];
        const Icon = meta.icon;
        const active = m === mode;
        return (
          <Link
            key={m}
            href={`/studio/${topicId}?mode=${m}`}
            replace
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              if (active) e.preventDefault();
              else onRequest(m, e);
            }}
            className={cx(
              "inline-flex h-11 items-center justify-center gap-1.5 rounded-[7px] text-ui font-medium transition-[background-color,color] duration-150 lg:h-8",
              active ? "bg-white/[0.1] text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_1px_2px_rgb(0_0_0/0.4)]" : "text-fg-muted hover:bg-white/[0.04] hover:text-fg",
            )}
          >
            <Icon className={cx("h-3.5 w-3.5", active ? TONE[MODE_TONE[m]].text : "text-fg-subtle")} aria-hidden />
            {meta.name}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Step rail ─────────────────────────────────────────────────

function StepMarker({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        "relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-medium tabular-nums transition-[background-color,border-color,color] duration-200",
        done
          ? "border-azure-400/70 bg-azure-500 text-white"
          : active
            ? "border-azure-300 bg-ink-950 text-azure-200 shadow-[0_0_0_3px_rgb(61_139_255/0.16)]"
            : "border-white/[0.14] bg-ink-950 text-fg-muted",
      )}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.75} /> : n}
    </span>
  );
}

/** Index of the sections of a long reading step, with what is already marked as read. */
function SectionToc({ toc, topicId, onJump }: { toc: NonNullable<SessionStep["toc"]>; topicId: string; onJump: (anchor: string) => void }) {
  const read = useAtlas((s) => s.progress[topicId]?.sectionsRead);
  return (
    <ul className="mb-2 ml-9 mt-0.5 space-y-px" aria-label="Sezioni del passo">
      {toc.map((t) => {
        const isRead = !!read?.includes(t.id.replace(/^sezione-/, ""));
        return (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              onClick={(e) => {
                e.preventDefault();
                onJump(t.id);
              }}
              className="flex min-h-9 items-center gap-2 rounded-md py-1 pr-1 text-xs leading-snug text-fg-muted transition-colors duration-150 hover:text-fg lg:min-h-7"
            >
              {isRead ? <Check className="h-3 w-3 shrink-0 text-success" aria-hidden /> : <span className="mx-[3px] h-1.5 w-1.5 shrink-0 rounded-full border border-fg-subtle" aria-hidden />}
              <span>
                {t.title}
                {isRead && <span className="sr-only"> (letta)</span>}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** The path as a vertical route: the Meridian lights up the stretch already travelled, up to the current step. */
function StepRail({
  steps,
  index,
  done,
  topicId,
  onGo,
  onJump,
}: {
  steps: SessionStep[];
  index: number;
  done: Set<string>;
  topicId: string;
  onGo: (i: number) => void;
  onJump: (anchor: string) => void;
}) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const active = i === index;
        const isDone = done.has(s.id);
        return (
          <li key={s.id} className="relative">
            {i < steps.length - 1 && (
              // From the bottom of this marker to the top of the next one (the in-step index sits in between).
              <div className="pointer-events-none absolute -bottom-2 left-[11px] top-8" aria-hidden>
                <Meridian orientation="vertical" value={i < index ? 1 : 0} />
              </div>
            )}
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={active ? "step" : undefined}
              className={cx(
                "group relative flex min-h-11 w-full items-start gap-3 rounded-lg py-2 pr-2 text-left transition-colors duration-150 lg:min-h-10",
                !active && "hover:bg-white/[0.03]",
              )}
            >
              <StepMarker n={i + 1} active={active} done={isDone} />
              <span className={cx("min-w-0 pt-[3px] text-ui leading-snug", active ? "font-medium text-fg" : "text-fg-muted group-hover:text-fg")}>
                {s.title}
                <span className="sr-only">{isDone ? ", completato" : ""}</span>
              </span>
            </button>
            {active && s.toc && <SectionToc toc={s.toc} topicId={topicId} onJump={onJump} />}
          </li>
        );
      })}
    </ol>
  );
}

// ── Session ───────────────────────────────────────────────────

type Persisted = { index: number; done: string[]; verified: string[]; visited: number[]; scores: { label: string; value: number }[]; data: { quizWrong: string[]; recallLow: string[] } };

export function StudySession({ topicId, mode }: { topicId: string; mode: StudyMode }) {
  const router = useRouter();
  const ref = getTopicRef(topicId);
  const lesson = getLesson(topicId);
  const logSession = useAtlas((s) => s.logSession);
  const recordQuizScore = useAtlas((s) => s.recordQuizScore);
  const recordRecallScore = useAtlas((s) => s.recordRecallScore);
  const saveQuizResult = useAtlas((s) => s.saveQuizResult);
  const addCards = useAtlas((s) => s.addCards);
  const openProfessor = useUI((s) => s.openProfessor);
  const reduceMotion = useReducedMotion();
  const timer = useActiveTimer();
  const subjectStates = useTopicStates(ref?.subject.id);

  const [stepIndex, setStepIndex] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [verified, setVerified] = useState<Set<string>>(() => new Set());
  const [sessionData, setSessionData] = useState<{ quizWrong: string[]; recallLow: string[] }>({ quizWrong: [], recallLow: [] });
  const [scores, setScores] = useState<{ label: string; value: number }[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [pathOpen, setPathOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<StudyMode | null>(null);
  const logged = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const chipsRef = useRef<HTMLOListElement>(null);
  const focusStep = useRef(false);
  const restored = useRef(false);
  const storeKey = `atlas-studio:${topicId}:${mode}`;

  // Stable callbacks so the step list (and the exercises inside it) never re-initialises.
  const handlers = useRef({
    onQuiz: (_o: QuizOutcome, _t: string, _id?: string) => {},
    onRecall: (_s: number, _id?: string) => {},
    onPractice: (_id: string, _label: string, _s?: number) => {},
  });
  const verify = (id?: string) => {
    if (id) setVerified((v) => new Set(v).add(id));
  };
  handlers.current.onQuiz = (o, title, id) => {
    if (!ref) return;
    recordQuizScore(ref.topic.id, o.ratio);
    saveQuizResult({ kind: "sessione", date: new Date().toISOString(), subject: ref.subject.id, title, correct: o.correct, wrong: o.wrong, blank: o.blank, total: o.total, score: o.score, maxScore: o.maxScore, durationSec: o.durationSec, answers: o.answers });
    setSessionData((d) => ({ ...d, quizWrong: [...new Set([...d.quizWrong, ...o.answers.filter((a) => a.correct === false).map((a) => a.questionId)])] }));
    setScores((s) => [...s, { label: title, value: o.ratio }]);
    verify(id);
  };
  handlers.current.onRecall = (score, id) => {
    if (!ref) return;
    recordRecallScore(ref.topic.id, score);
    setScores((s) => [...s, { label: id === "elaborazione" ? "Elaborazione" : id === "autospiegazione" ? "Auto-spiegazione" : id === "dual" ? "Etichette del diagramma" : "Richiamo attivo", value: score }]);
    if (score < 0.75 && lesson) setSessionData((d) => ({ ...d, recallLow: [...new Set([...d.recallLow, ...lesson.activeRecall.slice(0, 2).map((a) => a.prompt)])] }));
    verify(id);
  };
  handlers.current.onPractice = (id, label, score) => {
    if (typeof score === "number") setScores((s) => [...s, { label, value: score }]);
    verify(id);
  };
  const onQuiz = useCallback((o: QuizOutcome, t: string, id?: string) => handlers.current.onQuiz(o, t, id), []);
  const onRecall = useCallback((s: number, id?: string) => handlers.current.onRecall(s, id), []);
  const onPractice = useCallback((id: string, label: string, s?: number) => handlers.current.onPractice(id, label, s), []);

  const steps = useMemo(() => {
    if (!ref) return [];
    const ctx: StepCtx = { ref, lesson, mode, onQuiz, onRecall, onPractice };
    return buildSteps(ctx);
  }, [ref, lesson, mode, onQuiz, onRecall, onPractice]);

  // Resume the place in the path after a reload or a detour in this tab.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        const ids = new Set(steps.map((s) => s.id));
        if (Number.isInteger(p.index) && p.index >= 0 && p.index < steps.length) {
          setStepIndex(p.index);
          setVisited(new Set([0, p.index, ...(p.visited ?? []).filter((i) => i >= 0 && i < steps.length)]));
          setDone(new Set((p.done ?? []).filter((id) => ids.has(id))));
          setVerified(new Set((p.verified ?? []).filter((id) => ids.has(id))));
          if (Array.isArray(p.scores)) setScores(p.scores);
          if (p.data) setSessionData(p.data);
          if (p.index > 0) toast(`Ripreso dal passo ${p.index + 1}`, { description: steps[p.index].title, tone: "info" });
        }
      }
    } catch {
      /* storage unavailable: start from the first step */
    }
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      const p: Persisted = { index: stepIndex, done: [...done], verified: [...verified], visited: [...visited], scores, data: sessionData };
      sessionStorage.setItem(storeKey, JSON.stringify(p));
    } catch {
      /* not essential */
    }
  }, [storeKey, stepIndex, done, verified, visited, scores, sessionData]);
  const forget = useCallback((key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, []);

  const timerRef = useRef(timer);
  useEffect(() => {
    timerRef.current = timer;
  });
  const flush = useCallback(() => {
    if (!ref || logged.current) return false;
    const ms = timerRef.current.elapsedMs();
    if (ms < MIN_LOGGED_MS) return false;
    logSession({ topicId: ref.topic.id, subject: ref.subject.id, mode, start: new Date(Date.now() - ms).toISOString(), minutes: ms / 60000 });
    logged.current = true;
    return true;
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

  // A quiz kept mounted in a hidden step must not react to letters / Enter typed elsewhere.
  const guard = useRef(false);
  const step = steps[stepIndex];
  useEffect(() => {
    guard.current = !step?.ownDock && steps.some((s, i) => s.ownDock && visited.has(i));
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!guard.current || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && t !== document.body && t.id !== "contenuto") return;
      if (/^(Enter|[a-eA-E1-5])$/.test(e.key)) e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // After a change of step: focus the step title and bring it into view; centre the chip on phones.
  useEffect(() => {
    const c = chipsRef.current;
    const chip = c?.querySelector<HTMLElement>(`[data-step="${stepIndex}"]`);
    if (c && chip) {
      const left = chip.getBoundingClientRect().left - c.getBoundingClientRect().left + c.scrollLeft - (c.clientWidth - chip.offsetWidth) / 2;
      c.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
    }
    if (!focusStep.current) return;
    focusStep.current = false;
    const h = headingRef.current;
    if (!h) return;
    h.focus({ preventScroll: true });
    const top = h.getBoundingClientRect().top;
    if (top < 64 || top > window.innerHeight * 0.45) h.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }, [stepIndex, reduceMotion]);

  if (!ref || !step) {
    return (
      <EmptyState
        title="Argomento non trovato"
        description="L’argomento richiesto non esiste nel syllabus."
        action={
          <Button variant="primary" href="/materie">
            Torna alle materie
          </Button>
        }
      />
    );
  }

  const n = steps.length;
  const isLast = stepIndex === n - 1;
  const meta = MODE_META[mode];
  const ModeIcon = meta.icon;
  const kind = ultraKind(ref);
  const pendingCheck = !!step.check && !verified.has(step.id);
  /** The session bar sticks (desktop) / is fixed (phones) unless the exercise has its own dock in use. */
  const stickyNav = !(step.ownDock && !verified.has(step.id));
  const topicHref = `/materie/${ref.subject.id}/${ref.topic.id}`;
  const progressLost = done.size > 0 || visited.size > 1 || scores.length > 0;

  const goTo = (i: number) => {
    if (i < 0 || i >= n) return;
    focusStep.current = true;
    setStepIndex(i);
    setVisited((v) => (v.has(i) ? v : new Set(v).add(i)));
  };
  const next = () => {
    if (!pendingCheck) setDone((d) => (d.has(step.id) ? d : new Set(d).add(step.id)));
    if (isLast) setSummaryOpen(true);
    else goTo(stepIndex + 1);
  };
  const jumpToSection = (anchor: string) => {
    setPathOpen(false);
    window.setTimeout(() => {
      const el = document.getElementById(anchor);
      if (!el) return;
      el.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
      document.getElementById(`${anchor}-h`)?.focus({ preventScroll: true });
    }, 60);
  };
  const requestMode = (m: StudyMode, e: ReactMouseEvent) => {
    setOptionsOpen(false);
    if (progressLost) {
      e.preventDefault();
      setPendingMode(m);
    } else forget(storeKey);
  };
  const confirmMode = () => {
    if (!pendingMode) return;
    forget(storeKey);
    router.replace(`/studio/${topicId}?mode=${pendingMode}`);
    setPendingMode(null);
  };

  const nextLabel = pendingCheck ? (isLast ? "Concludi senza verifica" : "Salta e continua") : isLast ? "Concludi la sessione" : "Completa e continua";
  const NextIcon = isLast ? Flag : ArrowRight;
  const showTechnique = !step.title.toLowerCase().includes(step.technique.toLowerCase());
  const elapsed = timer.elapsedMs();

  const modeSwitch = (cls?: string) => lesson && <ModeSwitch topicId={topicId} mode={mode} onRequest={requestMode} className={cls} />;
  const ultraWhy = mode === "ultra" && lesson && (
    <details className="group text-ui">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg text-fg-muted transition-colors hover:text-fg lg:min-h-8 [&::-webkit-details-marker]:hidden">
        <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Perché questo percorso
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
        Percorso per {ULTRA_KIND_SUBJECT[kind].label}. {ULTRA_RATIONALE[kind]}
      </p>
    </details>
  );

  return (
    <SessionDataContext.Provider value={sessionData}>
      {/* Header: compact on phones so the lesson starts in the first screen */}
      <header>
        <div className="flex items-center gap-2">
          <nav aria-label="Percorso di navigazione" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-1 text-ui text-fg-muted">
              <li className="hidden items-center gap-1 sm:flex">
                <Link href="/materie" className="inline-flex min-h-8 items-center rounded-md transition-colors hover:text-fg">
                  Materie
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
              </li>
              <li className="flex min-w-0 items-center gap-1">
                <Link href={`/materie/${ref.subject.id}`} className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md pl-1 pr-1.5 transition-colors hover:text-fg sm:ml-0 sm:min-h-8 sm:px-0">
                  <ArrowLeft className="h-4 w-4 sm:hidden" aria-hidden />
                  {ref.subject.name}
                </Link>
                <ChevronRight className="hidden h-3.5 w-3.5 text-fg-subtle sm:block" aria-hidden />
              </li>
              <li className="hidden min-w-0 sm:flex">
                <Link href={topicHref} className="inline-flex min-h-8 min-w-0 items-center rounded-md transition-colors hover:text-fg">
                  <span className="truncate">Scheda dell’argomento</span>
                </Link>
              </li>
            </ol>
          </nav>
          <SessionTimer elapsedMs={timer.elapsedMs} paused={timer.paused} idle={timer.idle} onToggle={timer.toggle} className="lg:hidden" />
          <Button variant="ghost" size="icon" className="h-11 w-11 lg:hidden" aria-label="Opzioni della sessione" aria-haspopup="dialog" onClick={() => setOptionsOpen(true)}>
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <div className="mt-1 flex flex-col gap-4 sm:mt-2 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] leading-[1.12] tracking-[-0.015em] text-fg sm:text-4xl lg:text-[2.625rem] lg:leading-[1.08]">{ref.topic.title}</h1>
            <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-ui text-fg-muted">
              {lesson && (
                <li className="inline-flex items-center gap-1.5">
                  <ModeIcon className={cx("h-3.5 w-3.5", TONE[MODE_TONE[mode]].text)} aria-hidden />
                  <span>
                    <span className="sr-only">Modalità </span>
                    {meta.name}, {meta.time}
                  </span>
                </li>
              )}
              <li className="inline-flex items-center gap-1.5">
                <span className={cx("h-2 w-2 rounded-full", TONE[SUBJECT_TONE[ref.subject.id]].dot)} aria-hidden />
                {ref.subject.name}, unità {ref.unit.number}
              </li>
              <li className="inline-flex items-center gap-1.5">
                {lesson ? (
                  <>
                    <BookOpenCheck className="h-3.5 w-3.5 text-fg-subtle" aria-hidden /> Lezione completa, {lesson.readingMinutes} min di lettura
                  </>
                ) : (
                  <>
                    <Hourglass className="h-3.5 w-3.5 text-fg-subtle" aria-hidden /> Lezione in preparazione
                  </>
                )}
              </li>
            </ul>
          </div>
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <SessionTimer elapsedMs={timer.elapsedMs} paused={timer.paused} idle={timer.idle} onToggle={timer.toggle} />
            <Button variant="secondary" onClick={() => openProfessor({ topicId })}>
              <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> Chiedi al Professor
            </Button>
            <Button variant="ghost" onClick={() => setSummaryOpen(true)}>
              <Flag className="h-4 w-4" aria-hidden /> Termina sessione
            </Button>
          </div>
        </div>

        {!lesson && (
          <Notice tone="info" className="mt-5 max-w-3xl" title={`La lezione ATLAS su «${ref.topic.title}» è in preparazione`}>
            Intanto segui questo percorso guidato in {NO_LESSON_STEPS.length} passi: obiettivi ufficiali, video consigliati, spiegazione dell’AI Professor, richiamo attivo e quiz. Fast, Deep e Ultra saranno disponibili con la lezione completa.
          </Notice>
        )}
      </header>

      <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[16.5rem_minmax(0,1fr)] xl:gap-16">
        {/* Desktop rail: sticky, the Meridian runs along the path */}
        <aside className="hidden lg:block" aria-label="Percorso della sessione">
          <div className="no-scrollbar sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-fg">{lesson ? `Percorso ${meta.name}` : "Percorso guidato"}</h2>
              <span className="text-xs tabular-nums text-fg-muted">
                {done.size} di {n} completati
              </span>
            </div>
            {modeSwitch("mt-3")}
            {ultraWhy && <div className="mt-1">{ultraWhy}</div>}
            <div className="mt-4">
              <StepRail steps={steps} index={stepIndex} done={done} topicId={ref.topic.id} onGo={goTo} onJump={jumpToSection} />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Phone and tablet rail: scrollable chips, the active one kept in view */}
          <nav className="lg:hidden" aria-label="Passi del percorso">
            <ol ref={chipsRef} className="no-scrollbar fade-x -mx-4 flex gap-1.5 overflow-x-auto px-4 py-0.5 sm:-mx-6 sm:px-6">
              {steps.map((s, i) => {
                const active = i === stepIndex;
                return (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      data-step={i}
                      onClick={() => goTo(i)}
                      aria-current={active ? "step" : undefined}
                      className={cx(
                        "flex h-11 items-center gap-2 rounded-full border pl-2 pr-3.5 text-ui transition-colors duration-150",
                        active ? "border-azure-400/45 bg-azure-500/[0.1] font-medium text-fg" : "border-white/[0.08] text-fg-muted hover:text-fg",
                      )}
                    >
                      <StepMarker n={i + 1} active={active} done={done.has(s.id)} />
                      <span className="whitespace-nowrap">{s.title}</span>
                      {done.has(s.id) && <span className="sr-only">, completato</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            <Meridian className="mt-3" value={(stepIndex + 1) / n} label={`Passo ${stepIndex + 1} di ${n}, ${done.size} completati`} />
          </nav>

          {/* Step */}
          <div className="mt-7 lg:mt-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ui text-fg-muted">
              <span className="tabular-nums">
                Passo {stepIndex + 1} di {n}
              </span>
              {showTechnique && (
                <span className="inline-flex items-center gap-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5">
                  <span className="text-fg-subtle" aria-hidden>
                    {step.icon}
                  </span>
                  {step.technique}
                </span>
              )}
              {done.has(step.id) && (
                <span className="inline-flex items-center gap-1 text-green-300">
                  <Check className="h-3.5 w-3.5" aria-hidden /> Completato
                </span>
              )}
            </div>
            <h2 ref={headingRef} tabIndex={-1} className="mt-1.5 scroll-mt-20 font-display text-[1.75rem] leading-[1.15] tracking-[-0.01em] text-fg sm:text-3xl">
              {step.title}
            </h2>
          </div>

          <div className="mt-6">
            {steps.map((s, i) =>
              visited.has(i) ? (
                <div key={s.id} hidden={i !== stepIndex} className={i === stepIndex ? "animate-fade-in" : undefined}>
                  {s.render()}
                </div>
              ) : null,
            )}
          </div>

          {pendingCheck && (
            <p className="mt-8 max-w-[68ch] text-ui text-fg-muted">
              {step.ownDock ? "Concludi il quiz per registrare il risultato." : "Completa l’esercizio per registrare il risultato."} Puoi anche saltare il passo: resterà da completare nel riepilogo.
            </p>
          )}

          {/* Previous / next: sticky at the bottom on desktop; in the flow on phones when the exercise has its own bar */}
          <div className={cx("z-20 mt-10", stickyNav ? "hidden lg:sticky lg:bottom-0 lg:block" : "block")}>
            <div className="flex items-center gap-3 border-t border-white/[0.07] bg-ink-950/90 py-3 backdrop-blur-xl backdrop-saturate-150">
              <Button variant="ghost" disabled={stepIndex === 0} onClick={() => goTo(stepIndex - 1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Indietro
              </Button>
              <div className="ml-auto flex min-w-0 items-center gap-4">
                {!isLast && (
                  <span className="hidden min-w-0 truncate text-ui text-fg-muted xl:inline">
                    Poi: {steps[stepIndex + 1].title}
                  </span>
                )}
                <Button variant={pendingCheck ? "secondary" : "primary"} onClick={next} className="shrink-0">
                  {nextLabel} <NextIcon className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone and tablet session bar (the global tab bar is hidden on /studio) */}
      {stickyNav && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-ink-900/[0.97] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden">
          <div className="mx-auto flex h-16 max-w-xl items-center gap-1.5 px-3">
            <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" disabled={stepIndex === 0} onClick={() => goTo(stepIndex - 1)} aria-label="Passo precedente">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>
            <button
              type="button"
              onClick={() => setPathOpen(true)}
              aria-haspopup="dialog"
              className="flex h-11 shrink-0 flex-col items-start justify-center rounded-lg px-2 text-left transition-colors hover:bg-white/[0.05]"
            >
              <span className="text-xs leading-tight text-fg-muted">Passo</span>
              <span className="flex items-center gap-1 text-sm font-medium leading-tight tabular-nums text-fg">
                {stepIndex + 1} di {n}
                <ChevronUp className="h-3.5 w-3.5 text-fg-muted" aria-hidden />
              </span>
              <span className="sr-only">: mostra tutti i passi</span>
            </button>
            <Button variant={pendingCheck ? "secondary" : "primary"} onClick={next} className="ml-auto h-11 min-w-0 max-w-[17rem] flex-1 px-3.5">
              <span className="truncate">{nextLabel}</span>
              <NextIcon className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {/* Phones: all the steps */}
      <Sheet open={pathOpen} onClose={() => setPathOpen(false)} side="bottom" title={lesson ? `Percorso ${meta.name}` : "Percorso guidato"}>
        <div className="px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <p className="px-2 pb-2 text-ui text-fg-muted">
            {done.size} di {n} passi completati
          </p>
          <StepRail
            steps={steps}
            index={stepIndex}
            done={done}
            topicId={ref.topic.id}
            onGo={(i) => {
              setPathOpen(false);
              goTo(i);
            }}
            onJump={jumpToSection}
          />
        </div>
      </Sheet>

      {/* Phones: session options */}
      <Sheet open={optionsOpen} onClose={() => setOptionsOpen(false)} side="bottom" title="Opzioni della sessione">
        <div className="space-y-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {lesson && (
            <div>
              <div className="mb-2 text-ui font-medium text-fg-muted">Modalità</div>
              {modeSwitch()}
              {ultraWhy && <div className="mt-1">{ultraWhy}</div>}
            </div>
          )}
          <div className="grid gap-2">
            <Button
              variant="secondary"
              className="h-11 justify-start"
              onClick={() => {
                setOptionsOpen(false);
                openProfessor({ topicId });
              }}
            >
              <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> Chiedi all’AI Professor
            </Button>
            <Button variant="secondary" className="h-11 justify-start" href={topicHref}>
              <FileText className="h-4 w-4" aria-hidden /> Apri la scheda dell’argomento
            </Button>
            <Button
              variant="ghost"
              className="h-11 justify-start"
              onClick={() => {
                setOptionsOpen(false);
                setSummaryOpen(true);
              }}
            >
              <Flag className="h-4 w-4" aria-hidden /> Termina la sessione
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Switching mode mid-session */}
      <Modal
        open={pendingMode !== null}
        onClose={() => setPendingMode(null)}
        size="sm"
        title={pendingMode ? `Passare a ${MODE_META[pendingMode].name}?` : ""}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingMode(null)} data-autofocus>
              Resta in {meta.name}
            </Button>
            <Button variant="primary" onClick={confirmMode}>
              Passa a {pendingMode ? MODE_META[pendingMode].name : ""}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">
          {done.size > 0 && `Hai completato ${done.size} ${done.size === 1 ? "passo" : "passi"} su ${n}. `}In {pendingMode ? MODE_META[pendingMode].name : ""} il percorso riparte dal primo passo.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          {elapsed >= MIN_LOGGED_MS ? `Il tempo studiato finora (${minutesLabel(elapsed)}) viene salvato` : "Il tempo finora, meno di 30 secondi, non viene registrato"}; i risultati delle verifiche restano nei tuoi progressi.
        </p>
      </Modal>

      <SessionSummary
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title={ref.topic.title}
        modeName={lesson ? meta.name : "percorso guidato"}
        elapsedMs={timer.elapsedMs}
        steps={steps}
        done={done}
        scores={scores}
        nextTopic={(() => {
          const t = nextTopic(subjectStates, ref.topic.id);
          return t ? { id: t.ref.topic.id, title: t.ref.topic.title } : null;
        })()}
        quizHref={`/quiz?topic=${ref.topic.id}`}
        nextHref={(id) => `/studio/${id}?mode=${mode}`}
        flashcards={lesson?.flashcards.length ?? 0}
        onFlashcards={() => {
          if (lesson) {
            const added = addCards(lesson.flashcards.map((f) => ({ front: f.front, back: f.back, topicId: ref.topic.id, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
            if (added) toast(`${added} flashcard aggiunte al ripasso`);
            router.push(`/flashcard/ripasso?deck=${encodeURIComponent(ref.topic.title)}`);
          } else router.push("/flashcard/ripasso");
        }}
        onGoStep={(i) => {
          setSummaryOpen(false);
          goTo(i);
        }}
        onSave={() => {
          const saved = flush();
          forget(storeKey);
          if (saved) toast("Sessione salvata", { description: `${minutesLabel(timerRef.current.elapsedMs())} su «${ref.topic.title}»` });
          router.push("/");
        }}
      />
    </SessionDataContext.Provider>
  );
}

// ── End of session ────────────────────────────────────────────

function SessionSummary({
  open,
  onClose,
  title,
  modeName,
  elapsedMs,
  steps,
  done,
  scores,
  nextTopic,
  quizHref,
  nextHref,
  flashcards,
  onFlashcards,
  onGoStep,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  modeName: string;
  elapsedMs: () => number;
  steps: SessionStep[];
  done: Set<string>;
  scores: { label: string; value: number }[];
  nextTopic: { id: string; title: string } | null;
  quizHref: string;
  nextHref: (id: string) => string;
  flashcards: number;
  onFlashcards: () => void;
  onGoStep: (i: number) => void;
  onSave: () => void;
}) {
  if (!open) return null;
  const ms = elapsedMs();
  const tooShort = ms < MIN_LOGGED_MS;
  const avg = scores.length ? scores.reduce((a, s) => a + s.value, 0) / scores.length : null;
  const missing = steps.map((s, i) => ({ s, i })).filter(({ s }) => !done.has(s.id));
  const firstCheck = steps.findIndex((s) => s.check);

  const actionRow = "flex min-h-14 w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.04]";
  const actionIcon = "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-azure-300 [&_svg]:h-4 [&_svg]:w-4";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Riepilogo della sessione"
      description={`${title}, ${modeName}`}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Continua a studiare
          </Button>
          <Button variant="primary" onClick={onSave}>
            {tooShort ? "Torna alla dashboard" : "Salva e torna alla dashboard"}
          </Button>
        </div>
      }
    >
      <dl className="grid divide-y divide-white/[0.07] rounded-card border border-white/[0.07] bg-white/[0.02] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ["Tempo attivo", minutesLabel(ms)],
          ["Passi completati", `${done.size} di ${steps.length}`],
          ["Media verifiche", avg === null ? "Nessuna" : fmt.percent(avg)],
        ].map(([k, v]) => (
          <div key={k} className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-3 sm:block sm:px-5 sm:py-3.5">
            <dt className="text-ui text-fg-muted">{k}</dt>
            <dd className="text-lg font-semibold leading-tight tabular-nums text-fg sm:mt-1 sm:text-2xl">{v}</dd>
          </div>
        ))}
      </dl>

      {tooShort && (
        <Notice tone="info" className="mt-4">
          La sessione dura meno di 30 secondi e non viene registrata nei tuoi progressi.
        </Notice>
      )}

      {scores.length > 0 ? (
        <ul className="mt-4 divide-y divide-white/[0.06] text-sm">
          {scores.map((s, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 py-2">
              <span className="min-w-0 text-fg-muted">{s.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-fg">{fmt.percent(s.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        firstCheck >= 0 && (
          <Notice tone="info" className="mt-4" title="Nessuna verifica in questa sessione">
            <p>L’argomento avanza verso «consolidato» solo quando ti metti alla prova.</p>
            <Button size="sm" variant="secondary" className="mt-2.5" onClick={() => onGoStep(firstCheck)}>
              Vai a «{steps[firstCheck].title}»
            </Button>
          </Notice>
        )
      )}

      {missing.length > 0 && missing.length < steps.length && (
        <section className="mt-5" aria-labelledby="summary-missing">
          <h3 id="summary-missing" className="text-sm font-semibold text-fg">
            {missing.length === 1 ? "Resta un passo" : `Restano ${missing.length} passi`}
          </h3>
          {missing.length <= 5 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {missing.map(({ s, i }) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onGoStep(i)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-left text-ui text-fg-muted transition-colors hover:border-white/[0.16] hover:text-fg sm:min-h-9"
                  >
                    <span className="tabular-nums text-fg-subtle">{i + 1}</span> {s.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-ui text-fg-muted">
              Il prossimo è «{missing[0].s.title}».{" "}
              <button type="button" onClick={() => onGoStep(missing[0].i)} className="inline-flex min-h-11 items-center text-azure-300 underline-offset-4 hover:text-azure-200 hover:underline sm:min-h-0">
                Riprendi da qui
              </button>
            </p>
          )}
        </section>
      )}

      <section className="mt-6" aria-labelledby="summary-next">
        <h3 id="summary-next" className="text-sm font-semibold text-fg">
          Cosa fare adesso
        </h3>
        <ul className="mt-2 -mx-3">
          <li>
            <button type="button" onClick={onFlashcards} className={actionRow}>
              <span className={actionIcon} aria-hidden>
                <GalleryVerticalEnd />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">{flashcards ? `Ripassa le ${flashcards} flashcard dell’argomento` : "Ripassa le flashcard in scadenza"}</span>
                <span className="block text-ui text-fg-muted">{flashcards ? "Le aggiunge al ripasso, se mancano, e apre la sessione di ripasso." : "Ripetizione dilazionata di tutto quello che hai già studiato."}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            </button>
          </li>
          <li>
            <Link href={quizHref} className={actionRow}>
              <span className={actionIcon} aria-hidden>
                <ListChecks />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">Fai un quiz su questo argomento</span>
                <span className="block text-ui text-fg-muted">Quesiti originali ATLAS nel formato d’esame.</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          </li>
          {nextTopic && (
            <li>
              <Link href={nextHref(nextTopic.id)} className={actionRow}>
                <span className={actionIcon} aria-hidden>
                  <ArrowRight />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">Prossimo argomento</span>
                  <span className="block text-ui text-fg-muted">{nextTopic.title}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </li>
          )}
        </ul>
      </section>
    </Modal>
  );
}
