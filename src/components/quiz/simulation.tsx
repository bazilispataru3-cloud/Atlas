"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Coffee, ExternalLink, Flag, Play, ShieldCheck, Timer, Trophy } from "lucide-react";
import type { Question, SubjectId } from "@/lib/types";
import { questionsFor } from "@/data/questions";
import { getSubject, SUBJECTS } from "@/data/syllabus";
import { EXAM_DATES, EXAM_RULES, scoreExam } from "@/data/exam";
import { QuizRunner, type QuizOutcome } from "@/components/exercises/quiz-runner";
import { Badge, Button, Card, Notice, PageHeader, Segmented } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { SUBJECT_ICON } from "@/components/study/start-study-modal";
import { useRecordQuiz } from "@/lib/record";
import { cn, fmt, shuffle } from "@/lib/utils";

/** Order of the three tests on exam day, as listed in the official calendar. */
const DAY_ORDER: SubjectId[] = ["chimica", "fisica", "biologia"];

function bankFor(subject: SubjectId) {
  return { mcq: questionsFor({ subject, types: ["mcq"] }), cloze: questionsFor({ subject, types: ["cloze"] }) };
}

function buildExam(subject: SubjectId, seed: number): Question[] {
  const b = bankFor(subject);
  return [...shuffle(b.mcq, seed).slice(0, EXAM_RULES.multipleChoice), ...shuffle(b.cloze, seed + 1).slice(0, EXAM_RULES.completion)];
}

type Phase = { kind: "setup" } | { kind: "exam"; i: number } | { kind: "break"; i: number; until: number } | { kind: "done" };

function BreakScreen({ until, next, onDone }: { until: number; next: SubjectId; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((until - now) / 1000));
  useEffect(() => {
    if (left === 0) onDone();
  }, [left, onDone]);
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <Coffee className="mx-auto h-9 w-9 text-gold-300" />
      <h2 className="mt-4 font-display text-4xl text-fg">Pausa</h2>
      <p className="mt-2 text-[14px] text-fg-muted">Come all’esame, tra una prova e l’altra ci sono {EXAM_RULES.breakMinutes} minuti. Prossima prova: <strong className="text-fg">{getSubject(next)?.name}</strong>.</p>
      <div className="mt-6 font-mono text-5xl text-fg">{fmt.clock(left)}</div>
      <Button variant="secondary" className="mt-6" onClick={onDone}>Salta la pausa e inizia</Button>
    </Card>
  );
}

