"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, ChevronLeft, ChevronRight, Flag, Clock, Sparkles, RotateCcw, GalleryVerticalEnd, CircleSlash, Info } from "lucide-react";
import type { OpenQuestion, Question } from "@/lib/types";
import { correctAnswerText, grade, present, QUESTION_TYPE_LABEL, type PresentedQuestion } from "@/data/questions";
import { getTopicRef } from "@/data/syllabus";
import { Badge, Button, Card, Notice, ProgressBar, ProgressRing, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas, type QuizAnswerRecord } from "@/lib/store";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { EXAM_RULES, scoreExam } from "@/data/exam";
import { cn, fmt } from "@/lib/utils";

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

interface Props {
  questions: Question[];
  variant?: Variant;
  title?: string;
  timeLimitSec?: number;
  seed?: number;
  onFinish?: (o: QuizOutcome) => void;
  /** Hide the final "add errors to flashcards" action. */
  compactSummary?: boolean;
}

type AnswerState = { value: string | number | null; checked: boolean; selfScore?: number; ai?: { score: number; feedback: string; missing: string[] } };

const LETTERS = ["A", "B", "C", "D", "E"];

export function QuizRunner({ questions, variant = "practice", title, timeLimitSec, seed, onFinish, compactSummary }: Props) {
  const ordered = useMemo(() => (variant === "progressive" ? [...questions].sort((a, b) => a.difficulty - b.difficulty) : questions), [questions, variant]);
  const presented = useMemo<PresentedQuestion[]>(() => present(ordered, seed), [ordered, seed]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>(() => presented.map(() => ({ value: null, checked: false })));
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState<QuizOutcome | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    setAnswers(presented.map(() => ({ value: null, checked: false })));
    setIndex(0);
    setFinished(null);
    finishedRef.current = false;
  }, [presented]);

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [finished, startedAt]);

  const remaining = timeLimitSec ? Math.max(0, timeLimitSec - elapsed) : null;
  useEffect(() => {
    if (remaining === 0 && !finishedRef.current) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  if (!presented.length) {
    return <Notice tone="info">Non ci sono ancora quesiti per questa selezione.</Notice>;
  }

  const current = presented[index];
  const state = answers[index];
  const exam = variant === "exam";

  const setAnswer = (patch: Partial<AnswerState>) => setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const evaluate = (p: PresentedQuestion, a: AnswerState): boolean | null => {
    if (p.q.type === "open") {
      const s = a.ai?.score ?? a.selfScore;
      return s === undefined ? null : s >= 0.6;
    }
    if (a.value === null || a.value === "") return null;
    if (p.q.type === "mcq") return grade(p.q, p.order[Number(a.value)]);
    return grade(p.q, a.value);
  };

  function finish() {
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
    const official = exam;
    const score = official ? scoreExam(correct, wrong).raw : correct;
    const outcome: QuizOutcome = {
      correct,
      wrong,
      blank,
      total: presented.length,
      score,
      maxScore: official ? presented.length : presented.length,
      durationSec: Math.floor((Date.now() - startedAt) / 1000),
      answers: records,
      ratio: presented.length ? correct / presented.length : 0,
    };
    setFinished(outcome);
    onFinish?.(outcome);
  }

  if (finished) {
    return <QuizSummary outcome={finished} presented={presented} answers={answers} exam={exam} title={title} compact={compactSummary} onRetry={() => {
      finishedRef.current = false;
      setAnswers(presented.map(() => ({ value: null, checked: false })));
      setIndex(0);
      setFinished(null);
    }} />;
  }

  const verdict = state.checked ? evaluate(current, state) : null;
  const answeredCount = answers.filter((a, i) => a.value !== null && a.value !== "" || (presented[i].q.type === "open" && a.checked)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-[13px] text-fg-muted">
          Domanda <span className="font-mono text-fg">{index + 1}</span> di {presented.length}
        </div>
        <Badge tone={current.q.type === "mcq" ? "azure" : current.q.type === "cloze" ? "deep" : "ultra"}>{QUESTION_TYPE_LABEL[current.q.type]}</Badge>
        <Badge tone="muted">{"●".repeat(current.q.difficulty)}{"○".repeat(3 - current.q.difficulty)} difficoltà</Badge>
        <div className="ml-auto flex items-center gap-2 font-mono text-[13px]">
          <Clock className="h-3.5 w-3.5 text-fg-subtle" />
          <span className={cn(remaining !== null && remaining < 300 ? "text-amber-300" : "text-fg-muted")}>{remaining !== null ? fmt.clock(remaining) : fmt.clock(elapsed)}</span>
        </div>
      </div>
      <ProgressBar value={(index + 1) / presented.length} tone="azure" />

      {/* Question */}
      <Card className="p-5 sm:p-6">
        <div className="text-[11.5px] text-fg-subtle">{getTopicRef(current.q.topicId)?.topic.title} · quesito originale ATLAS</div>
        <p className="mt-2 text-[16.5px] leading-relaxed text-fg">{current.q.stem}</p>

        {current.q.type === "mcq" && (
          <div className="mt-5 grid gap-2" role="radiogroup" aria-label="Opzioni di risposta">
            {current.order.map((optIndex, pos) => {
              const selected = state.value === pos;
              const isCorrect = optIndex === (current.q as { correct: number }).correct;
              const reveal = state.checked && !exam;
              return (
                <button
                  key={pos}
                  role="radio"
                  aria-checked={selected}
                  disabled={state.checked && !exam}
                  onClick={() => setAnswer({ value: selected && exam ? null : pos })}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[14.5px] transition",
                    !reveal && selected && "border-azure-400/60 bg-azure-500/10 text-fg",
                    !reveal && !selected && "border-white/[0.08] bg-white/[0.02] text-fg-muted hover:border-white/20 hover:text-fg",
                    reveal && isCorrect && "border-emerald-400/50 bg-emerald-500/10 text-fg",
                    reveal && selected && !isCorrect && "border-red-400/50 bg-red-500/10 text-fg",
                    reveal && !selected && !isCorrect && "border-white/[0.05] text-fg-subtle",
                  )}
                >
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md border font-mono text-[11px]", selected ? "border-azure-300/60 text-azure-200" : "border-white/15 text-fg-subtle")}>{LETTERS[pos]}</span>
                  <span className="pt-0.5">{(current.q as { options: string[] }).options[optIndex]}</span>
                  {reveal && isCorrect && <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />}
                  {reveal && selected && !isCorrect && <X className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-red-300" />}
                </button>
              );
            })}
          </div>
        )}

        {current.q.type === "cloze" && (
          <div className="mt-5">
            <input
              value={(state.value as string) ?? ""}
              onChange={(e) => setAnswer({ value: e.target.value.toUpperCase() })}
              onKeyDown={(e) => e.key === "Enter" && !exam && state.value && setAnswer({ checked: true })}
              disabled={state.checked && !exam}
              placeholder="RISPOSTA (UN SOLO CONCETTO)"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 font-mono text-[15px] uppercase tracking-wide text-fg placeholder:text-fg-subtle focus:border-azure-400/60 focus:outline-none"
              aria-label="Risposta a completamento"
            />
            <p className="mt-1.5 text-[11.5px] text-fg-subtle">Come all’esame: una risposta di un solo concetto, in stampatello. Accenti e maiuscole non contano.</p>
          </div>
        )}

        {current.q.type === "open" && <OpenAnswer q={current.q} state={state} onChange={setAnswer} exam={exam} />}

        {/* Feedback */}
        {!exam && state.checked && current.q.type !== "open" && (
          <div className={cn("mt-5 rounded-2xl border p-4", verdict ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-red-400/30 bg-red-500/[0.06]")}>
            <div className="flex items-center gap-2 text-sm font-medium text-fg">
              {verdict ? <Check className="h-4 w-4 text-emerald-300" /> : <X className="h-4 w-4 text-red-300" />}
              {verdict ? "Corretto" : verdict === false ? "Non corretto" : "Nessuna risposta"}
              {!verdict && <span className="font-normal text-fg-muted">— risposta: <span className="text-fg">{correctAnswerText(current.q)}</span></span>}
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">{current.q.explanation}</p>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          <ChevronLeft className="h-4 w-4" /> Precedente
        </Button>
        {exam && (
          <>
            <Button variant="ghost" onClick={() => setFlags((f) => { const n = new Set(f); if (n.has(index)) n.delete(index); else n.add(index); return n; })}>
              <Flag className={cn("h-4 w-4", flags.has(index) && "fill-amber-300 text-amber-300")} /> {flags.has(index) ? "Segnata" : "Segna"}
            </Button>
            <Button variant="ghost" onClick={() => setAnswer({ value: null })} disabled={state.value === null || state.value === ""}>
              <CircleSlash className="h-4 w-4" /> Non rispondo
            </Button>
          </>
        )}
        <div className="ml-auto flex gap-2">
          {!exam && !state.checked && current.q.type !== "open" && (
            <Button variant="primary" disabled={state.value === null || state.value === ""} onClick={() => setAnswer({ checked: true })}>
              Verifica
            </Button>
          )}
          {(exam || state.checked) && index < presented.length - 1 && (
            <Button variant={exam ? "secondary" : "primary"} onClick={() => setIndex((i) => i + 1)}>
              Successiva <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {(index === presented.length - 1 && (exam || state.checked)) && (
            <Button variant="primary" onClick={finish}>
              {exam ? "Consegna" : "Termina"}
            </Button>
          )}
          {exam && index < presented.length - 1 && (
            <Button variant="outline" onClick={() => { if (confirm(`Consegnare ora? Hai risposto a ${answeredCount} domande su ${presented.length}.`)) finish(); }}>
              Consegna
            </Button>
          )}
        </div>
      </div>

      {exam && (
        <div className="flex flex-wrap gap-1.5" aria-label="Navigazione domande">
          {presented.map((p, i) => {
            const a = answers[i];
            const answered = a.value !== null && a.value !== "";
            return (
              <button
                key={p.q.id}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-8 w-8 rounded-lg border font-mono text-[11.5px] transition",
                  i === index ? "border-azure-400/70 text-fg" : "border-white/10",
                  answered ? "bg-azure-500/20 text-azure-100" : "bg-white/[0.02] text-fg-subtle",
                  flags.has(i) && "ring-1 ring-amber-300/70",
                )}
                aria-label={`Domanda ${i + 1}${answered ? ", risposta data" : ""}${flags.has(i) ? ", segnata" : ""}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OpenAnswer({ q, state, onChange, exam }: { q: OpenQuestion; state: AnswerState; onChange: (p: Partial<AnswerState>) => void; exam: boolean }) {
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
    if (r.ok) onChange({ ai: r.data.data, checked: true });
    else setErr(r.error.message);
  };

  return (
    <div className="mt-5 space-y-3">
      <Textarea rows={5} value={(state.value as string) ?? ""} onChange={(e) => onChange({ value: e.target.value })} placeholder="Scrivi la tua risposta…" disabled={state.checked} aria-label="Risposta aperta" />
      {!state.checked && !exam && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!state.value} onClick={() => onChange({ checked: true, selfScore: undefined })}>
            Confronta con la risposta modello
          </Button>
          {integrations?.ai && (
            <Button variant="primary" disabled={!state.value || loading} onClick={askAI}>
              <Sparkles className="h-4 w-4" /> {loading ? "Valutazione…" : "Valuta con AI"}
            </Button>
          )}
        </div>
      )}
      {err && <Notice tone="warning">{err}</Notice>}
      {state.checked && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[12px] font-medium uppercase tracking-wide text-fg-subtle">Risposta modello</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{q.modelAnswer}</p>
          {state.ai ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-fg">
                <Sparkles className="h-4 w-4 text-azure-300" /> Valutazione AI: <span className="font-mono">{Math.round(state.ai.score * 100)}%</span>
              </div>
              <p className="mt-1 text-[13.5px] text-fg-muted">{state.ai.feedback}</p>
              {state.ai.missing.length > 0 && <p className="mt-1 text-[13px] text-amber-200">Manca: {state.ai.missing.join("; ")}</p>}
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-[12.5px] text-fg-muted">Autovaluta: quali punti chiave hai toccato?</div>
              <ul className="mt-2 space-y-1.5">
                {q.keyPoints.map((k, i) => (
                  <li key={k}>
                    <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-fg-muted">
                      <input
                        type="checkbox"
                        checked={checks[i]}
                        onChange={() => {
                          const next = checks.map((c, j) => (j === i ? !c : c));
                          setChecks(next);
                          onChange({ selfScore: next.filter(Boolean).length / q.keyPoints.length });
                        }}
                        className="h-4 w-4 accent-[#2f8bff]"
                      />
                      {k}
                    </label>
                  </li>
                ))}
              </ul>
              {state.selfScore === undefined && <p className="mt-2 text-[11.5px] text-fg-subtle">Seleziona i punti presenti (anche nessuno) per registrare il punteggio.</p>}
              {state.selfScore === undefined && (
                <button className="mt-1 text-[12px] text-azure-300" onClick={() => onChange({ selfScore: 0 })}>
                  Nessuno dei punti
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuizSummary({
  outcome,
  presented,
  answers,
  exam,
  title,
  onRetry,
  compact,
}: {
  outcome: QuizOutcome;
  presented: PresentedQuestion[];
  answers: AnswerState[];
  exam: boolean;
  title?: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  const addCards = useAtlas((s) => s.addCards);
  const wrong = presented.map((p, i) => ({ p, a: answers[i], r: outcome.answers[i] })).filter((x) => x.r.correct !== true);
  const byTopic = new Map<string, { ok: number; n: number }>();
  for (const r of outcome.answers) {
    const t = byTopic.get(r.topicId) ?? { ok: 0, n: 0 };
    t.n++;
    if (r.correct) t.ok++;
    byTopic.set(r.topicId, t);
  }
  const bySkill = new Map<string, { ok: number; n: number }>();
  presented.forEach((p, i) => {
    const s = bySkill.get(p.q.skill) ?? { ok: 0, n: 0 };
    s.n++;
    if (outcome.answers[i].correct) s.ok++;
    bySkill.set(p.q.skill, s);
  });
  const examScore = exam ? scoreExam(outcome.correct, outcome.wrong) : null;

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ProgressRing value={outcome.ratio} size={128} stroke={11} tone={outcome.ratio >= 0.8 ? "success" : outcome.ratio >= 0.6 ? "warning" : "danger"}>
            <div className="text-center">
              <div className="font-mono text-2xl text-fg">{exam ? fmt.number(examScore!.raw) : `${outcome.correct}/${outcome.total}`}</div>
              <div className="text-[11px] text-fg-subtle">{exam ? `su ${EXAM_RULES.maxPerExam}` : "corrette"}</div>
            </div>
          </ProgressRing>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-[12px] uppercase tracking-[0.14em] text-fg-subtle">{title ?? "Risultato"}</div>
            <div className="mt-1 font-display text-3xl text-fg">
              {exam ? (examScore!.passed ? (examScore!.lode ? "30 e lode" : `Superata: ${examScore!.careerGrade}/30`) : "Non superata") : outcome.ratio >= 0.8 ? "Ottimo lavoro" : outcome.ratio >= 0.6 ? "Buona base, qualche lacuna" : "Da consolidare"}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-[12.5px] sm:justify-start">
              <Badge tone="success">{outcome.correct} corrette</Badge>
              <Badge tone="danger">{outcome.wrong} errate</Badge>
              <Badge tone="muted">{outcome.blank} senza risposta</Badge>
              <Badge tone="muted">{fmt.clock(outcome.durationSec)} min</Badge>
            </div>
            {exam && (
              <p className="mt-3 text-[12px] text-fg-subtle">
                Punteggio secondo il D.M. 941/2026: +1 per risposta esatta, 0 per omessa, −0,1 per errata. Sufficienza: 18/30.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 text-[13px] font-medium text-fg">Analisi per argomento</div>
          <ul className="space-y-2.5">
            {[...byTopic.entries()].map(([id, v]) => (
              <li key={id}>
                <div className="flex justify-between text-[12.5px]">
                  <span className="truncate text-fg-muted">{getTopicRef(id)?.topic.title ?? id}</span>
                  <span className="font-mono text-fg">{v.ok}/{v.n}</span>
                </div>
                <ProgressBar value={v.ok / v.n} tone={v.ok / v.n >= 0.8 ? "success" : v.ok / v.n >= 0.5 ? "warning" : "danger"} className="mt-1" />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="mb-3 text-[13px] font-medium text-fg">Analisi per tipo di competenza</div>
          <ul className="space-y-2.5">
            {[...bySkill.entries()].map(([k, v]) => (
              <li key={k}>
                <div className="flex justify-between text-[12.5px]">
                  <span className="capitalize text-fg-muted">{k}</span>
                  <span className="font-mono text-fg">{v.ok}/{v.n}</span>
                </div>
                <ProgressBar value={v.ok / v.n} tone="azure" className="mt-1" />
              </li>
            ))}
          </ul>
          <p className="mt-3 flex gap-1.5 text-[11.5px] text-fg-subtle">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Errori su «calcolo» indicano spesso problemi di unità di misura o di impostazione; su «concetto», definizioni da ripassare.
          </p>
        </Card>
      </div>

      {wrong.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[13px] font-medium text-fg">Revisione degli errori ({wrong.length})</div>
            {!compact && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const n = addCards(
                    wrong.map(({ p }) => ({
                      front: p.q.stem,
                      back: `${correctAnswerText(p.q)}\n\n${p.q.explanation}`,
                      subject: p.q.subject,
                      topicId: p.q.topicId,
                      deck: "Errori dei quiz",
                      origin: "atlas" as const,
                    })),
                  );
                  toast(n ? `${n} flashcard create dagli errori` : "Queste flashcard esistono già", { tone: n ? "success" : "info" });
                }}
              >
                <GalleryVerticalEnd className="h-4 w-4" /> Trasforma in flashcard
              </Button>
            )}
          </div>
          <ul className="space-y-3">
            {wrong.map(({ p, a, r }) => (
              <li key={p.q.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="text-[13.5px] text-fg">{p.q.stem}</div>
                <div className="mt-1.5 text-[12.5px]">
                  {r.correct === false && (
                    <span className="text-red-300">
                      La tua risposta: {p.q.type === "mcq" && a.value !== null ? (p.q as { options: string[] }).options[p.order[Number(a.value)]] : String(a.value ?? "—")}
                      {" · "}
                    </span>
                  )}
                  {r.correct === null && <span className="text-fg-subtle">Senza risposta · </span>}
                  <span className="text-emerald-300">Corretta: {correctAnswerText(p.q)}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-fg-subtle">{p.q.explanation}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" /> Ripeti
        </Button>
      </div>
    </div>
  );
}
