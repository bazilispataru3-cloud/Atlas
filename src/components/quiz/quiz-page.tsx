"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Calculator, Check, ChevronDown, ChevronRight, CircleSlash, Flag, History, ListChecks, Play, RotateCcw, Timer, X } from "lucide-react";
import type { Question, SubjectId } from "@/lib/types";
import { QUESTIONS, QUESTION_TYPE_LABEL, correctAnswerText, questionsFor } from "@/data/questions";
import { getSubject, getTopicRef, SUBJECTS } from "@/data/syllabus";
import { EXAM_RULES, scoreExam } from "@/data/exam";
import { QuizRunner, type QuizRunnerSnapshot } from "@/components/exercises/quiz-runner";
import { Badge, Button, EmptyState, Notice, PageHeader, ProgressBar, SectionTitle, Segmented, Skeleton } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import { useHydrated, useReducedMotion } from "@/lib/hooks";
import { useRecordQuiz } from "@/lib/record";
import { cn, fmt, pluralize, shuffle } from "@/lib/utils";
import { formatDuration, session, STORAGE_KEYS, type StoredExam, type StoredQuiz } from "./format";

type SubjectChoice = SubjectId | "tutte";
type Order = "practice" | "progressive";
type Running = { questions: Question[]; title: string; variant: Order; subject?: SubjectId; seed: number; snapshot?: QuizRunnerSnapshot };

const TYPES: Question["type"][] = ["mcq", "cloze", "open"];
const EXAM_TYPES: Question["type"][] = ["mcq", "cloze"];
const QUICK_COUNT = 10;
const SUBJECT_LABEL: Record<SubjectId, string> = { biologia: "Biologia", chimica: "Chimica", fisica: "Fisica" };
const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
const topicCounts = (() => {
  const m = new Map<string, number>();
  for (const q of QUESTIONS) m.set(q.topicId, (m.get(q.topicId) ?? 0) + 1);
  return m;
})();

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;
}