export function Simulation() {
  const params = useSearchParams();
  const pre = params.get("materia");
  const recordQuiz = useRecordQuiz();
  const [format, setFormat] = useState<"singola" | "completa">(pre ? "singola" : "singola");
  const [subject, setSubject] = useState<SubjectId>(pre === "chimica" || pre === "fisica" || pre === "biologia" ? pre : "biologia");
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [seed, setSeed] = useState(0);
  const [outcomes, setOutcomes] = useState<{ subject: SubjectId; o: QuizOutcome }[]>([]);

  const order = format === "completa" ? DAY_ORDER : [subject];
  const exams = useMemo(() => (seed ? order.map((s, k) => buildExam(s, seed + k * 101)) : []), [seed, order.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const bankOk = order.every((s) => {
    const b = bankFor(s);
    return b.mcq.length >= EXAM_RULES.multipleChoice && b.cloze.length >= EXAM_RULES.completion;
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase.kind]);

  const start = () => {
    setOutcomes([]);
    setSeed(Date.now());
    setPhase({ kind: "exam", i: 0 });
  };

  if (phase.kind === "setup") {
    const nextDate = EXAM_DATES.find((d) => new Date(d.date).getTime() > Date.now());
    return (
      <div className="pb-16">
        <Button variant="ghost" size="sm" href="/quiz"><ArrowLeft className="h-4 w-4" /> Quiz e simulazioni</Button>
        <PageHeader
          className="mt-4"
          eyebrow={<span className="flex items-center gap-2"><Timer className="h-3.5 w-3.5" /> Simulazione d’esame</span>}
          title={<>Prova come il giorno dell’esame.</>}
          description="Struttura, tempi e punteggio seguono il D.M. 941/2026. I quesiti sono originali ATLAS: non sono quesiti ministeriali e non ne riproducono il livello di difficoltà ufficiale, che non è pubblicato."
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="p-6">
            <div className="text-[12px] font-medium text-fg-muted">Formato</div>
            <Segmented
              className="mt-2"
              value={format}
              onChange={setFormat}
              options={[
                { value: "singola", label: "Una prova (50 min)" },
                { value: "completa", label: "Giornata completa (3 prove + pause)" },
              ]}
            />
            {format === "singola" ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {SUBJECTS.map((s) => {
                  const Icon = SUBJECT_ICON[s.id];
                  const on = s.id === subject;
                  return (
                    <button key={s.id} onClick={() => setSubject(s.id)} aria-pressed={on} className={cn("flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition", on ? "border-azure-400/50 bg-azure-500/10" : "border-white/[0.08] hover:border-white/20")}>
                      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", TONE[SUBJECT_TONE[s.id]].bg, TONE[SUBJECT_TONE[s.id]].text)}><Icon className="h-5 w-5" /></span>
                      <span className="text-[14px] font-medium text-fg">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <ol className="mt-6 space-y-2">
                {DAY_ORDER.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[13.5px]">
                    <span className="font-mono text-fg-subtle">{i + 1}</span>
                    <span className="flex-1 text-fg">{getSubject(s)?.name}</span>
                    <span className="text-fg-subtle">{EXAM_RULES.minutesPerExam} min</span>
                    {i < 2 && <Badge tone="gold">poi {EXAM_RULES.breakMinutes} min di pausa</Badge>}
                  </li>
                ))}
              </ol>
            )}
            {!bankOk && <Notice tone="warning" className="mt-4">La banca ATLAS non contiene ancora abbastanza quesiti per questa simulazione.</Notice>}
            <Button variant="primary" size="lg" className="mt-6" disabled={!bankOk} onClick={start}>
              <Play className="h-4 w-4 fill-current" /> Avvia la simulazione
            </Button>
            <p className="mt-3 text-[12px] text-fg-subtle">Il timer parte subito. Allo scadere la prova viene consegnata automaticamente.</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-fg"><ShieldCheck className="h-4 w-4 text-azure-300" /> Regole ufficiali</div>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-fg-muted">
              <li>• {EXAM_RULES.questionsPerExam} quesiti per prova: {EXAM_RULES.multipleChoice} a risposta multipla ({EXAM_RULES.optionsPerMultipleChoice} opzioni, una corretta) e {EXAM_RULES.completion} a completamento.</li>
              <li>• Completamento: {EXAM_RULES.completionRule}</li>
              <li>• {EXAM_RULES.minutesPerExam} minuti per prova, {EXAM_RULES.breakMinutes} minuti di pausa tra le prove.</li>
              <li>• Punteggio: +{EXAM_RULES.scoring.correct} esatta, {EXAM_RULES.scoring.blank} omessa, {String(EXAM_RULES.scoring.wrong).replace(".", ",")} errata. Massimo {EXAM_RULES.maxPerExam} (30 e lode).</li>
              <li>• Prova superata con almeno {EXAM_RULES.passThreshold}/30.</li>
            </ul>
            {nextDate && (
              <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 text-[12.5px] text-fg-subtle">
                Prossimo appello: <span className="text-fg">{fmt.full(nextDate.date)}</span>, ore 11:00
              </div>
            )}
            <div className="mt-4 space-y-1">
              {EXAM_RULES.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 text-[12px] text-azure-300 hover:underline">
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /> {s.label}
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (phase.kind === "break") {
    return <BreakScreen until={phase.until} next={order[phase.i + 1]} onDone={() => setPhase({ kind: "exam", i: phase.i + 1 })} />;
  }

  if (phase.kind === "done") {
    const scores = outcomes.map((x) => ({ ...x, s: scoreExam(x.o.correct, x.o.wrong) }));
    const total = scores.reduce((a, x) => a + x.s.raw, 0);
    return (
      <div className="mx-auto max-w-3xl pb-16">
        <Card className="p-8 text-center">
          <Trophy className="mx-auto h-10 w-10 text-gold-300" />
          <h1 className="mt-4 font-display text-4xl text-fg">Giornata di simulazione completata</h1>
          <div className="mt-2 font-mono text-3xl text-fg">{fmt.number(total)} <span className="text-[16px] text-fg-subtle">/ {EXAM_RULES.maxTotal}</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {scores.map((x) => (
              <div key={x.subject} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="text-[12px] text-fg-subtle">{getSubject(x.subject)?.name}</div>
                <div className={cn("mt-1 font-mono text-2xl", x.s.passed ? "text-emerald-300" : "text-red-300")}>{fmt.number(x.s.raw)}</div>
                <div className="text-[12px] text-fg-subtle">{x.s.passed ? (x.s.lode ? "30 e lode" : `Superata: ${x.s.careerGrade}/30`) : "Non superata"}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="primary" onClick={() => setPhase({ kind: "setup" })}>Nuova simulazione</Button>
            <Button variant="secondary" href="/quiz">Analisi degli errori</Button>
          </div>
        </Card>
      </div>
    );
  }

  // exam phase
  const i = phase.i;
  const subj = order[i];
  const finished = outcomes.length > i;
  const isLast = i === order.length - 1;
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="azure"><Timer className="h-3 w-3" /> Simulazione · prova {i + 1} di {order.length}</Badge>
        <Badge tone={SUBJECT_TONE[subj]}>{getSubject(subj)?.name}</Badge>
        {!finished && (
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-fg-subtle"><AlertTriangle className="h-3.5 w-3.5" /> Le risposte errate valgono −0,1: se non sai, lascia in bianco.</span>
        )}
      </div>
      <QuizRunner
        key={`${seed}-${i}`}
        questions={exams[i]}
        variant="exam"
        timeLimitSec={EXAM_RULES.minutesPerExam * 60}
        seed={seed + i}
        title={`Simulazione · ${getSubject(subj)?.name}`}
        onFinish={(o) => {
          recordQuiz(o, { kind: "simulazione", title: `Simulazione · ${getSubject(subj)?.name}`, subject: subj });
          setOutcomes((prev) => [...prev, { subject: subj, o }]);
        }}
      />
      {finished && (
        <Card className="mt-5 flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
          <span className="flex items-center gap-2 text-[13.5px] text-fg-muted"><Flag className="h-4 w-4" /> Prova consegnata.</span>
          {isLast ? (
            order.length > 1 ? (
              <Button variant="primary" onClick={() => setPhase({ kind: "done" })}>Vedi il risultato complessivo</Button>
            ) : (
              <Button variant="secondary" onClick={() => setPhase({ kind: "setup" })}>Nuova simulazione</Button>
            )
          ) : (
            <Button variant="primary" onClick={() => setPhase({ kind: "break", i, until: Date.now() + EXAM_RULES.breakMinutes * 60_000 })}>
              <Coffee className="h-4 w-4" /> Pausa, poi {getSubject(order[i + 1])?.name}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
