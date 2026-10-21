"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CircleSlash, Coffee, ExternalLink, Flag, Info, Play, ShieldCheck, X } from "lucide-react";
import type { Question, SubjectId } from "@/lib/types";
import { questionsFor } from "@/data/questions";
import { getSubject, SUBJECTS } from "@/data/syllabus";
import { EXAM_DATES, EXAM_RULES, scoreExam } from "@/data/exam";
import { QuizRunner, type QuizOutcome, type QuizRunnerSnapshot } from "@/components/exercises/quiz-runner";
import { Badge, Button, Modal, Notice, PageHeader, Segmented } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { useFocusMode, useLeaveGuard } from "@/lib/hooks";
import { useRecordQuiz } from "@/lib/record";
import { capFirst, cn, fmt, shuffle } from "@/lib/utils";
import { session, STORAGE_KEYS, type StoredExam } from "./format";

/** Order of the three tests on exam day, as listed in the official calendar. */
const DAY_ORDER: SubjectId[] = ["chimica", "fisica", "biologia"];
const EXAM_SEC = EXAM_RULES.minutesPerExam * 60;

function bankFor(subject: SubjectId) {
  return { mcq: questionsFor({ subject, types: ["mcq"] }), cloze: questionsFor({ subject, types: ["cloze"] }) };
}

function buildExam(subject: SubjectId, seed: number): Question[] {
  const b = bankFor(subject);
  return [...shuffle(b.mcq, seed).slice(0, EXAM_RULES.multipleChoice), ...shuffle(b.cloze, seed + 1).slice(0, EXAM_RULES.completion)];
}

type Format = "singola" | "completa";
type Phase = { kind: "setup" } | { kind: "exam"; i: number } | { kind: "break"; i: number; until: number } | { kind: "done" };
type Outcome = { subject: SubjectId; o: QuizOutcome };

const subjectName = (s: SubjectId) => getSubject(s)?.name ?? s;
const SHORT: Record<SubjectId, string> = { biologia: "Biologia", chimica: "Chimica", fisica: "Fisica" };

function BreakScreen({ until, next, onDone, onExit }: { until: number; next: SubjectId; onDone: () => void; onExit: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    headingRef.current?.focus({ preventScroll: true });
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.round((until - now) / 1000));
  useEffect(() => {
    if (left === 0) onDone();
  }, [left, onDone]);
  return (
    <div className="mx-auto max-w-xl pb-10">
      <div className="flex h-14 items-center">
        <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11" onClick={onExit} aria-label="Esci dalla simulazione">
          <X className="h-5 w-5" aria-hidden />
        </Button>
      </div>
      <section className="card mt-4 rounded-panel p-6 text-center sm:p-10" aria-labelledby="pausa">
        <Coffee className="mx-auto h-8 w-8 text-fg-muted" aria-hidden />
        <h1 id="pausa" ref={headingRef} tabIndex={-1} className="mt-4 font-display text-4xl text-fg outline-none">
          Pausa
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
          Come all’esame, tra una prova e l’altra ci sono {EXAM_RULES.breakMinutes} minuti. Prossima prova: <span className="font-medium text-fg">{subjectName(next)}</span>.
        </p>
        <div role="timer" aria-label={`Tempo di pausa rimasto ${fmt.clock(left)}`} className="mt-6 text-5xl font-semibold tracking-[-0.02em] tabular-nums text-fg">
          {fmt.clock(left)}
        </div>
        <Button variant="primary" size="lg" className="mt-8 w-full sm:w-auto" onClick={onDone}>
          <Play className="h-4 w-4 fill-current" aria-hidden /> Salta la pausa e inizia {subjectName(next)}
        </Button>
      </section>
    </div>
  );
}