export function QuizPage() {
  const params = useSearchParams();
  const topicParam = params.get("topic");
  const preRef = topicParam ? getTopicRef(topicParam) : undefined;
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const results = useAtlas((s) => s.quizResults);
  const progress = useAtlas((s) => s.progress);
  const recordQuiz = useRecordQuiz();

  const [subject, setSubject] = useState<SubjectChoice>(preRef?.subject.id ?? "tutte");
  const [topics, setTopics] = useState<Set<string>>(() => new Set(preRef ? [preRef.topic.id] : []));
  const [types, setTypes] = useState<Set<Question["type"]>>(new Set(["mcq", "cloze"]));
  const [onlyCalc, setOnlyCalc] = useState(false);
  const [count, setCount] = useState(10);
  const [order, setOrder] = useState<Order>("practice");
  const [running, setRunning] = useState<Running | null>(null);
  const [paused, setPaused] = useState<StoredQuiz | null>(null);
  const [examInProgress, setExamInProgress] = useState<StoredExam | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(!!preRef);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const focusResume = useRef(false);

  // A quiz or a simulation left open in this tab can be resumed.
  useEffect(() => {
    setPaused(session.read<StoredQuiz>(STORAGE_KEYS.quiz));
    setExamInProgress(session.read<StoredExam>(STORAGE_KEYS.exam));
  }, []);

  useEffect(() => {
    if (!running) return;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [running, reduceMotion]);

  useEffect(() => {
    if (!running && focusResume.current) {
      focusResume.current = false;
      resumeRef.current?.focus({ preventScroll: true });
    }
  }, [running]);

  // Save the moment the tab is hidden, so a reload does not count the time away as quiz time.
  useEffect(() => {
    if (!running) return;
    const onHide = () => {
      const s = session.read<StoredQuiz>(STORAGE_KEYS.quiz);
      if (s) session.write(STORAGE_KEYS.quiz, { ...s, savedAt: Date.now() });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [running]);

  const topicOptions = [...topicCounts.keys()]
    .map((id) => getTopicRef(id)!)
    .filter((r) => r && (subject === "tutte" || r.subject.id === subject));

  const pool = QUESTIONS.filter(
    (q) => (subject === "tutte" || q.subject === subject) && (!topics.size || topics.has(q.topicId)) && types.has(q.type) && (!onlyCalc || q.skill === "calcolo"),
  );

  const begin = (r: Omit<Running, "seed"> & { seed?: number }) => {
    const seed = r.seed ?? Date.now();
    const run: Running = { ...r, seed };
    session.write(STORAGE_KEYS.quiz, { ids: run.questions.map((q) => q.id), title: run.title, variant: run.variant, subject: run.subject, seed, snapshot: run.snapshot, savedAt: Date.now() } satisfies StoredQuiz);
    setPaused(null);
    setRunning(run);
  };

  const start = () => {
    const seed = Date.now();
    const qs = shuffle(pool, seed).slice(0, count);
    const title =
      topics.size === 1
        ? `Quiz: ${getTopicRef([...topics][0])?.topic.title}`
        : subject !== "tutte"
          ? `Quiz di ${SUBJECT_LABEL[subject]}`
          : "Quiz misto";
    begin({ questions: qs, title, variant: order, subject: subject === "tutte" ? undefined : subject, seed });
  };

  const onSnapshot = useCallback((snapshot: QuizRunnerSnapshot) => {
    const s = session.read<StoredQuiz>(STORAGE_KEYS.quiz);
    if (s) session.write(STORAGE_KEYS.quiz, { ...s, snapshot, savedAt: Date.now() });
  }, []);

  /** Leaves the run: it stays saved in this tab and can be resumed from the builder. */
  const pause = (finished: boolean) => {
    if (!finished) {
      const s = session.read<StoredQuiz>(STORAGE_KEYS.quiz);
      if (s) {
        const stamped = { ...s, savedAt: Date.now() };
        session.write(STORAGE_KEYS.quiz, stamped);
        setPaused(stamped);
        focusResume.current = true;
        toast("Quiz in pausa", { tone: "info", description: "Lo riprendi da questa pagina finché la scheda resta aperta." });
      }
    }
    setRunning(null);
  };

  const resume = () => {
    if (!paused) return;
    const qs = paused.ids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
    if (qs.length !== paused.ids.length) {
      discard();
      toast("Non è possibile riprendere il quiz", { tone: "warning", description: "Alcune domande non sono più disponibili. Avvia un nuovo quiz." });
      return;
    }
    // The pause is not quiz time: shift the start forward by the time away.
    const snapshot = paused.snapshot ? { ...paused.snapshot, startedAt: paused.snapshot.startedAt + Math.max(0, Date.now() - paused.savedAt) } : undefined;
    begin({ questions: qs, title: paused.title, variant: paused.variant, subject: paused.subject, seed: paused.seed, snapshot });
  };

  const discard = () => {
    session.remove(STORAGE_KEYS.quiz);
    setPaused(null);
  };

  // ── Evidence from saved results ────────────────────────────
  const saved = useMemo(() => (hydrated ? results : []), [hydrated, results]);
  const topicStats = useMemo(() => {
    if (!hydrated) return [];
    return Object.entries(progress)
      .filter(([id, p]) => p.quiz.length > 0 && getTopicRef(id))
      .map(([id, p]) => {
        const recent = [...p.quiz].sort((a, b) => a.date.localeCompare(b.date)).slice(-3);
        return { ref: getTopicRef(id)!, n: p.quiz.length, acc: recent.reduce((a, e) => a + e.score, 0) / recent.length };
      })
      .sort((a, b) => a.acc - b.acc);
  }, [progress, hydrated]);
  const recentErrors = useMemo(() => {
    const seen = new Set<string>();
    const out: Question[] = [];
    for (const r of [...saved].reverse())
      for (const a of r.answers) {
        if (a.correct !== false || seen.has(a.questionId)) continue;
        const q = byId.get(a.questionId);
        if (q) {
          seen.add(q.id);
          out.push(q);
        }
      }
    return out;
  }, [saved]);
  const withoutDetail = saved.length > 0 && saved.every((r) => !r.answers.length);
  const sims = saved.filter((r) => r.kind === "simulazione");
  const totalAnswered = saved.reduce((n, r) => n + r.total, 0);
  const totalCorrect = saved.reduce((n, r) => n + r.correct, 0);

  // ── One-click start: the topic asked for, else the weakest topics, else a mixed quiz ──
  const quick = useMemo(() => {
    if (preRef) {
      const qs = questionsFor({ topicIds: [preRef.topic.id], types: EXAM_TYPES });
      if (qs.length)
        return {
          kind: "topic" as const,
          title: `Quiz: ${preRef.topic.title}`,
          heading: `Quiz su «${preRef.topic.title}»`,
          text: `${pluralize(Math.min(QUICK_COUNT, qs.length), "domanda", "domande")} su questo argomento, con la spiegazione dopo ogni risposta.`,
          pool: qs,
          subject: preRef.subject.id,
        };
    }
    const weak = topicStats.filter((t) => t.acc < 0.8).slice(0, 3);
    if (weak.length) {
      const qs = questionsFor({ topicIds: weak.map((t) => t.ref.topic.id), types: EXAM_TYPES });
      if (qs.length >= 5)
        return {
          kind: "weak" as const,
          title: "Quiz sui punti deboli",
          heading: "Quiz sui tuoi punti deboli",
          text: `${pluralize(Math.min(QUICK_COUNT, qs.length), "domanda", "domande")} su ${list(weak.map((t) => `«${t.ref.topic.title}»`))}: ${weak.length === 1 ? "l’argomento" : "gli argomenti"} dove sbagli di più.`,
          pool: qs,
          subject: undefined,
        };
    }
    const qs = questionsFor({ types: EXAM_TYPES });
    return {
      kind: "mixed" as const,
      title: "Quiz misto",
      heading: "Quiz misto",
      text: `${QUICK_COUNT} domande da biologia, chimica e fisica, nel formato dell’esame, con la spiegazione dopo ogni risposta.`,
      pool: qs,
      subject: undefined,
    };
  }, [preRef, topicStats]);

  const startQuick = () => {
    const seed = Date.now();
    begin({ questions: shuffle(quick.pool, seed).slice(0, QUICK_COUNT), title: quick.title, variant: "practice", subject: quick.subject, seed });
  };

  // ── Running quiz ───────────────────────────────────────────
  if (running) {
    return (
      <div className="mx-auto max-w-3xl pb-6">
        <QuizRunner
          key={running.seed}
          questions={running.questions}
          variant={running.variant}
          title={running.title}
          seed={running.seed}
          sticky
          initialState={running.snapshot}
          onSnapshot={onSnapshot}
          headerStart={
            <>
              <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11 shrink-0" onClick={() => pause(!session.read(STORAGE_KEYS.quiz))} aria-label="Torna ai quiz">
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </Button>
              <h1 className="min-w-0 truncate text-base font-semibold text-fg">{running.title}</h1>
            </>
          }
          onFinish={(o) => {
            session.remove(STORAGE_KEYS.quiz);
            recordQuiz(o, { kind: "quiz", title: running.title, subject: running.subject });
          }}
          onNewQuiz={() => setRunning(null)}
        />
      </div>
    );
  }

  const examSubject = examInProgress ? getSubject(examInProgress.format === "completa" ? (["chimica", "fisica", "biologia"] as SubjectId[])[examInProgress.phase.i] : examInProgress.subject) : undefined;

  return (
    <div className="pb-16">
      <PageHeader
        title="Quiz e simulazioni"
        description="Domande a risposta multipla con 5 opzioni e a completamento, come nelle prove del semestre filtro, più domande aperte ed esercizi di calcolo. Sono quesiti originali ATLAS: nessuno è ministeriale."
      />

      {(paused || examInProgress) && (
        <div className="mt-6 space-y-3">
          {examInProgress && (
            <Notice
              tone="info"
              title="Hai una simulazione in corso"
              action={
                <Button size="sm" variant="primary" href="/quiz/simulazione" className="h-10 sm:h-8">
                  Riprendi
                </Button>
              }
            >
              {examSubject ? `Prova di ${examSubject.name}. ` : ""}Il tempo della prova continua a scorrere.
            </Notice>
          )}
          {paused && (
            <Notice
              tone="info"
              title={`Quiz in pausa: ${paused.title.replace(/^Quiz: /, "")}`}
              action={
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" className="h-10 sm:h-8" onClick={discard}>
                    Scarta
                  </Button>
                  <Button ref={resumeRef} size="sm" variant="primary" className="h-10 sm:h-8" onClick={resume}>
                    Riprendi
                  </Button>
                </div>
              }
            >
              {(() => {
                const done = paused.snapshot?.answers.filter((a) => a.checked).length ?? 0;
                return `${done} ${done === 1 ? "domanda verificata" : "domande verificate"} su ${paused.ids.length}.`;
              })()}
            </Notice>
          )}
        </div>
      )}

      {/* Start: one click to a useful quiz, and the simulation next to it */}
      <div className="mt-8 grid gap-4 lg:grid-cols-12">
        <section aria-labelledby="inizia" className="card flex flex-col rounded-panel p-5 sm:p-8 lg:col-span-7">
          <h2 id="inizia" className="text-sm text-fg-muted">
            Allenati adesso
          </h2>
          {!hydrated ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <p className="mt-1.5 max-w-[30ch] text-balance font-display text-3xl leading-tight text-fg sm:text-4xl">{quick.heading}</p>
              <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-fg-muted sm:text-base">{quick.text}</p>
            </>
          )}
          <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row sm:items-center">
            <Button variant="primary" size="lg" onClick={startQuick} disabled={!hydrated || !quick.pool.length} className="w-full sm:w-auto">
              <Play className="h-4 w-4 fill-current" aria-hidden /> Inizia ({Math.min(QUICK_COUNT, quick.pool.length)} domande)
            </Button>
            <Button variant="ghost" size="lg" href="#personalizzato" className="w-full sm:w-auto">
              Scegli tu argomenti e domande
            </Button>
          </div>
        </section>

        <section aria-labelledby="simulazione" className="card p-5 sm:p-6 lg:col-span-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-white/[0.08] bg-white/[0.03] text-azure-300" aria-hidden>
              <Timer className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="simulazione" className="text-base font-semibold text-fg">
                Simulazione d’esame
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                {EXAM_RULES.questionsPerExam} quesiti in {EXAM_RULES.minutesPerExam} minuti, punteggio +1, 0 e −0,1 come nel D.M. 941/2026.
              </p>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {SUBJECTS.map((s) => {
              const last = sims.filter((r) => r.subject === s.id).at(-1);
              const sc = last ? scoreExam(last.correct, last.wrong) : null;
              return (
                <li key={s.id}>
                  <Link href={`/quiz/simulazione?materia=${s.id}`} className="group -mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-white/[0.03]">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[SUBJECT_TONE[s.id]].dot)} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{s.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                      {hydrated && last && sc ? (
                        <>
                          Ultima {fmt.number(sc.raw)}/{EXAM_RULES.maxPerExam}
                          <span className="sr-only">, {sc.passed ? "superata" : "non superata"}</span>
                        </>
                      ) : (
                        "Da provare"
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Button variant="secondary" href="/quiz/simulazione" className="mt-4 w-full sm:w-auto">
            <Timer className="h-4 w-4" aria-hidden /> Configura la simulazione
          </Button>
        </section>
      </div>

      {/* Builder and evidence */}
      <div className="mt-12 grid gap-x-8 gap-y-12 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section id="personalizzato" aria-labelledby="personalizzato-titolo" className="scroll-mt-24">
          <SectionTitle id="personalizzato-titolo" title="Quiz personalizzato" description="Scegli materia, argomenti e tipo di domande." icon={<ListChecks className="h-4 w-4" />} />
          <div className="card divide-y divide-white/[0.06]">
            <div className="p-5 sm:p-6">
              <div className="mb-2 text-ui font-medium text-fg-muted" aria-hidden>
                Materia
              </div>
              <Segmented
                ariaLabel="Materia"
                value={subject}
                onChange={(v) => {
                  setSubject(v);
                  setTopics(new Set());
                }}
                options={[{ value: "tutte" as SubjectChoice, label: "Tutte" }, ...SUBJECTS.map((s) => ({ value: s.id as SubjectChoice, label: SUBJECT_LABEL[s.id] }))]}
              />
            </div>

            <div className="p-5 sm:p-6">
              <button
                type="button"
                onClick={() => setTopicsOpen((v) => !v)}
                aria-expanded={topicsOpen}
                aria-controls="argomenti"
                className="-mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 text-left hover:bg-white/[0.03]"
              >
                <span className="text-ui font-medium text-fg-muted">
                  Argomenti{" "}
                  <span className="font-normal text-fg">{topics.size ? `${topics.size} ${topics.size === 1 ? "selezionato" : "selezionati"}` : `tutti (${topicOptions.length})`}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200", topicsOpen && "rotate-180")} aria-hidden />
              </button>
              {topicsOpen && (
                <div id="argomenti" className="mt-3 animate-fade-in">
                  <ul className="flex flex-wrap gap-1.5" aria-label="Argomenti">
                    {topicOptions.map((r) => {
                      const on = topics.has(r.topic.id);
                      return (
                        <li key={r.topic.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setTopics((s) => {
                                const n = new Set(s);
                                if (on) n.delete(r.topic.id);
                                else n.add(r.topic.id);
                                return n;
                              })
                            }
                            aria-pressed={on}
                            className={cn(
                              "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-ui transition-colors duration-150",
                              on ? "border-azure-400/50 bg-azure-500/15 text-fg" : "border-white/[0.09] text-fg-muted hover:border-white/[0.18] hover:text-fg",
                            )}
                          >
                            {on && <Check className="h-3.5 w-3.5 shrink-0 text-azure-300" aria-hidden />}
                            {r.topic.title}
                            <span className="text-xs tabular-nums text-fg-subtle">
                              <span className="sr-only">, </span>
                              {topicCounts.get(r.topic.id)}
                              <span className="sr-only"> domande</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {topics.size > 0 && (
                    <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={() => setTopics(new Set())}>
                      <X className="h-3.5 w-3.5" aria-hidden /> Deseleziona tutti
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
              <fieldset>
                <legend className="mb-2 text-ui font-medium text-fg-muted">Tipi di domanda</legend>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => {
                    const on = types.has(t);
                    const last = on && types.size === 1;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        aria-disabled={last || undefined}
                        title={last ? "Serve almeno un tipo di domanda" : undefined}
                        onClick={() =>
                          !last &&
                          setTypes((s) => {
                            const n = new Set(s);
                            if (on) n.delete(t);
                            else n.add(t);
                            return n;
                          })
                        }
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-ui transition-colors duration-150",
                          on ? "border-azure-400/50 bg-azure-500/15 text-fg" : "border-white/[0.09] text-fg-muted hover:border-white/[0.18] hover:text-fg",
                        )}
                      >
                        {on && <Check className="h-3.5 w-3.5 text-azure-300" aria-hidden />}
                        {QUESTION_TYPE_LABEL[t]}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={onlyCalc}
                    onClick={() => setOnlyCalc((v) => !v)}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-ui transition-colors duration-150",
                      onlyCalc ? "border-azure-400/50 bg-azure-500/15 text-fg" : "border-white/[0.09] text-fg-muted hover:border-white/[0.18] hover:text-fg",
                    )}
                  >
                    <Calculator className={cn("h-3.5 w-3.5", onlyCalc ? "text-azure-300" : "")} aria-hidden /> Solo calcolo
                  </button>
                </div>
              </fieldset>
              <div>
                <div className="mb-2 text-ui font-medium text-fg-muted" aria-hidden>
                  Ordine delle domande
                </div>
                <Segmented
                  size="sm"
                  ariaLabel="Ordine delle domande"
                  value={order}
                  onChange={setOrder}
                  options={[
                    { value: "practice", label: "Casuale" },
                    { value: "progressive", label: "Dalla più facile" },
                  ]}
                />
                <p className="mt-2 text-xs text-fg-muted">Dopo ogni risposta vedi subito se è corretta, con la spiegazione.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:p-6">
              <div className="flex items-center gap-3">
                <span className="text-ui font-medium text-fg-muted" aria-hidden>
                  Domande
                </span>
                <Segmented size="sm" ariaLabel="Numero di domande" value={String(count)} onChange={(v) => setCount(Number(v))} options={["5", "10", "20", "30"].map((v) => ({ value: v, label: v }))} />
              </div>
              <span className="text-xs text-fg-muted sm:ml-auto" role="status">
                {pool.length ? `${pluralize(pool.length, "domanda disponibile", "domande disponibili")} con questi filtri` : "Nessuna domanda con questi filtri"}
              </span>
              <Button variant="primary" disabled={!pool.length} onClick={start} className="h-12 w-full sm:h-10 sm:w-auto">
                <Play className="h-4 w-4 fill-current" aria-hidden /> Inizia ({Math.min(count, pool.length)})
              </Button>
            </div>
          </div>
          {!pool.length && (
            <Notice
              tone="warning"
              className="mt-3"
              title="Nessuna domanda corrisponde ai filtri"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setTopics(new Set());
                    setOnlyCalc(false);
                    setTypes(new Set(["mcq", "cloze"]));
                  }}
                >
                  Azzera i filtri
                </Button>
              }
            >
              Prova ad aggiungere argomenti o tipi di domanda, oppure togli «Solo calcolo».
            </Notice>
          )}
        </section>

        <div className="space-y-12">
          <section id="errori" aria-labelledby="errori-titolo" className="scroll-mt-24">
            <SectionTitle
              id="errori-titolo"
              title="Errori da rivedere"
              icon={<RotateCcw className="h-4 w-4" />}
              action={
                recentErrors.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 sm:h-8"
                    onClick={() => begin({ questions: recentErrors.slice(0, 20), title: "Ripasso degli errori", variant: "practice" })}
                  >
                    Rifai gli errori ({Math.min(20, recentErrors.length)})
                  </Button>
                )
              }
            />
            {!hydrated ? (
              <Skeleton className="h-32 w-full rounded-card" />
            ) : recentErrors.length ? (
              <ul className="card divide-y divide-white/[0.06]">
                {recentErrors.slice(0, 3).map((q) => (
                  <li key={q.id} className="p-4">
                    <p className="line-clamp-2 text-sm text-fg">{q.stem}</p>
                    <p className="mt-1.5 flex gap-2 text-sm text-fg-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      <span className="min-w-0">
                        <span className="sr-only">Risposta corretta: </span>
                        <span className="text-fg">{correctAnswerText(q)}</span>
                      </span>
                    </p>
                    <p className="mt-1 line-clamp-2 max-w-prose text-ui leading-relaxed text-fg-muted">{q.explanation}</p>
                  </li>
                ))}
                {recentErrors.length > 3 && <li className="px-4 py-3 text-xs text-fg-muted">E altre {recentErrors.length - 3} domande sbagliate nei quiz recenti.</li>}
              </ul>
            ) : (
              <p className="inset-panel p-4 text-sm leading-relaxed text-fg-muted">
                {withoutDetail
                  ? "I risultati dimostrativi non contengono le singole risposte: gli errori compariranno qui dopo il tuo primo quiz."
                  : "Gli errori dei tuoi quiz compariranno qui, con la risposta corretta e la spiegazione, pronti da rifare."}
              </p>
            )}
          </section>

          <section aria-labelledby="argomenti-titolo">
            <SectionTitle id="argomenti-titolo" title="Per argomento" description="Media degli ultimi 3 risultati, dal più debole." icon={<Flag className="h-4 w-4" />} />
            {!hydrated ? (
              <Skeleton className="h-40 w-full rounded-card" />
            ) : topicStats.length ? (
              <ul className="card space-y-1 p-2">
                {topicStats.slice(0, 6).map((t) => (
                  <li key={t.ref.topic.id}>
                    <Link href={`/materie/${t.ref.subject.id}/${t.ref.topic.id}#quiz`} className="group block rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.03]">
                      <span className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-fg-reading group-hover:text-fg">{t.ref.topic.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                          {fmt.percent(t.acc)}
                          <span className="sr-only"> di risposte corrette</span>
                        </span>
                      </span>
                      <ProgressBar value={t.acc} tone={t.acc >= 0.8 ? "success" : t.acc >= 0.6 ? "warning" : "danger"} className="mt-1.5" label={`${t.ref.topic.title}: ${fmt.percent(t.acc)} corrette`} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="inset-panel p-4 text-sm leading-relaxed text-fg-muted">Completa un quiz per vedere qui gli argomenti, dal più debole al più solido.</p>
            )}
          </section>
        </div>
      </div>

      {/* History */}
      <section className="mt-12" aria-labelledby="storico">
        <SectionTitle id="storico" title="I tuoi risultati" icon={<History className="h-4 w-4" />} />
        {!hydrated ? (
          <Skeleton className="h-48 w-full rounded-card" />
        ) : saved.length ? (
          <div className="card overflow-hidden">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-white/[0.07] p-5 sm:grid-cols-4 sm:px-6">
              <div>
                <dt className="text-ui text-fg-muted">Risposte date</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{totalAnswered}</dd>
              </div>
              <div>
                <dt className="text-ui text-fg-muted">Corrette</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{totalAnswered ? fmt.percent(totalCorrect / totalAnswered) : "—"}</dd>
              </div>
              <div>
                <dt className="text-ui text-fg-muted">Simulazioni</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{sims.length}</dd>
              </div>
              <div>
                <dt className="text-ui text-fg-muted">Quesiti nella banca</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{QUESTIONS.length}</dd>
              </div>
            </dl>
            <ul className="divide-y divide-white/[0.06]">
              {[...saved]
                .reverse()
                .slice(0, 12)
                .map((r) => {
                  const exam = r.kind === "simulazione" ? scoreExam(r.correct, r.wrong) : null;
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-fg">{r.title}</div>
                        <div className="mt-0.5 text-xs text-fg-subtle">
                          {fmt.dateShort(r.date)}, {fmt.time(r.date)}
                          <span className="hidden sm:inline">, {formatDuration(r.durationSec, { seconds: false })}</span>
                        </div>
                      </div>
                      <Badge tone="muted" className="hidden sm:inline-flex">
                        {r.kind === "simulazione" ? "Simulazione" : r.kind === "sessione" ? "Sessione" : "Quiz"}
                      </Badge>
                      {exam ? (
                        <span className="flex w-28 shrink-0 items-center justify-end gap-1.5 text-sm tabular-nums text-fg">
                          {exam.passed ? <Check className="h-4 w-4 text-success" aria-hidden /> : <CircleSlash className="h-4 w-4 text-danger" aria-hidden />}
                          {fmt.number(exam.raw)}/{EXAM_RULES.maxPerExam}
                          <span className="sr-only">{exam.passed ? ", superata" : ", non superata"}</span>
                        </span>
                      ) : (
                        <span className="w-28 shrink-0 text-right text-sm tabular-nums text-fg-muted">
                          <span className="text-fg">{r.correct}</span>/{r.total}
                          <span className="sr-only"> corrette</span>
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={<History aria-hidden />}
            title="Nessun risultato ancora"
            description="I quiz e le simulazioni che completi vengono salvati qui, con il punteggio e la durata."
            action={
              <Button variant="secondary" onClick={startQuick} disabled={!quick.pool.length}>
                Fai il primo quiz
              </Button>
            }
          />
        )}
      </section>

      <Notice tone="info" className="mt-8">
        La banca ATLAS contiene {QUESTIONS.length} quesiti originali: ripetendo molte simulazioni rivedrai le stesse domande. Per allenarti su materiale nuovo puoi generare quiz dai tuoi documenti in Biblioteca, se l’AI è configurata.
      </Notice>
    </div>
  );
}
