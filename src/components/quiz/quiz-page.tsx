"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Calculator, ChevronRight, ClipboardList, History, ListChecks, Play, RotateCcw, ShieldCheck, Target, Timer } from "lucide-react";
import type { Question, SubjectId } from "@/lib/types";
import { QUESTIONS, QUESTION_TYPE_LABEL, correctAnswerText, questionsFor } from "@/data/questions";
import { getTopicRef, SUBJECTS } from "@/data/syllabus";
import { EXAM_RULES, scoreExam } from "@/data/exam";
import { QuizRunner } from "@/components/exercises/quiz-runner";
import { Badge, Button, Card, EmptyState, Notice, PageHeader, ProgressBar, SectionTitle, Segmented, Stat } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { SUBJECT_ICON } from "@/components/study/start-study-modal";
import { useAtlas } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { useRecordQuiz } from "@/lib/record";
import { cn, fmt, pluralize, shuffle } from "@/lib/utils";

type SubjectChoice = SubjectId | "tutte";
type Running = { questions: Question[]; title: string; variant: "practice" | "progressive"; subject?: SubjectId; seed: number };

const TYPES: Question["type"][] = ["mcq", "cloze", "open"];

export function QuizPage() {
  const params = useSearchParams();
  const topicParam = params.get("topic");
  const preRef = topicParam ? getTopicRef(topicParam) : undefined;
  const hydrated = useHydrated();
  const results = useAtlas((s) => s.quizResults);
  const recordQuiz = useRecordQuiz();

  const [subject, setSubject] = useState<SubjectChoice>(preRef?.subject.id ?? "tutte");
  const [topics, setTopics] = useState<Set<string>>(() => new Set(preRef ? [preRef.topic.id] : []));
  const [types, setTypes] = useState<Set<Question["type"]>>(new Set(["mcq", "cloze"]));
  const [onlyCalc, setOnlyCalc] = useState(false);
  const [count, setCount] = useState(10);
  const [variant, setVariant] = useState<"practice" | "progressive">("practice");
  const [running, setRunning] = useState<Running | null>(null);

  useEffect(() => {
    if (running) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [running]);

  // Topics that have at least one question, grouped by subject.
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of QUESTIONS) m.set(q.topicId, (m.get(q.topicId) ?? 0) + 1);
    return m;
  }, []);
  const topicOptions = [...topicCounts.keys()]
    .map((id) => getTopicRef(id)!)
    .filter((r) => r && (subject === "tutte" || r.subject.id === subject));

  const pool = QUESTIONS.filter(
    (q) =>
      (subject === "tutte" || q.subject === subject) &&
      (!topics.size || topics.has(q.topicId)) &&
      types.has(q.type) &&
      (!onlyCalc || q.skill === "calcolo"),
  );

  const start = () => {
    const seed = Date.now();
    const qs = shuffle(pool, seed).slice(0, count);
    const label = topics.size === 1 ? getTopicRef([...topics][0])?.topic.title : subject === "tutte" ? "Quiz misto" : SUBJECTS.find((s) => s.id === subject)?.name;
    setRunning({ questions: qs, title: `Quiz · ${label}`, variant, subject: subject === "tutte" ? undefined : subject, seed });
  };

  // ── Analytics from saved results ───────────────────────────
  const saved = hydrated ? results : [];
  // Per-topic accuracy from every quiz evidence (custom quizzes, sessions, simulations).
  const progress = useAtlas((s) => s.progress);
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
    for (const r of [...saved].reverse()) for (const a of r.answers) {
      if (a.correct !== false || seen.has(a.questionId)) continue;
      const q = QUESTIONS.find((x) => x.id === a.questionId);
      if (q) { seen.add(q.id); out.push(q); }
    }
    return out;
  }, [saved]);
  const sims = saved.filter((r) => r.kind === "simulazione");
  const totalAnswered = saved.reduce((n, r) => n + r.total, 0);
  const totalCorrect = saved.reduce((n, r) => n + r.correct, 0);

  if (running) {
    return (
      <div className="mx-auto max-w-3xl pb-16">
        <Button variant="ghost" size="sm" onClick={() => setRunning(null)}><ArrowLeft className="h-4 w-4" /> Torna ai quiz</Button>
        <p className="mt-3 text-[12.5px] text-fg-subtle">Quesiti originali ATLAS nel formato d’esame. Non sono quesiti ministeriali.</p>
        <div className="mt-4">
          <QuizRunner
            questions={running.questions}
            variant={running.variant}
            title={running.title}
            seed={running.seed}
            onFinish={(o) => recordQuiz(o, { kind: "quiz", title: running.title, subject: running.subject })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Quiz e simulazioni</span>}
        title={<>Allenati nel formato dell’esame, <span className="italic text-gradient-azure">impara dagli errori</span>.</>}
        description={`Quesiti originali ATLAS a risposta multipla (5 opzioni) e a completamento, come nelle prove del semestre filtro, più domande aperte ed esercizi di calcolo. Ogni risposta ha una spiegazione. Nessun quesito è presentato come ministeriale.`}
      />

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Quesiti nella banca ATLAS" value={QUESTIONS.length} hint={SUBJECTS.map((s) => `${s.shortName} ${questionsFor({ subject: s.id }).length}`).join(" · ")} tone="azure" />
        <Stat label="Risposte date" value={totalAnswered} hint={totalAnswered ? `${fmt.percent(totalCorrect / totalAnswered)} corrette` : "Nessun quiz svolto"} />
        <Stat label="Simulazioni svolte" value={sims.length} hint={sims.length ? `Ultima: ${fmt.number(sims.at(-1)!.score)}/31` : "—"} />
        <Stat label="Errori da rivedere" value={recentErrors.length} hint="Dai tuoi quiz" />
      </div>

      {/* Simulation hero */}
      <Card className="relative mt-6 overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_220px_at_85%_0%,rgba(47,139,255,0.18),transparent)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Badge tone="azure"><ShieldCheck className="h-3 w-3" /> Regole del D.M. 941/2026</Badge>
            <h2 className="mt-3 font-display text-4xl text-fg">Simulazione d’esame</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-fg-muted">
              {EXAM_RULES.questionsPerExam} quesiti per materia ({EXAM_RULES.multipleChoice} a risposta multipla con {EXAM_RULES.optionsPerMultipleChoice} opzioni + {EXAM_RULES.completion} a completamento), {EXAM_RULES.minutesPerExam} minuti, punteggio +1 / 0 / −0,1, sufficienza {EXAM_RULES.passThreshold}/30. Puoi simulare una singola prova o la giornata completa con le tre prove e le pause.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="lg" href="/quiz/simulazione"><Timer className="h-4 w-4" /> Configura la simulazione</Button>
          </div>
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {SUBJECTS.map((s) => {
            const Icon = SUBJECT_ICON[s.id];
            const last = sims.filter((r) => r.subject === s.id).at(-1);
            return (
              <Link key={s.id} href={`/quiz/simulazione?materia=${s.id}`} className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:border-white/15">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", TONE[SUBJECT_TONE[s.id]].bg, TONE[SUBJECT_TONE[s.id]].text)}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-fg">{s.name}</span>
                  <span className="text-[12px] text-fg-subtle">{last ? `Ultima: ${fmt.number(last.score)}/31 · ${fmt.dateShort(last.date)}` : "Nessuna simulazione"}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        {/* Builder */}
        <Card className="p-6">
          <SectionTitle title="Quiz personalizzato" icon={<ListChecks className="h-4 w-4" />} />
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[12px] font-medium text-fg-muted">Materia</div>
              <Segmented
                value={subject}
                onChange={(v) => { setSubject(v); setTopics(new Set()); }}
                options={[{ value: "tutte" as SubjectChoice, label: "Tutte" }, ...SUBJECTS.map((s) => ({ value: s.id as SubjectChoice, label: s.shortName === "Bio" ? "Biologia" : s.id === "chimica" ? "Chimica" : "Fisica" }))]}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-fg-muted">
                <span>Argomenti {topics.size ? `(${topics.size} selezionati)` : "(tutti)"}</span>
                {topics.size > 0 && <button className="text-fg-subtle hover:text-fg" onClick={() => setTopics(new Set())}>Azzera</button>}
              </div>
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {topicOptions.map((r) => {
                  const on = topics.has(r.topic.id);
                  return (
                    <button
                      key={r.topic.id}
                      onClick={() => setTopics((s) => { const n = new Set(s); if (on) n.delete(r.topic.id); else n.add(r.topic.id); return n; })}
                      aria-pressed={on}
                      className={cn("rounded-full border px-2.5 py-1 text-[12px] transition", on ? "border-azure-400/50 bg-azure-500/15 text-azure-100" : "border-white/[0.08] text-fg-subtle hover:text-fg")}
                    >
                      {r.topic.title} <span className="font-mono opacity-60">{topicCounts.get(r.topic.id)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[12px] font-medium text-fg-muted">Tipi di domanda</div>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => {
                    const on = types.has(t);
                    return (
                      <button key={t} aria-pressed={on} onClick={() => setTypes((s) => { const n = new Set(s); if (on && n.size > 1) n.delete(t); else n.add(t); return n; })} className={cn("rounded-xl border px-3 py-1.5 text-[12.5px] transition", on ? "border-azure-400/50 bg-azure-500/15 text-azure-100" : "border-white/[0.08] text-fg-subtle hover:text-fg")}>
                        {QUESTION_TYPE_LABEL[t]}
                      </button>
                    );
                  })}
                  <button aria-pressed={onlyCalc} onClick={() => setOnlyCalc((v) => !v)} className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] transition", onlyCalc ? "border-gold-400/50 bg-gold-500/10 text-gold-100" : "border-white/[0.08] text-fg-subtle hover:text-fg")}>
                    <Calculator className="h-3.5 w-3.5" /> Solo esercizi di calcolo
                  </button>
                </div>
              </div>
              <div>
                <div className="mb-2 text-[12px] font-medium text-fg-muted">Correzione</div>
                <Segmented size="sm" value={variant} onChange={setVariant} options={[{ value: "practice", label: "Immediata" }, { value: "progressive", label: "Progressiva" }]} />
                <p className="mt-1.5 text-[11.5px] text-fg-subtle">{variant === "practice" ? "Feedback e spiegazione dopo ogni risposta." : "Dalle domande più facili alle più difficili, con feedback."}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-5">
              <span className="text-[12px] font-medium text-fg-muted">Numero di domande</span>
              <Segmented size="sm" value={String(count)} onChange={(v) => setCount(Number(v))} options={["5", "10", "20", "30"].map((v) => ({ value: v, label: v }))} />
              <span className="text-[12px] text-fg-subtle">{pluralize(pool.length, "disponibile", "disponibili")}</span>
              <Button variant="primary" className="ml-auto" disabled={!pool.length} onClick={start}>
                <Play className="h-4 w-4 fill-current" /> Inizia ({Math.min(count, pool.length)})
              </Button>
            </div>
          </div>
        </Card>

        {/* Errors & weak topics */}
        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle
              title="Errori da rivedere"
              icon={<AlertTriangle className="h-4 w-4" />}
              action={recentErrors.length > 0 && (
                <Button size="sm" variant="secondary" onClick={() => setRunning({ questions: recentErrors.slice(0, 20), title: "Ripasso degli errori", variant: "practice", seed: Date.now() })}>
                  <RotateCcw className="h-3.5 w-3.5" /> Ripeti ({Math.min(20, recentErrors.length)})
                </Button>
              )}
            />
            {recentErrors.length ? (
              <ul className="space-y-3">
                {recentErrors.slice(0, 4).map((q) => (
                  <li key={q.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-[13px]">
                    <div className="text-fg">{q.stem}</div>
                    <div className="mt-1 text-emerald-300">✓ {correctAnswerText(q)}</div>
                    <div className="mt-1 line-clamp-2 text-fg-subtle">{q.explanation}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-fg-subtle">Gli errori dei tuoi quiz compariranno qui, con la risposta corretta e la spiegazione.</p>
            )}
          </Card>
          <Card className="p-6">
            <SectionTitle title="Statistiche per argomento" icon={<ClipboardList className="h-4 w-4" />} />
            <p className="-mt-2 mb-3 text-[12px] text-fg-subtle">Media degli ultimi 3 quiz per argomento, dal più debole.</p>
            {topicStats.length ? (
              <ul className="space-y-2.5">
                {topicStats.slice(0, 8).map((t) => (
                  <li key={t.ref.topic.id}>
                    <Link href={`/materie/${t.ref.subject.id}/${t.ref.topic.id}#quiz`} className="group block">
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="truncate text-fg-muted group-hover:text-fg">{t.ref.topic.title}</span>
                        <span className="shrink-0 font-mono text-[12px] text-fg-subtle">{fmt.percent(t.acc)} · {pluralize(t.n, "quiz", "quiz")}</span>
                      </div>
                      <ProgressBar value={t.acc} tone={t.acc >= 0.8 ? "success" : t.acc >= 0.6 ? "warning" : "danger"} className="mt-1" label={`Accuratezza ${t.ref.topic.title}`} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-fg-subtle">Completa un quiz per vedere qui gli argomenti, dal più debole al più solido.</p>
            )}
          </Card>
        </div>
      </div>

      {/* History */}
      <section className="mt-10">
        <SectionTitle title="Storico" icon={<History className="h-4 w-4" />} />
        {saved.length ? (
          <Card className="divide-y divide-white/[0.05]">
            {[...saved].reverse().slice(0, 12).map((r) => {
              const exam = r.kind === "simulazione" ? scoreExam(r.correct, r.wrong) : null;
              return (
                <div key={r.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] text-fg">{r.title}</div>
                    <div className="text-[12px] text-fg-subtle">{fmt.date(r.date)} · {fmt.time(r.date)} · {fmt.clock(r.durationSec)} min</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={r.kind === "simulazione" ? "azure" : r.kind === "sessione" ? "deep" : "muted"}>{r.kind === "simulazione" ? "Simulazione" : r.kind === "sessione" ? "Sessione" : "Quiz"}</Badge>
                    {exam ? (
                      <span className={cn("font-mono text-[13px]", exam.passed ? "text-emerald-300" : "text-red-300")}>{fmt.number(exam.raw)}/31</span>
                    ) : (
                      <span className="font-mono text-[13px] text-fg-muted">{r.correct}/{r.total}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        ) : (
          <EmptyState icon={<History className="h-6 w-6" />} title="Nessun risultato salvato" description="I quiz e le simulazioni che completi vengono salvati qui con il dettaglio delle risposte." />
        )}
      </section>

      <Notice tone="info" className="mt-8">
        La banca ATLAS contiene {QUESTIONS.length} quesiti originali: ripetendo molte simulazioni rivedrai le stesse domande. Per allenarti su materiale nuovo usa anche la generazione di quiz dai tuoi documenti in Biblioteca (con AI configurata).
      </Notice>
    </div>
  );
}