export function Simulation() {
  const params = useSearchParams();
  const pre = params.get("materia");
  const recordQuiz = useRecordQuiz();
  const [format, setFormat] = useState<Format>("singola");
  const [subject, setSubject] = useState<SubjectId>(pre === "chimica" || pre === "fisica" || pre === "biologia" ? pre : "biologia");
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [seed, setSeed] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stored, setStored] = useState<StoredExam | null>(null);
  const [resumeSnapshot, setResumeSnapshot] = useState<{ i: number; s: QuizRunnerSnapshot } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const snapshotRef = useRef<QuizRunnerSnapshot | undefined>(undefined);
  const recorded = useRef(new Set<string>());

  const order = useMemo(() => (format === "completa" ? DAY_ORDER : [subject]), [format, subject]);
  const exams = useMemo(() => (seed ? order.map((s, k) => buildExam(s, seed + k * 101)) : []), [seed, order]);
  const bankOk = order.every((s) => {
    const b = bankFor(s);
    return b.mcq.length >= EXAM_RULES.multipleChoice && b.cloze.length >= EXAM_RULES.completion;
  });

  const i = phase.kind === "exam" || phase.kind === "break" ? phase.i : -1;
  const finished = phase.kind === "exam" && outcomes.length > phase.i;
  const isLast = i === order.length - 1;
  const running = (phase.kind === "exam" && !finished) || phase.kind === "break";

  // During the exam nothing else is on screen, and leaving the page asks first.
  useFocusMode(running || (phase.kind === "exam" && finished && !isLast));
  useLeaveGuard(running);

  // A simulation left open in this tab (reload, back button) is offered for resume.
  useEffect(() => {
    setStored(session.read<StoredExam>(STORAGE_KEYS.exam));
  }, []);

  const persist = useCallback(
    (snapshot?: QuizRunnerSnapshot) => {
      if (phase.kind !== "exam" && phase.kind !== "break") return;
      if (phase.kind === "exam" && outcomes.length > phase.i && phase.i === order.length - 1) return;
      const p = phase.kind === "exam" ? { kind: "exam" as const, i: phase.i } : { kind: "break" as const, i: phase.i, until: phase.until };
      session.write(STORAGE_KEYS.exam, { format, subject, seed, phase: p, outcomes, snapshot: phase.kind === "exam" && outcomes.length <= phase.i ? snapshot : undefined, savedAt: Date.now() } satisfies StoredExam);
    },
    [phase, format, subject, seed, outcomes, order.length],
  );

  useEffect(() => {
    if (running || (phase.kind === "exam" && finished && !isLast)) persist(snapshotRef.current);
    else if (phase.kind === "done" || (phase.kind === "exam" && finished && isLast)) session.remove(STORAGE_KEYS.exam);
  }, [phase, outcomes, running, finished, isLast, persist]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase.kind, i]);

  const start = () => {
    session.remove(STORAGE_KEYS.exam);
    setStored(null);
    setResumeSnapshot(null);
    snapshotRef.current = undefined;
    recorded.current.clear();
    setOutcomes([]);
    setSeed(Date.now());
    setPhase({ kind: "exam", i: 0 });
  };

  const resume = () => {
    if (!stored) return;
    setFormat(stored.format);
    setSubject(stored.subject);
    setSeed(stored.seed);
    setOutcomes(stored.outcomes);
    stored.outcomes.forEach((_, k) => recorded.current.add(`${stored.seed}-${k}`));
    snapshotRef.current = stored.snapshot;
    setResumeSnapshot(stored.snapshot ? { i: stored.phase.i, s: stored.snapshot } : null);
    setPhase(stored.phase.kind === "exam" ? { kind: "exam", i: stored.phase.i } : { kind: "break", i: stored.phase.i, until: stored.phase.until });
    setStored(null);
  };

  const abandon = () => {
    session.remove(STORAGE_KEYS.exam);
    setStored(null);
    setExitOpen(false);
    setResumeSnapshot(null);
    snapshotRef.current = undefined;
    setPhase({ kind: "setup" });
  };

  const onFinish = (k: number, subj: SubjectId) => (o: QuizOutcome) => {
    const key = `${seed}-${k}`;
    if (recorded.current.has(key)) return; // never record the same test twice
    recorded.current.add(key);
    snapshotRef.current = undefined;
    recordQuiz(o, { kind: "simulazione", title: `Simulazione: ${subjectName(subj)}`, subject: subj });
    setOutcomes((prev) => (prev.length > k ? prev : [...prev, { subject: subj, o }]));
  };

  const exitModal = (
    <Modal
      open={exitOpen}
      onClose={() => setExitOpen(false)}
      size="sm"
      title="Uscire dalla simulazione?"
      description={
        outcomes.length
          ? "Le prove già consegnate restano nei tuoi risultati. Quella in corso e le successive non verranno svolte."
          : "La prova non verrà consegnata e non comparirà nei tuoi risultati."
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={abandon}>
            Esci senza consegnare
          </Button>
          <Button variant="primary" onClick={() => setExitOpen(false)} data-autofocus>
            Continua la prova
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-fg-muted">Se vuoi il punteggio, consegna la prova: le domande lasciate in bianco valgono 0 punti.</p>
    </Modal>
  );

  // ── Setup ──────────────────────────────────────────────────
  if (phase.kind === "setup") {
    const nextDate = EXAM_DATES.find((d) => new Date(d.date).getTime() > Date.now());
    const storedSubject = stored ? (stored.format === "completa" ? DAY_ORDER[stored.phase.i] : stored.subject) : null;
    const storedLeft =
      stored && stored.phase.kind === "exam" && stored.snapshot ? Math.max(0, EXAM_SEC - Math.floor((Date.now() - stored.snapshot.startedAt) / 1000)) : null;
    return (
      <div className="pb-16">
        <PageHeader
          eyebrow={
            <Link href="/quiz" className="-ml-1 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-1 text-fg-muted hover:text-fg">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Quiz e simulazioni
            </Link>
          }
          title="Simulazione d’esame"
          description="Struttura, tempi e punteggio seguono il D.M. 941/2026. I quesiti sono originali ATLAS: non sono ministeriali e non ne riproducono il livello di difficoltà, che non è pubblicato."
        />

        {stored && storedSubject && (
          <Notice
            tone="info"
            className="mt-6"
            title={`Hai una simulazione in corso: ${subjectName(storedSubject)}`}
            action={
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" className="h-10 sm:h-8" onClick={abandon}>
                  Abbandona
                </Button>
                <Button size="sm" variant="primary" className="h-10 sm:h-8" onClick={resume}>
                  Riprendi
                </Button>
              </div>
            }
          >
            {stored.phase.kind === "break"
              ? "Sei nella pausa tra una prova e l’altra."
              : storedLeft === 0
                ? "Il tempo è scaduto: riprendendola, la prova viene consegnata con le risposte date."
                : storedLeft !== null
                  ? `Restano ${Math.ceil(storedLeft / 60)} minuti: il tempo della prova continua a scorrere.`
                  : "Il tempo della prova continua a scorrere."}
          </Notice>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="card p-5 sm:p-7" aria-labelledby="configura">
            <h2 id="configura" className="sr-only">
              Configura la simulazione
            </h2>
            <div className="text-ui font-medium text-fg-muted" aria-hidden>
              Formato
            </div>
            <Segmented
              className="mt-2"
              ariaLabel="Formato"
              value={format}
              onChange={setFormat}
              options={[
                { value: "singola", label: `Una prova, ${EXAM_RULES.minutesPerExam} min` },
                { value: "completa", label: "Giornata completa" },
              ]}
            />

            {format === "singola" ? (
              <fieldset className="mt-6">
                <legend className="mb-2 text-ui font-medium text-fg-muted">Materia</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SUBJECTS.map((s) => {
                    const on = s.id === subject;
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          "flex min-h-14 cursor-pointer items-center gap-3 rounded-control border px-4 py-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-azure-400",
                          on ? "border-azure-400/55 bg-azure-500/[0.1]" : "border-white/[0.09] hover:border-white/[0.18]",
                        )}
                      >
                        <input type="radio" name="materia" value={s.id} checked={on} onChange={() => setSubject(s.id)} className="sr-only" />
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TONE[SUBJECT_TONE[s.id]].dot)} aria-hidden />
                        <span className="min-w-0 flex-1 text-sm font-medium text-fg">{s.name}</span>
                        {on && <Check className="h-4 w-4 shrink-0 text-azure-300" aria-hidden />}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <div className="mt-6">
                <div className="mb-2 text-ui font-medium text-fg-muted">Programma della giornata</div>
                <ol className="space-y-0">
                  {DAY_ORDER.map((s, k) => (
                    <li key={s}>
                      <div className="flex items-center gap-3 py-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/[0.12] text-xs font-semibold text-fg-muted">{k + 1}</span>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[SUBJECT_TONE[s]].dot)} aria-hidden />
                        <span className="min-w-0 flex-1 text-sm text-fg">{subjectName(s)}</span>
                        <span className="shrink-0 text-xs text-fg-muted">{EXAM_RULES.minutesPerExam} min</span>
                      </div>
                      {k < DAY_ORDER.length - 1 && (
                        <div className="ml-3.5 flex items-center gap-2 border-l border-dashed border-white/[0.12] py-1.5 pl-6 text-xs text-fg-subtle">
                          <Coffee className="h-3.5 w-3.5" aria-hidden /> Pausa di {EXAM_RULES.breakMinutes} minuti
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!bankOk && (
              <Notice tone="warning" className="mt-5">
                La banca ATLAS non contiene ancora abbastanza quesiti per questa simulazione.
              </Notice>
            )}
            <div className="mt-7 border-t border-white/[0.07] pt-6">
              <Button variant="primary" size="lg" className="w-full sm:w-auto" disabled={!bankOk} onClick={start}>
                <Play className="h-4 w-4 fill-current" aria-hidden /> {format === "completa" ? "Inizia la giornata" : `Inizia la prova di ${SHORT[subject]}`}
              </Button>
              <p className="mt-3 max-w-prose text-xs leading-relaxed text-fg-muted">
                Il timer parte subito e allo scadere la prova viene consegnata da sola. Durante la prova la navigazione è nascosta: per uscire usa la X in alto.
              </p>
            </div>
          </section>

          <aside className="card p-5 sm:p-6" aria-labelledby="regole">
            <h2 id="regole" className="flex items-center gap-2 text-sm font-semibold text-fg">
              <ShieldCheck className="h-4 w-4 text-azure-300" aria-hidden /> Regole ufficiali
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
              <li>
                {EXAM_RULES.questionsPerExam} quesiti per prova: {EXAM_RULES.multipleChoice} a risposta multipla ({EXAM_RULES.optionsPerMultipleChoice} opzioni, una corretta) e {EXAM_RULES.completion} a completamento.
              </li>
              <li>Completamento: {EXAM_RULES.completionRule}</li>
              <li>
                {EXAM_RULES.minutesPerExam} minuti per prova, {EXAM_RULES.breakMinutes} minuti di pausa tra le prove.
              </li>
              <li>
                Punteggio: +{EXAM_RULES.scoring.correct} per la risposta esatta, {EXAM_RULES.scoring.blank} se omessa, {String(EXAM_RULES.scoring.wrong).replace(".", ",")} se errata. Massimo {EXAM_RULES.maxPerExam} (30 e lode).
              </li>
              <li>Prova superata con almeno {EXAM_RULES.passThreshold}/30.</li>
            </ul>
            {nextDate && (
              <p className="inset-panel mt-4 p-3 text-ui text-fg-muted">
                Prossimo appello: <span className="text-fg">{capFirst(fmt.full(nextDate.date))}</span>, ore 11:00
              </p>
            )}
            <ul className="mt-4 space-y-1.5">
              {EXAM_RULES.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-xs leading-relaxed text-azure-300 underline-offset-4 hover:underline">
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {s.label}
                    <span className="sr-only">(si apre in una nuova scheda)</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    );
  }

  // ── Break ──────────────────────────────────────────────────
  if (phase.kind === "break") {
    return (
      <>
        <BreakScreen until={phase.until} next={order[phase.i + 1]} onDone={() => setPhase({ kind: "exam", i: phase.i + 1 })} onExit={() => setExitOpen(true)} />
        {exitModal}
      </>
    );
  }

  // ── Full day result ────────────────────────────────────────
  if (phase.kind === "done") {
    const scores = outcomes.map((x) => ({ ...x, s: scoreExam(x.o.correct, x.o.wrong) }));
    const total = scores.reduce((a, x) => a + x.s.raw, 0);
    const passed = scores.filter((x) => x.s.passed).length;
    return (
      <div className="mx-auto max-w-3xl pb-16">
        <section className="card rounded-panel p-6 sm:p-9" aria-labelledby="giornata">
          <p className="text-sm text-fg-muted">Giornata di simulazione</p>
          <h1 id="giornata" className="mt-1 font-display text-4xl leading-tight text-fg">
            {passed === scores.length ? "Tutte e tre le prove superate" : passed ? `${passed} prove superate su ${scores.length}` : "Nessuna prova superata"}
          </h1>
          <p className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-5xl leading-none text-fg">{fmt.number(total)}</span>
            <span className="text-base text-fg-muted">punti su {EXAM_RULES.maxTotal}</span>
          </p>
          <ul className="mt-6 divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {scores.map((x) => (
              <li key={x.subject} className="flex items-center gap-3 py-3">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[SUBJECT_TONE[x.subject]].dot)} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{subjectName(x.subject)}</span>
                <span className="text-sm tabular-nums text-fg">
                  {fmt.number(x.s.raw)}/{EXAM_RULES.maxPerExam}
                </span>
                <Badge tone={x.s.passed ? "success" : "danger"} icon={x.s.passed ? <Check className="h-3 w-3" aria-hidden /> : <CircleSlash className="h-3 w-3" aria-hidden />}>
                  {x.s.passed ? (x.s.lode ? "30 e lode" : `Superata, ${x.s.careerGrade}/30`) : "Non superata"}
                </Badge>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button variant="primary" onClick={() => setPhase({ kind: "setup" })} className="w-full sm:w-auto">
              Nuova simulazione
            </Button>
            <Button variant="secondary" href="/quiz#errori" className="w-full sm:w-auto">
              Rivedi gli errori
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // ── Exam ───────────────────────────────────────────────────
  const subj = order[i];
  const title = `Simulazione: ${subjectName(subj)}`;
  const nextSubject = !isLast ? order[i + 1] : null;

  const header = (
    <>
      <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11 shrink-0" onClick={() => setExitOpen(true)} aria-label="Esci dalla simulazione">
        <X className="h-5 w-5" aria-hidden />
      </Button>
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold leading-tight text-fg">{title}</h1>
        {order.length > 1 && (
          <p className="text-xs text-fg-muted">
            Prova {i + 1} di {order.length}
          </p>
        )}
      </div>
    </>
  );

  const handedIn = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {isLast ? (
          <Button variant="ghost" size="sm" href="/quiz" className="-ml-2">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Quiz e simulazioni
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11" onClick={() => setExitOpen(true)} aria-label="Esci dalla simulazione">
            <X className="h-5 w-5" aria-hidden />
          </Button>
        )}
      </div>
      <h1 className="sr-only">{title}: prova consegnata</h1>
      <div className="flex flex-col gap-3 rounded-card border border-white/[0.09] bg-ink-850 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" role="status">
        <p className="flex items-start gap-3 text-sm text-fg-muted">
          <Flag className="mt-0.5 h-4 w-4 shrink-0 text-azure-300" aria-hidden />
          <span>
            <span className="font-semibold text-fg">Prova di {subjectName(subj)} consegnata.</span>{" "}
            {nextSubject ? `Prossima: ${subjectName(nextSubject)}, dopo ${EXAM_RULES.breakMinutes} minuti di pausa.` : order.length > 1 ? "Era l’ultima prova della giornata." : "Il risultato è salvato nei tuoi quiz."}
          </span>
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {nextSubject ? (
            <Button variant="primary" onClick={() => setPhase({ kind: "break", i, until: Date.now() + EXAM_RULES.breakMinutes * 60_000 })}>
              <Coffee className="h-4 w-4" aria-hidden /> Inizia la pausa
            </Button>
          ) : order.length > 1 ? (
            <Button variant="primary" onClick={() => setPhase({ kind: "done" })}>
              Vedi il risultato della giornata
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setPhase({ kind: "setup" })}>
              <Play className="h-4 w-4 fill-current" aria-hidden /> Nuova simulazione
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl pb-6">
      <QuizRunner
        key={`${seed}-${i}`}
        questions={exams[i]}
        variant="exam"
        timeLimitSec={EXAM_SEC}
        seed={seed + i}
        title={title}
        sticky
        headerStart={header}
        finishedHeader={handedIn}
        initialState={resumeSnapshot && resumeSnapshot.i === i ? resumeSnapshot.s : undefined}
        onSnapshot={(s) => {
          snapshotRef.current = s;
          persist(s);
        }}
        onFinish={onFinish(i, subj)}
      />
      {!finished && (
        <p className="mt-6 flex gap-2 text-xs leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Il tempo scorre anche se ricarichi la pagina: la prova resta salvata in questa scheda e la puoi riprendere.
          </span>
        </p>
      )}
      {exitModal}
    </div>
  );
}
