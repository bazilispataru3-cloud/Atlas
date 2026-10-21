"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlarmClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Clock,
  Flag,
  GalleryVerticalEnd,
  Info,
  ListRestart,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import type { OpenQuestion, Question } from "@/lib/types";
import { correctAnswerText, grade, present, QUESTION_TYPE_LABEL, type PresentedQuestion } from "@/data/questions";
import { getTopicRef } from "@/data/syllabus";
import { Badge, Button, Card, Kbd, Modal, Notice, ProgressBar, ProgressRing, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { hidesMobileNav } from "@/components/layout/mobile-nav";
import { formatDuration } from "@/components/quiz/format";
import { useAtlas, type QuizAnswerRecord } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { useReducedMotion } from "@/lib/hooks";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { EXAM_RULES, scoreExam } from "@/data/exam";
import { capFirst, cn, fmt, pluralize } from "@/lib/utils";

export interface QuizOutcome {
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  score: number;
  maxScore: number;
  durationSec: number;
  answers: QuizAnswerRecord[];
  ratio: number;
}

type Variant = "practice" | "progressive" | "exam";

export type AnswerState = { value: string | number | null; checked: boolean; selfScore?: number; ai?: { score: number; feedback: string; missing: string[] } };

/** Everything needed to resume a run after a reload or a detour (stored by the page in sessionStorage). */
export interface QuizRunnerSnapshot {
  answers: AnswerState[];
  flags: number[];
  index: number;
  startedAt: number;
}

interface Props {
  questions: Question[];
  variant?: Variant;
  title?: string;
  timeLimitSec?: number;
  seed?: number;
  onFinish?: (o: QuizOutcome) => void;
  /** Hide the final "add errors to flashcards" action. */
  compactSummary?: boolean;
  /** Provenance shown under each question (only when it is not an ATLAS question, e.g. AI-generated). */
  sourceLabel?: string;
  /** Page-level runs (/quiz, the exam): the status bar sticks under the top bar, or at the top in focus mode. */
  sticky?: boolean;
  /** Content at the start of the status bar: the exit control and the page title (h1). */
  headerStart?: ReactNode;
  /** Restores a run (answers, flags, position, start time). Ignored if it does not match the questions. */
  initialState?: QuizRunnerSnapshot;
  /** Called whenever the run changes, so the page can persist it. */
  onSnapshot?: (s: QuizRunnerSnapshot) => void;
  /** Adds "Nuovo quiz" to the summary (back to the quiz builder). */
  onNewQuiz?: () => void;
}

const LETTERS = ["A", "B", "C", "D", "E"];
const DIFFICULTY = { 1: "base", 2: "media", 3: "alta" } as const;
const isBlank = (v: AnswerState["value"]) => v === null || v === "";
const fresh = (n: number): AnswerState[] => Array.from({ length: n }, () => ({ value: null, checked: false }));

/** Focus target after a change of question, verification or submission. */
type PendingFocus = "question" | "next" | "open-feedback" | "summary" | null;

export function QuizRunner({
  questions,
  variant = "practice",
  title,
  timeLimitSec,
  seed,
  onFinish,
  compactSummary,
  sourceLabel,
  sticky,
  headerStart,
  initialState,
  onSnapshot,
  onNewQuiz,
}: Props) {
  // "Rifai le sbagliate" replaces the set with the missed questions, in the same order.
  const [subset, setSubset] = useState<Question[] | null>(null);
  const ordered = useMemo(() => {
    const base = subset ?? questions;
    return variant === "progressive" ? [...base].sort((a, b) => a.difficulty - b.difficulty) : base;
  }, [questions, variant, subset]);
  const presented = useMemo<PresentedQuestion[]>(() => present(ordered, seed), [ordered, seed]);

  const restored = initialState && initialState.answers.length === presented.length ? initialState : undefined;
  const [index, setIndex] = useState(() => Math.min(restored?.index ?? 0, Math.max(0, presented.length - 1)));
  const [answers, setAnswers] = useState<AnswerState[]>(() => restored?.answers ?? fresh(presented.length));
  const [flags, setFlags] = useState<Set<number>>(() => new Set(restored?.flags ?? []));
  const [startedAt, setStartedAt] = useState(() => restored?.startedAt ?? Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState<QuizOutcome | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** The question just verified: only that one plays the correct/wrong animation. */
  const [justChecked, setJustChecked] = useState<number | null>(null);
  const finishedRef = useRef(false);
  const pendingFocus = useRef<PendingFocus>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fieldRef = useRef<HTMLInputElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const openFeedbackRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const stemId = useId();

  const reduceMotion = useReducedMotion();
  const pathname = usePathname() ?? "";
  const focusMode = useUI((s) => s.focusMode);
  const tabBar = !focusMode && !hidesMobileNav(pathname);
  const exam = variant === "exam";

  const resetRun = useCallback(
    (n: number) => {
      finishedRef.current = false;
      setAnswers(fresh(n));
      setFlags(new Set());
      setIndex(0);
      setFinished(null);
      setTimedOut(false);
      setJustChecked(null);
      setStartedAt(Date.now());
      setNow(Date.now());
      pendingFocus.current = "question";
    },
    [],
  );

  // A new set of questions (new quiz from the parent, or "Rifai le sbagliate") starts a fresh run.
  const prevPresented = useRef(presented);
  useEffect(() => {
    if (prevPresented.current === presented) return;
    prevPresented.current = presented;
    resetRun(presented.length);
  }, [presented, resetRun]);

  // Clock: one tick per second while the run is open.
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finished]);
  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const remaining = timeLimitSec ? Math.max(0, timeLimitSec - elapsed) : null;

  // Persist the run.
  const onSnapshotRef = useRef(onSnapshot);
  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  });
  useEffect(() => {
    if (finished || !presented.length) return;
    onSnapshotRef.current?.({ answers, flags: [...flags], index, startedAt });
  }, [answers, flags, index, startedAt, finished, presented.length]);

  const evaluate = (p: PresentedQuestion, a: AnswerState): boolean | null => {
    if (p.q.type === "open") {
      const s = a.ai?.score ?? a.selfScore;
      return s === undefined ? null : s >= 0.6;
    }
    if (isBlank(a.value)) return null;
    if (p.q.type === "mcq") return grade(p.q, p.order[Number(a.value)]);
    return grade(p.q, a.value);
  };

  function finish(opts: { timeout?: boolean } = {}) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    const records: QuizAnswerRecord[] = presented.map((p, i) => {
      const r = evaluate(p, answers[i]);
      if (r === true) correct++;
      else if (r === false) wrong++;
      else blank++;
      const given = p.q.type === "mcq" && answers[i].value !== null ? p.order[Number(answers[i].value)] : answers[i].value;
      return { questionId: p.q.id, topicId: p.q.topicId, given, correct: r };
    });
    const outcome: QuizOutcome = {
      correct,
      wrong,
      blank,
      total: presented.length,
      score: exam ? scoreExam(correct, wrong).raw : correct,
      maxScore: presented.length,
      durationSec: timeLimitSec ? Math.min(timeLimitSec, Math.floor((Date.now() - startedAt) / 1000)) : Math.floor((Date.now() - startedAt) / 1000),
      answers: records,
      ratio: presented.length ? correct / presented.length : 0,
    };
    setConfirmOpen(false);
    setTimedOut(!!opts.timeout);
    setFinished(outcome);
    pendingFocus.current = "summary";
    onFinish?.(outcome);
  }

  // Time is up: the exam is handed in as it is.
  useEffect(() => {
    if (remaining === 0 && !finishedRef.current) finish({ timeout: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const scrollTo = useCallback(
    (el: Element | null, block: ScrollLogicalPosition) => {
      el?.scrollIntoView({ block, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [reduceMotion],
  );

  // Move focus to the meaningful element after each action (never back to <body>).
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === "summary") {
      summaryRef.current?.focus({ preventScroll: true });
      scrollTo(rootRef.current, "start");
      return;
    }
    if (target === "next") {
      primaryRef.current?.focus({ preventScroll: true });
      scrollTo(feedbackRef.current, "nearest");
      return;
    }
    if (target === "open-feedback") {
      openFeedbackRef.current?.focus({ preventScroll: true });
      scrollTo(openFeedbackRef.current, "nearest");
      return;
    }
    // New question: bring its top into view, then focus the answer control.
    const q = questionRef.current;
    if (q && q.getBoundingClientRect().top < 0) scrollTo(q, "start");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const p = presented[index];
    if (p?.q.type === "mcq") {
      const sel = answers[index]?.value;
      const opt = optionRefs.current[typeof sel === "number" ? sel : 0];
      if (opt && !opt.disabled) return opt.focus({ preventScroll: true });
    } else if (fine && fieldRef.current && !fieldRef.current.disabled) {
      return fieldRef.current.focus({ preventScroll: true });
    }
    q?.focus({ preventScroll: true });
  });

  const current = presented[index];
  const state = answers[index];
  const locked = !exam && !!state?.checked;
  const lastIndex = presented.length - 1;

  const setAnswer = (patch: Partial<AnswerState>) => setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const goTo = (i: number) => {
    if (i < 0 || i > lastIndex) return;
    setJustChecked(null);
    setIndex(i);
    pendingFocus.current = "question";
  };

  const verify = () => {
    if (!current || state.checked) return;
    if (current.q.type === "open") {
      if (!String(state.value ?? "").trim()) return;
      setAnswer({ checked: true, selfScore: undefined });
      pendingFocus.current = "open-feedback";
      return;
    }
    if (isBlank(state.value)) return;
    setAnswer({ checked: true });
    setJustChecked(index);
    pendingFocus.current = "next";
  };

  const requestSubmit = () => {
    if (exam) setConfirmOpen(true);
    else finish();
  };

  /** The primary action, shared by the dock button and the Enter key. */
  const primaryAction = () => {
    if (!current) return;
    if (exam) {
      if (index < lastIndex) goTo(index + 1);
      else requestSubmit();
      return;
    }
    if (!state.checked) return verify();
    if (index < lastIndex) goTo(index + 1);
    else finish();
  };

  const choose = (pos: number, allowToggle = false) => {
    if (locked) return;
    const selected = state.value === pos;
    setAnswer({ value: allowToggle && exam && selected ? null : pos });
  };

  const toggleFlag = () =>
    setFlags((f) => {
      const n = new Set(f);
      if (n.has(index)) n.delete(index);
      else n.add(index);
      return n;
    });

  // Keyboard: A–E / 1–5 choose an option, Enter runs the primary action. Never while typing or in a dialog.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    if (finished || confirmOpen || !current) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('[role="dialog"]')) return;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t?.isContentEditable) return;
    const inside = !t || t === document.body || t.id === "contenuto" || !!rootRef.current?.contains(t);
    if (!inside) return;
    const k = e.key.toUpperCase();
    const letter = LETTERS.indexOf(k);
    const digit = ["1", "2", "3", "4", "5"].indexOf(e.key);
    const pick = letter >= 0 ? letter : digit;
    if (pick >= 0 && current.q.type === "mcq" && !locked && pick < current.order.length) {
      e.preventDefault();
      choose(pick);
      optionRefs.current[pick]?.focus({ preventScroll: true });
      return;
    }
    if (e.key === "Enter") {
      if (t && t !== document.body && t.closest("button, a, summary, [role='button']")) return; // native activation
      e.preventDefault();
      primaryAction();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onOptionKey = (e: ReactKeyboardEvent<HTMLButtonElement>, pos: number) => {
    if (!current || current.q.type !== "mcq") return;
    const n = current.order.length;
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (pos + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (pos - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Enter") {
      e.preventDefault();
      primaryAction();
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    choose(next);
    optionRefs.current[next]?.focus();
  };

  if (!presented.length) {
    return <Notice tone="info">Non ci sono ancora quesiti per questa selezione.</Notice>;
  }

  if (finished) {
    return (
      <div ref={rootRef} className="scroll-mt-20 space-y-5">
        {headerStart && <div className="flex min-w-0 items-center gap-2">{headerStart}</div>}
        {timedOut && (
          <Notice tone="warning" title="Tempo scaduto" live>
            La prova è stata consegnata automaticamente con le risposte date fino a quel momento.
          </Notice>
        )}
        <QuizSummary
          outcome={finished}
          presented={presented}
          answers={answers}
          exam={exam}
          title={title}
          compact={compactSummary}
          headingRef={summaryRef}
          onRetry={() => resetRun(presented.length)}
          onRetryMissed={(qs) => setSubset(qs)}
          onNewQuiz={onNewQuiz}
        />
      </div>
    );
  }

  const answeredCount = answers.filter((a, i) => !isBlank(a.value) || (presented[i].q.type === "open" && a.checked)).length;
  const checkedCount = answers.filter((a) => a.checked).length;
  const blankCount = presented.length - answeredCount;
  const verdict = state.checked ? evaluate(current, state) : null;
  const topic = getTopicRef(current.q.topicId)?.topic.title;
  const warn = remaining !== null && remaining <= 300;
  const timerText = fmt.clock(remaining ?? elapsed);
  const timeAlert = remaining === null ? "" : remaining <= 60 ? "Ultimo minuto" : remaining <= 300 ? "Mancano 5 minuti" : "";

  const counters = (
    <span className="flex min-w-0 items-center gap-3 text-ui text-fg-muted">
      <span className="whitespace-nowrap">
        Domanda <span className="font-semibold tabular-nums text-fg">{index + 1}</span> di <span className="tabular-nums">{presented.length}</span>
      </span>
      {exam && (
        <span className="whitespace-nowrap">
          <span className="tabular-nums text-fg">{answeredCount}</span> {answeredCount === 1 ? "risposta" : "risposte"}
        </span>
      )}
    </span>
  );
  const timer = (
    <span
      role="timer"
      aria-label={remaining !== null ? `Tempo rimasto ${timerText}` : `Tempo trascorso ${timerText}`}
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-ui tabular-nums", warn ? "font-semibold text-orange-300" : remaining !== null ? "text-fg" : "text-fg-subtle")}
    >
      {warn ? <AlarmClock className="h-4 w-4" aria-hidden /> : <Clock className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />}
      {timerText}
    </span>
  );
  const submitTop = exam && (
    <Button size="sm" variant="outline" onClick={requestSubmit} className="h-9 sm:h-8">
      Consegna
    </Button>
  );

  const primaryLabel = exam
    ? index < lastIndex
      ? "Successiva"
      : "Consegna"
    : !state.checked
      ? current.q.type === "open"
        ? "Confronta con la risposta"
        : "Verifica"
      : index < lastIndex
        ? "Successiva"
        : "Vedi il risultato";
  const primaryDisabled = !exam && !state.checked && (current.q.type === "open" ? !String(state.value ?? "").trim() : isBlank(state.value));
  const flagged = flags.has(index);

  return (
    <div ref={rootRef} className="relative">
      {/* Status bar */}
      <div
        className={cn(
          sticky
            ? cn(
                "sticky z-20 -mx-4 border-b border-white/[0.07] bg-ink-950/85 px-4 backdrop-blur-xl backdrop-saturate-150 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
                focusMode ? "top-0 pt-[env(safe-area-inset-top)]" : "top-14",
              )
            : "mb-1",
        )}
      >
        {headerStart ? (
          <>
            <div className="flex min-h-14 items-center gap-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">{headerStart}</div>
              <div className="hidden items-center gap-4 sm:flex">
                {counters}
                {timer}
              </div>
              {submitTop}
            </div>
            <div className="flex items-center justify-between gap-3 pb-2 sm:hidden">
              {counters}
              {timer}
            </div>
          </>
        ) : (
          <div className="flex min-h-11 items-center gap-3 py-2">
            {counters}
            <span className="ml-auto flex items-center gap-3">
              {timer}
              {submitTop}
            </span>
          </div>
        )}
        <ProgressBar
          size="sm"
          value={exam ? answeredCount / presented.length : checkedCount / presented.length}
          label={exam ? `Risposte date: ${answeredCount} su ${presented.length}` : `Domande verificate: ${checkedCount} su ${presented.length}`}
          className={cn(sticky ? "rounded-none bg-transparent" : "")}
        />
        <span className="sr-only" aria-live="polite">
          {timeAlert}
        </span>
      </div>

      {/* Question */}
      <Card
        as="section"
        ref={questionRef as never}
        tabIndex={-1}
        aria-label={`Domanda ${index + 1} di ${presented.length}`}
        className={cn("mt-4 p-5 outline-none sm:p-7", sticky ? (focusMode ? "scroll-mt-28" : "scroll-mt-44") : "scroll-mt-20")}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-subtle">
          <Badge tone="muted">{QUESTION_TYPE_LABEL[current.q.type]}</Badge>
          {!exam && topic && <span className="min-w-0 truncate">{topic}</span>}
          {!exam && (
            <span className="inline-flex items-center gap-1.5">
              <span className="flex gap-0.5" aria-hidden>
                {[1, 2, 3].map((k) => (
                  <span key={k} className={cn("h-1.5 w-3 rounded-full", k <= current.q.difficulty ? "bg-fg-muted" : "bg-white/10")} />
                ))}
              </span>
              Difficoltà {DIFFICULTY[current.q.difficulty]}
            </span>
          )}
          {sourceLabel && <span>{capFirst(sourceLabel)}</span>}
        </div>
        <p id={stemId} className="mt-3 max-w-[65ch] text-lg leading-relaxed text-fg">
          {current.q.stem}
        </p>

        {current.q.type === "mcq" && (
          <>
            <div key={current.q.id} className="mt-6 grid gap-2.5" role="radiogroup" aria-labelledby={stemId}>
              {current.order.map((optIndex, pos) => {
                const selected = state.value === pos;
                const isCorrect = optIndex === (current.q as { correct: number }).correct;
                const reveal = locked;
                const animate = justChecked === index;
                const tabbable = typeof state.value === "number" ? selected : pos === 0;
                return (
                  <button
                    key={pos}
                    ref={(el) => {
                      optionRefs.current[pos] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={tabbable ? 0 : -1}
                    disabled={reveal}
                    onClick={(e: ReactMouseEvent) => choose(pos, e.detail > 0)}
                    onKeyDown={(e) => onOptionKey(e, pos)}
                    className={cn(
                      "group flex min-h-12 w-full items-start gap-3 rounded-control border px-3.5 py-3 text-left text-base leading-snug transition-[border-color,background-color,color] duration-150 ease-out active:translate-y-px sm:px-4",
                      !reveal && selected && "border-azure-400/70 bg-azure-500/[0.1] text-fg",
                      !reveal && !selected && "border-white/[0.08] bg-white/[0.02] text-fg-reading hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-fg",
                      reveal && isCorrect && cn("border-success/50 bg-success/[0.08] text-fg", animate && "animate-correct"),
                      reveal && selected && !isCorrect && cn("border-danger/50 bg-danger/[0.08] text-fg", animate && "animate-shake"),
                      reveal && !selected && !isCorrect && "border-white/[0.05] text-fg-muted",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-ui font-semibold transition-colors duration-150",
                        !reveal && selected && "border-azure-400 bg-azure-500 text-white",
                        !reveal && !selected && "border-white/[0.14] text-fg-muted",
                        reveal && isCorrect && "border-success/60 bg-success/15 text-green-200",
                        reveal && selected && !isCorrect && "border-danger/60 bg-danger/15 text-red-200",
                        reveal && !selected && !isCorrect && "border-white/[0.08] text-fg-subtle",
                      )}
                    >
                      {LETTERS[pos]}
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">{(current.q as { options: string[] }).options[optIndex]}</span>
                    {reveal && isCorrect && (
                      <Check
                        aria-hidden
                        className={cn("mt-0.5 h-5 w-5 shrink-0 text-success", animate && "[--len:24] [&_path]:[stroke-dasharray:24] [&_path]:animate-[atlas-draw_0.34s_var(--ease-out-expo)_0.08s_both]")}
                      />
                    )}
                    {reveal && selected && !isCorrect && <X aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                    {reveal && (isCorrect || selected) && <span className="sr-only">{isCorrect ? ", risposta corretta" : ", la tua risposta, errata"}</span>}
                  </button>
                );
              })}
            </div>
            {!locked && (
              <p className="mt-4 hidden flex-wrap items-center gap-1.5 text-xs text-fg-subtle [@media(hover:hover)]:flex">
                <Kbd>A</Kbd>–<Kbd>E</Kbd> o le frecce per scegliere, <Kbd>Invio</Kbd> per {exam ? "passare alla successiva" : "verificare"}
              </p>
            )}
          </>
        )}

        {current.q.type === "cloze" && (
          <div className="mt-6">
            <label htmlFor={`${stemId}-cloze`} className="mb-1.5 block text-ui font-medium text-fg-muted">
              La tua risposta
            </label>
            <input
              ref={fieldRef}
              id={`${stemId}-cloze`}
              value={(state.value as string) ?? ""}
              onChange={(e) => setAnswer({ value: e.target.value.toUpperCase() })}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                primaryAction();
              }}
              disabled={locked}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Un solo concetto"
              className={cn(
                "h-12 w-full rounded-control border bg-white/[0.03] px-4 text-base text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 focus:border-azure-400/70 focus:outline-none focus:ring-[3px] focus:ring-azure-500/25 disabled:opacity-100",
                locked && verdict === true && cn("border-success/50 bg-success/[0.06]", justChecked === index && "animate-correct"),
                locked && verdict === false && cn("border-danger/50 bg-danger/[0.06]", justChecked === index && "animate-shake"),
                !locked && "border-white/[0.1] hover:border-white/[0.16]",
              )}
            />
            <p className="mt-1.5 text-xs text-fg-subtle">Come all’esame: un solo concetto, in stampatello. Accenti e maiuscole non contano.</p>
          </div>
        )}

        {current.q.type === "open" && (
          <OpenAnswer key={current.q.id} q={current.q} state={state} onChange={setAnswer} fieldId={`${stemId}-open`} feedbackRef={openFeedbackRef} />
        )}

        {/* Feedback, announced to screen readers */}
        <div role="status" aria-live="polite">
          {!exam && state.checked && current.q.type !== "open" && (
            <div
              ref={feedbackRef}
              className={cn(
                "mt-5 animate-fade-in rounded-control border p-4 sm:p-5",
                tabBar ? "scroll-mb-20" : "scroll-mb-4",
                verdict ? "border-success/25 bg-success/[0.05]" : "border-danger/25 bg-danger/[0.05]",
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", verdict ? "bg-success/15 text-success" : "bg-danger/15 text-danger")} aria-hidden>
                  {verdict ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-fg">{verdict ? "Corretto" : verdict === false ? "Non corretto" : "Nessuna risposta"}</div>
                  {!verdict && (
                    <div className="mt-0.5 text-sm text-fg-muted">
                      Risposta corretta: <span className="font-medium text-fg">{correctAnswerText(current.q)}</span>
                    </div>
                  )}
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">{current.q.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Action dock: thumb-reachable on phones, follows the page on desktop */}
      <div
        className={cn(
          "sticky z-20 mt-4",
          tabBar ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4" : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] lg:bottom-4",
        )}
      >
        <div className="flex items-center gap-1.5 rounded-card border border-white/[0.09] bg-ink-850/90 p-1.5 shadow-raised backdrop-blur-xl sm:gap-2 sm:p-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 sm:h-10 sm:w-10" disabled={index === 0} onClick={() => goTo(index - 1)} aria-label="Domanda precedente">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Button>
          {exam && (
            <>
              <Button
                variant="ghost"
                className={cn("h-11 min-w-11 shrink-0 px-2.5 sm:h-10 sm:px-3", flagged && "bg-azure-500/[0.12] text-azure-200 hover:bg-azure-500/[0.18] hover:text-azure-100")}
                onClick={toggleFlag}
                aria-pressed={flagged}
              >
                <Flag className={cn("h-[18px] w-[18px]", flagged && "fill-current")} aria-hidden />
                <span className="sr-only sm:not-sr-only">Segna</span>
              </Button>
              <Button variant="ghost" className="h-11 min-w-11 shrink-0 px-2.5 sm:h-10 sm:px-3" onClick={() => setAnswer({ value: null })} disabled={isBlank(state.value)}>
                <CircleSlash className="h-[18px] w-[18px]" aria-hidden />
                <span className="sr-only sm:not-sr-only">Lascia in bianco</span>
              </Button>
            </>
          )}
          <Button
            ref={primaryRef}
            variant="primary"
            size="lg"
            className="ml-auto h-12 min-w-0 flex-1 px-4 sm:h-11 sm:max-w-xs sm:flex-none sm:px-6 sm:text-sm"
            disabled={primaryDisabled}
            onClick={primaryAction}
          >
            <span className="truncate">{primaryLabel}</span>
            {(primaryLabel === "Successiva" || primaryLabel === "Vedi il risultato") && <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
          </Button>
        </div>
      </div>

      {exam && (
        <QuestionGrid
          presented={presented}
          answers={answers}
          flags={flags}
          index={index}
          answeredCount={answeredCount}
          blankCount={blankCount}
          onJump={goTo}
        />
      )}

      {exam && (
        <Modal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          size="sm"
          title="Consegnare la prova?"
          description="Dopo la consegna non potrai più cambiare le risposte."
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)} data-autofocus>
                Continua la prova
              </Button>
              <Button variant="primary" onClick={() => finish()}>
                Consegna e vedi il punteggio
              </Button>
            </div>
          }
        >
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: "Con risposta", v: answeredCount },
              { k: "In bianco", v: blankCount },
              { k: "Segnate", v: flags.size },
            ].map((x) => (
              <div key={x.k} className="inset-panel px-2 py-3">
                <dt className="text-xs text-fg-muted">{x.k}</dt>
                <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-fg">{x.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Hai risposto a {answeredCount} {answeredCount === 1 ? "domanda" : "domande"} su {presented.length}. Le domande in bianco valgono 0 punti, le errate −0,1.
          </p>
          {flags.size > 0 && (
            <div className="mt-4">
              <div className="text-ui font-medium text-fg-muted">Domande segnate da rivedere</div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {[...flags]
                  .sort((a, b) => a - b)
                  .map((i) => (
                    <li key={i}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-10 min-w-10 sm:h-8 sm:min-w-8"
                        onClick={() => {
                          setConfirmOpen(false);
                          goTo(i);
                        }}
                        aria-label={`Vai alla domanda ${i + 1}`}
                      >
                        {i + 1}
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Exam question grid ────────────────────────────────────────

function QuestionGrid({
  presented,
  answers,
  flags,
  index,
  answeredCount,
  blankCount,
  onJump,
}: {
  presented: PresentedQuestion[];
  answers: AnswerState[];
  flags: Set<number>;
  index: number;
  answeredCount: number;
  blankCount: number;
  onJump: (i: number) => void;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="mt-6 inset-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={titleId} className="text-sm font-semibold text-fg">
          Tutte le domande
        </h2>
        <p className="text-xs text-fg-muted">
          {pluralize(answeredCount, "risposta", "risposte")}, {pluralize(flags.size, "segnata", "segnate")}, {blankCount} in bianco
        </p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legenda">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] bg-azure-500" aria-hidden /> Corrente
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] border border-azure-400/40 bg-azure-500/25" aria-hidden /> Con risposta
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] border border-white/15" aria-hidden /> In bianco
        </li>
        <li className="flex items-center gap-1.5">
          <Flag className="h-3 w-3 fill-current text-azure-300" aria-hidden /> Segnata
        </li>
      </ul>
      <ol className="mt-3 grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))]">
        {presented.map((p, i) => {
          const answered = !isBlank(answers[i].value);
          const isCurrent = i === index;
          const flagged = flags.has(i);
          return (
            <li key={p.q.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Domanda ${i + 1}${answered ? ", con risposta" : ", in bianco"}${flagged ? ", segnata" : ""}`}
                className={cn(
                  "relative grid h-11 w-full place-items-center rounded-lg border text-ui font-medium tabular-nums transition-colors duration-150 sm:h-10",
                  isCurrent
                    ? "border-azure-300 bg-azure-500 text-white"
                    : answered
                      ? "border-azure-400/40 bg-azure-500/25 text-azure-100 hover:bg-azure-500/35"
                      : "border-white/[0.12] text-fg-muted hover:border-white/25 hover:text-fg",
                )}
              >
                {i + 1}
                {flagged && <Flag className={cn("absolute right-1 top-1 h-2.5 w-2.5 fill-current", isCurrent ? "text-white" : "text-azure-300")} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex gap-2 text-xs leading-relaxed text-fg-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Le risposte errate valgono −0,1: se non sai, lascia in bianco.
      </p>
    </section>
  );
}

// ── Open answer ───────────────────────────────────────────────

function OpenAnswer({
  q,
  state,
  onChange,
  fieldId,
  feedbackRef,
}: {
  q: OpenQuestion;
  state: AnswerState;
  onChange: (p: Partial<AnswerState>) => void;
  fieldId: string;
  feedbackRef: React.RefObject<HTMLDivElement | null>;
}) {
  const integrations = useIntegrations();
  const [checks, setChecks] = useState<boolean[]>(() => q.keyPoints.map(() => false));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const askAI = async () => {
    if (!state.value) return;
    setLoading(true);
    setErr(null);
    const r = await postJSON<{ data: { score: number; feedback: string; missing: string[] } }>("/api/ai/evaluate", {
      kind: "open",
      question: q.stem,
      modelAnswer: q.modelAnswer,
      keyPoints: q.keyPoints,
      answer: String(state.value),
    });
    setLoading(false);
    if (r.ok) {
      onChange({ ai: r.data.data, checked: true });
      requestAnimationFrame(() => feedbackRef.current?.focus({ preventScroll: true }));
    } else setErr(r.error.message);
  };

  return (
    <div className="mt-6 space-y-3">
      <label htmlFor={fieldId} className="block text-ui font-medium text-fg-muted">
        La tua risposta
      </label>
      <Textarea id={fieldId} rows={5} value={(state.value as string) ?? ""} onChange={(e) => onChange({ value: e.target.value })} placeholder="Scrivi la risposta come all’orale: definizione, meccanismo, esempio." disabled={state.checked} />
      {!state.checked && integrations?.ai && (
        <Button variant="secondary" loading={loading} disabled={!String(state.value ?? "").trim()} onClick={askAI}>
          <Sparkles className="h-4 w-4" aria-hidden /> {loading ? "Valutazione in corso" : "Valuta con l’AI"}
        </Button>
      )}
      {err && (
        <Notice tone="danger" live title="Valutazione non riuscita">
          {err} Puoi confrontare da solo la tua risposta con quella di riferimento.
        </Notice>
      )}
      {state.checked && (
        <div ref={feedbackRef} tabIndex={-1} className="animate-fade-in scroll-mb-24 rounded-control border border-white/[0.09] bg-white/[0.02] p-4 outline-none focus-visible:outline-2 sm:p-5">
          <div className="text-sm font-semibold text-fg">Risposta di riferimento</div>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-fg-muted">{q.modelAnswer}</p>
          {state.ai ? (
            <div className="mt-4 border-t border-white/[0.07] pt-4">
              <div className="flex items-center gap-2 text-sm text-fg">
                <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> Valutazione AI: <span className="font-semibold">{Math.round(state.ai.score * 100)}%</span>
              </div>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-muted">{state.ai.feedback}</p>
              {state.ai.missing.length > 0 && (
                <p className="mt-2 flex max-w-prose gap-2 text-sm text-fg-muted">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                  <span>
                    <span className="text-fg">Manca:</span> {state.ai.missing.join("; ")}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <fieldset className="mt-4 border-t border-white/[0.07] pt-4">
              <legend className="sr-only">Autovalutazione</legend>
              <div className="text-sm text-fg-muted">Quali punti chiave hai toccato?</div>
              <ul className="mt-2 space-y-1">
                {q.keyPoints.map((k, i) => (
                  <li key={k}>
                    <label className="flex min-h-10 cursor-pointer items-start gap-3 rounded-lg px-1 py-2 text-sm text-fg-reading hover:bg-white/[0.03]">
                      <input
                        type="checkbox"
                        checked={checks[i]}
                        onChange={() => {
                          const next = checks.map((c, j) => (j === i ? !c : c));
                          setChecks(next);
                          onChange({ selfScore: next.filter(Boolean).length / q.keyPoints.length });
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-azure-500"
                      />
                      {k}
                    </label>
                  </li>
                ))}
              </ul>
              {state.selfScore === undefined ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-xs text-fg-subtle">Seleziona i punti presenti per registrare il punteggio.</p>
                  <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => onChange({ selfScore: 0 })}>
                    Non ho toccato nessun punto
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-fg-muted" role="status">
                  Punteggio registrato: {Math.round(state.selfScore * 100)}% dei punti chiave.
                </p>
              )}
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}

// ── Summary ───────────────────────────────────────────────────

type Row = { key: string; label: string; href?: string; ok: number; n: number };

/** Topics with at least two questions; when too few, the same evidence aggregated by syllabus unit. */
function analysis(presented: PresentedQuestion[], outcome: QuizOutcome): { by: "argomento" | "unità"; rows: Row[] } {
  const byTopic = new Map<string, Row>();
  const byUnit = new Map<string, Row>();
  const subjects = new Set(presented.map((p) => p.q.subject));
  presented.forEach((p, i) => {
    const ok = outcome.answers[i].correct === true ? 1 : 0;
    const ref = getTopicRef(p.q.topicId);
    const t = byTopic.get(p.q.topicId) ?? { key: p.q.topicId, label: ref?.topic.title ?? p.q.topicId, href: ref ? `/materie/${ref.subject.id}/${ref.topic.id}` : undefined, ok: 0, n: 0 };
    t.n++;
    t.ok += ok;
    byTopic.set(p.q.topicId, t);
    const unitKey = ref?.unit.id ?? p.q.topicId;
    const unitLabel = ref ? (subjects.size > 1 ? `${ref.subject.name}: ${ref.unit.title}` : ref.unit.title) : p.q.topicId;
    const u = byUnit.get(unitKey) ?? { key: unitKey, label: unitLabel, ok: 0, n: 0 };
    u.n++;
    u.ok += ok;
    byUnit.set(unitKey, u);
  });
  const sort = (rows: Row[]) => rows.sort((a, b) => a.ok / a.n - b.ok / b.n || b.n - a.n);
  const solid = [...byTopic.values()].filter((r) => r.n >= 2);
  const covered = solid.reduce((s, r) => s + r.n, 0);
  if (solid.length >= 2 && covered >= presented.length / 2) return { by: "argomento", rows: sort(solid) };
  return { by: "unità", rows: sort([...byUnit.values()]) };
}

function givenText(p: PresentedQuestion, a: AnswerState) {
  if (p.q.type === "mcq" && typeof a.value === "number") return p.q.options[p.order[a.value]];
  return String(a.value ?? "");
}

function QuizSummary({
  outcome,
  presented,
  answers,
  exam,
  title,
  compact,
  headingRef,
  onRetry,
  onRetryMissed,
  onNewQuiz,
}: {
  outcome: QuizOutcome;
  presented: PresentedQuestion[];
  answers: AnswerState[];
  exam: boolean;
  title?: string;
  compact?: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onRetry: () => void;
  onRetryMissed: (qs: Question[]) => void;
  onNewQuiz?: () => void;
}) {
  const addCards = useAtlas((s) => s.addCards);
  const [showAll, setShowAll] = useState(false);
  const [cardsAdded, setCardsAdded] = useState<number | null>(null);
  const items = presented.map((p, i) => ({ p, a: answers[i], r: outcome.answers[i], i }));
  const wrong = items.filter((x) => x.r.correct === false);
  const blank = items.filter((x) => x.r.correct === null);
  const missed = [...items.filter((x) => x.r.correct !== true)];
  const examScore = exam ? scoreExam(outcome.correct, outcome.wrong) : null;
  const groups = useMemo(() => analysis(presented, outcome), [presented, outcome]);
  const skills = useMemo(() => {
    const m = new Map<string, { ok: number; n: number }>();
    presented.forEach((p, i) => {
      const s = m.get(p.q.skill) ?? { ok: 0, n: 0 };
      s.n++;
      if (outcome.answers[i].correct) s.ok++;
      m.set(p.q.skill, s);
    });
    return [...m.entries()].sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n);
  }, [presented, outcome]);
  const tone = outcome.ratio >= 0.8 ? "success" : outcome.ratio >= 0.6 ? "warning" : "danger";

  const headline = exam
    ? examScore!.passed
      ? examScore!.lode
        ? "Prova superata con 30 e lode"
        : `Prova superata: ${examScore!.careerGrade}/30`
      : "Prova non superata"
    : outcome.ratio >= 0.8
      ? "Ottimo lavoro"
      : outcome.ratio >= 0.6
        ? "Buona base, con qualche lacuna"
        : "Da consolidare";

  const makeCards = () => {
    const n = addCards(
      missed.map(({ p }) => ({
        front: p.q.stem,
        back: `${correctAnswerText(p.q)}\n\n${p.q.explanation}`,
        subject: p.q.subject,
        topicId: p.q.topicId,
        deck: "Errori dei quiz",
        origin: "atlas" as const,
      })),
    );
    setCardsAdded(n);
    toast(n ? `${pluralize(n, "flashcard creata", "flashcard create")} dagli errori` : "Queste flashcard sono già nel mazzo «Errori dei quiz»", {
      tone: n ? "success" : "info",
      description: n ? "Le trovi nel mazzo «Errori dei quiz», già in ripasso." : undefined,
    });
  };

  const actions: ReactNode[] = [];
  if (!exam && missed.length > 0) {
    actions.push(
      <Button key="missed" variant="primary" onClick={() => onRetryMissed(missed.map((x) => x.p.q))}>
        <ListRestart className="h-4 w-4" aria-hidden /> Rifai le sbagliate ({missed.length})
      </Button>,
    );
  }
  if (!compact && missed.length > 0) {
    actions.push(
      <Button key="cards" variant="secondary" onClick={makeCards} disabled={cardsAdded !== null}>
        {cardsAdded !== null ? <Check className="h-4 w-4 text-success" aria-hidden /> : <GalleryVerticalEnd className="h-4 w-4" aria-hidden />}
        {cardsAdded !== null ? "Flashcard create" : "Trasforma gli errori in flashcard"}
      </Button>,
    );
  }
  if (!exam) {
    if (!missed.length && onNewQuiz) {
      actions.push(
        <Button key="new" variant="primary" onClick={onNewQuiz}>
          <Plus className="h-4 w-4" aria-hidden /> Nuovo quiz
        </Button>,
      );
    }
    actions.push(
      <Button key="same" variant={!missed.length && !onNewQuiz ? "primary" : "ghost"} onClick={onRetry}>
        <RotateCcw className="h-4 w-4" aria-hidden /> Rifai lo stesso quiz
      </Button>,
    );
    if (missed.length && onNewQuiz) {
      actions.push(
        <Button key="new" variant="ghost" onClick={onNewQuiz}>
          <Plus className="h-4 w-4" aria-hidden /> Nuovo quiz
        </Button>,
      );
    }
  }

  const visibleRows = showAll ? groups.rows : groups.rows.slice(0, 5);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:p-7">
          <ProgressRing value={outcome.ratio} size={124} stroke={10} tone={tone} label={`${outcome.correct} risposte corrette su ${outcome.total}`}>
            <div className="text-center" aria-hidden>
              <div className="text-2xl font-semibold tracking-[-0.02em] tabular-nums text-fg">{exam ? fmt.number(examScore!.raw) : `${outcome.correct}/${outcome.total}`}</div>
              <div className="text-xs text-fg-muted">{exam ? `su ${EXAM_RULES.maxPerExam}` : "corrette"}</div>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {title && <div className="text-ui text-fg-muted">{title}</div>}
            <h2 ref={headingRef} tabIndex={-1} className="mt-1 font-display text-3xl leading-tight text-fg outline-none">
              {headline}
            </h2>
            <ul className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start" aria-label="Riepilogo delle risposte">
              <li>
                <Badge tone="success" icon={<Check className="h-3 w-3" aria-hidden />}>
                  {outcome.correct} {outcome.correct === 1 ? "corretta" : "corrette"}
                </Badge>
              </li>
              <li>
                <Badge tone="danger" icon={<X className="h-3 w-3" aria-hidden />}>
                  {outcome.wrong} {outcome.wrong === 1 ? "errata" : "errate"}
                </Badge>
              </li>
              {outcome.blank > 0 && (
                <li>
                  <Badge tone="muted" icon={<CircleSlash className="h-3 w-3" aria-hidden />}>
                    {outcome.blank} in bianco
                  </Badge>
                </li>
              )}
              <li>
                <Badge tone="muted" icon={<Clock className="h-3 w-3" aria-hidden />}>
                  {formatDuration(outcome.durationSec)}
                </Badge>
              </li>
            </ul>
            {exam && (
              <p className="mt-3 max-w-prose text-xs leading-relaxed text-fg-muted">
                Punteggio calcolato come nel D.M. 941/2026: +1 per ogni risposta esatta, 0 per ogni risposta in bianco, −0,1 per ogni errata. Sufficienza: 18/30.
              </p>
            )}
          </div>
        </div>
        {actions.length > 0 && <div className="flex flex-wrap gap-2 border-t border-white/[0.07] px-6 py-4 sm:px-7">{actions}</div>}
      </Card>

      {(groups.rows.length > 1 || skills.length > 1) && (
        <div className={cn("grid gap-4", groups.rows.length > 1 && skills.length > 1 && "md:grid-cols-[1.4fr_1fr]")}>
          {groups.rows.length > 1 && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-fg">Dove sbagli di più</h2>
              <p className="mt-0.5 text-xs text-fg-muted">Per {groups.by === "argomento" ? "argomento (solo quelli con almeno 2 domande)" : "unità didattica"}, dal più debole.</p>
              <ul className="mt-4 space-y-3.5">
                {visibleRows.map((r) => {
                  const ratio = r.ok / r.n;
                  return (
                    <li key={r.key}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        {r.href ? (
                          <Link href={r.href} className="min-w-0 truncate text-fg-reading underline-offset-4 hover:text-fg hover:underline">
                            {r.label}
                          </Link>
                        ) : (
                          <span className="min-w-0 truncate text-fg-reading">{r.label}</span>
                        )}
                        <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                          {r.ok} su {r.n}
                        </span>
                      </div>
                      <ProgressBar value={ratio} tone={ratio >= 0.8 ? "success" : ratio >= 0.5 ? "warning" : "danger"} className="mt-1.5" label={`${r.label}: ${r.ok} corrette su ${r.n}`} />
                    </li>
                  );
                })}
              </ul>
              {groups.rows.length > 5 && (
                <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showAll && "rotate-180")} aria-hidden />
                  {showAll ? "Mostra meno" : `Mostra tutti (${groups.rows.length})`}
                </Button>
              )}
            </Card>
          )}
          {skills.length > 1 && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-fg">Per tipo di competenza</h2>
              <ul className="mt-4 space-y-3.5">
                {skills.map(([k, v]) => (
                  <li key={k}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-fg-reading">{capFirst(k)}</span>
                      <span className="text-xs tabular-nums text-fg-muted">
                        {v.ok} su {v.n}
                      </span>
                    </div>
                    <ProgressBar value={v.ok / v.n} tone="azure" className="mt-1.5" label={`${capFirst(k)}: ${v.ok} corrette su ${v.n}`} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex gap-2 text-xs leading-relaxed text-fg-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Errori di «calcolo» indicano spesso problemi di unità di misura o di impostazione; di «concetto», definizioni da ripassare.
              </p>
            </Card>
          )}
        </div>
      )}

      {missed.length > 0 && (
        <section aria-labelledby="revisione" className="space-y-3">
          <h2 id="revisione" className="text-base font-semibold text-fg">
            Revisione
          </h2>
          {wrong.length > 0 && <ReviewGroup label="Errate" items={wrong} open />}
          {blank.length > 0 && <ReviewGroup label={exam ? "In bianco" : "Senza risposta"} items={blank} open={!wrong.length} />}
        </section>
      )}
    </div>
  );
}

function ReviewGroup({ label, items, open }: { label: string; items: { p: PresentedQuestion; a: AnswerState; r: QuizAnswerRecord; i: number }[]; open?: boolean }) {
  return (
    <details open={open} className="group card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-3 text-sm font-medium text-fg hover:bg-white/[0.02] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span>
          {label} <span className="font-normal tabular-nums text-fg-muted">({items.length})</span>
        </span>
        <ChevronDown className="h-4 w-4 text-fg-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06] px-5 sm:px-6">
        {items.map(({ p, a, r, i }) => {
          const topic = getTopicRef(p.q.topicId)?.topic.title;
          return (
            <li key={p.q.id} className="py-4">
              <div className="flex flex-wrap gap-x-3 text-xs text-fg-subtle">
                <span>Domanda {i + 1}</span>
                {topic && <span className="min-w-0 truncate">{topic}</span>}
              </div>
              <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-fg">{p.q.stem}</p>
              {r.correct === false && (
                <p className="mt-2 flex gap-2 text-sm text-fg-muted">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                  <span className="min-w-0">
                    La tua risposta: <span className="line-clamp-3 inline text-fg">{givenText(p, a) || "—"}</span>
                  </span>
                </p>
              )}
              <p className="mt-1 flex gap-2 text-sm text-fg-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span className="min-w-0">
                  Risposta corretta: <span className="text-fg">{correctAnswerText(p.q)}</span>
                </span>
              </p>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">{p.q.explanation}</p>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
