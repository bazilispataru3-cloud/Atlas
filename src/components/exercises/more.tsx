"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { ArrowRight, Check, Mic, MicOff, RotateCcw, Sparkles, Timer, X } from "lucide-react";
import { Button, Notice, ProgressBar, Segmented, Select, Spinner, Textarea } from "@/components/ui/primitives";
import { LineChart, Legend } from "@/components/ui/charts";
import { MitochondrionDiagram, MITO_PARTS } from "@/components/diagrams/diagrams";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { useSpeechInput } from "@/lib/speech";
import { useAtlas } from "@/lib/store";
import { getLesson } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import { has, normText } from "@/lib/feynman";
import { cn, fmt, shuffle } from "@/lib/utils";

/** Big result number in sans (never the display serif), with its sentence underneath. */
function Score({ value, children, headingRef }: { value: string; children: ReactNode; headingRef?: Ref<HTMLHeadingElement> }) {
  return (
    <div>
      <h3 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-[-0.02em] text-fg tabular-nums focus-visible:outline-offset-4">
        {value}
      </h3>
      <p className="mt-1 max-w-[60ch] text-base text-fg-muted">{children}</p>
    </div>
  );
}

// ── Oral exam simulation ──────────────────────────────────────

interface OralItem {
  question: string;
  modelAnswer: string;
  keyPoints: string[];
}

export function oralItemsFor(topicId: string): OralItem[] {
  const lesson = getLesson(topicId);
  if (!lesson) return [];
  return [
    ...lesson.activeRecall.map((a) => ({ question: a.prompt, modelAnswer: a.answer, keyPoints: a.answer.split(/[;:,.]\s+/).filter((s) => s.length > 6).slice(0, 4) })),
    ...lesson.elaborative.map((e) => ({ question: e.question, modelAnswer: e.answer, keyPoints: e.answer.split(/[;:.]\s+/).filter((s) => s.length > 8).slice(0, 3) })),
  ];
}

export function OralExam({ topicId, count = 4, secondsPerQuestion = 90, onComplete }: { topicId: string; count?: number; secondsPerQuestion?: number; onComplete?: (score01: number) => void }) {
  const integrations = useIntegrations();
  const record = useAtlas((s) => s.recordRecallScore);
  const items = useMemo(() => shuffle(oralItemsFor(topicId), topicId.length * 31).slice(0, count), [topicId, count]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [left, setLeft] = useState(secondsPerQuestion);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"answer" | "review" | "done">("answer");
  const [scores, setScores] = useState<number[]>([]);
  const [checks, setChecks] = useState<boolean[]>([]);
  const [ai, setAi] = useState<{ score: number; feedback: string; missing: string[]; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const speech = useSpeechInput((t) => setAnswer((a) => a + t));
  const ids = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const stopSpeech = speech.stop;
  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      setRunning(false);
      stopSpeech();
      setChecks((c) => (c.length ? c : items[i]?.keyPoints.map(() => false) ?? []));
      setPhase("review");
      requestAnimationFrame(() => reviewRef.current?.focus());
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left, stopSpeech, items, i]);

  if (!items.length) return <Notice tone="info">Le domande orali sono disponibili per gli argomenti con lezione completa.</Notice>;
  const item = items[i];

  const start = () => {
    setRunning(true);
    requestAnimationFrame(() => fieldRef.current?.focus());
  };

  const submit = async () => {
    setRunning(false);
    speech.stop();
    setPhase("review");
    setChecks(item.keyPoints.map(() => false));
    setAi(null);
    requestAnimationFrame(() => reviewRef.current?.focus());
    if (integrations?.ai && answer.trim()) {
      setLoading(true);
      const r = await postJSON<{ data: { score: number; feedback: string; missing: string[]; errors: string[] } }>("/api/ai/evaluate", { kind: "open", question: item.question, modelAnswer: item.modelAnswer, keyPoints: item.keyPoints, answer });
      setLoading(false);
      if (r.ok) setAi(r.data.data);
    }
  };

  const next = (score: number) => {
    const s = [...scores, score];
    setScores(s);
    if (i < items.length - 1) {
      setI(i + 1);
      setAnswer("");
      setLeft(secondsPerQuestion);
      setChecks([]);
      setPhase("answer");
      setAi(null);
      requestAnimationFrame(() => questionRef.current?.focus());
    } else {
      const avg = s.reduce((a, b) => a + b, 0) / s.length;
      record(topicId, avg);
      onComplete?.(avg);
      setPhase("done");
      requestAnimationFrame(() => doneRef.current?.focus());
    }
  };

  if (phase === "done") {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (
      <div className="space-y-4">
        <Score value={`${Math.round(avg * 100)}%`} headingRef={doneRef}>
          Interrogazione conclusa. Le risposte incomplete restano come lacune: le ritrovi nell’analisi e nel piano di ripasso.
        </Score>
        <Button
          variant="secondary"
          onClick={() => {
            setI(0);
            setScores([]);
            setAnswer("");
            setLeft(secondsPerQuestion);
            setChecks([]);
            setPhase("answer");
            requestAnimationFrame(() => questionRef.current?.focus());
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Nuova interrogazione
        </Button>
      </div>
    );
  }

  const low = left <= 15;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-fg-muted">
          Domanda {i + 1} di {items.length}
        </span>
        <span className="text-sm text-fg-subtle">{getTopicRef(topicId)?.topic.title}</span>
        <span className={cn("ml-auto flex items-center gap-1.5 text-base font-semibold tabular-nums", low ? "text-red-300" : "text-fg")} aria-label={`Tempo rimasto ${fmt.clock(left)}`}>
          <Timer className="h-4 w-4" aria-hidden /> {fmt.clock(left)}
        </span>
      </div>
      <ProgressBar value={left / secondsPerQuestion} tone={low ? "danger" : "azure"} label="Tempo rimasto" />
      <h3 ref={questionRef} tabIndex={-1} className="max-w-[60ch] text-xl font-semibold leading-snug text-fg text-balance focus-visible:outline-offset-4">
        {item.question}
      </h3>
      {phase === "answer" && (
        <>
          <Textarea
            ref={fieldRef}
            id={`${ids}-answer`}
            rows={5}
            value={answer + (speech.interim ? ` ${speech.interim}` : "")}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={running ? "Rispondi come se parlassi alla commissione…" : "Premi «Inizia» per far partire il tempo."}
            readOnly={!running}
            aria-label="Risposta orale"
          />
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <Button variant="primary" onClick={start}>
                Inizia ({secondsPerQuestion} secondi)
              </Button>
            ) : (
              <>
                <Button variant="primary" onClick={submit}>
                  Ho finito
                </Button>
                {speech.supported && (
                  <Button variant={speech.listening ? "danger" : "secondary"} onClick={speech.listening ? speech.stop : speech.start} aria-pressed={speech.listening}>
                    {speech.listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />} {speech.listening ? "Interrompi" : "Rispondi a voce"}
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}
      {phase === "review" && (
        <div className="animate-fade-in space-y-4">
          <h4 ref={reviewRef} tabIndex={-1} className="text-sm font-semibold text-fg focus-visible:outline-offset-4">
            {left <= 0 ? "Tempo scaduto: confronta la tua risposta" : "Confronta la tua risposta"}
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="inset-panel p-4">
              <p className="text-sm font-medium text-fg-muted">La tua risposta</p>
              <p className="mt-1.5 whitespace-pre-line text-base leading-relaxed text-fg-reading">{answer || <span className="text-fg-muted">Nessuna risposta scritta.</span>}</p>
            </div>
            <div className="inset-panel p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-green-300">
                <Check className="h-4 w-4" aria-hidden /> Risposta attesa
              </p>
              <p className="mt-1.5 text-base leading-relaxed text-fg-reading">{item.modelAnswer}</p>
            </div>
          </div>
          {loading && <Spinner label="Valutazione AI in corso" className="text-sm" />}
          {ai ? (
            <div className="rounded-card border border-azure-400/25 bg-azure-500/[0.06] p-4" role="status">
              <p className="flex items-center gap-1.5 font-medium text-fg">
                <Sparkles className="h-4 w-4 text-azure-300" aria-hidden /> Valutazione AI: {Math.round(ai.score * 100)}%
              </p>
              <p className="mt-1 text-base text-fg-muted">{ai.feedback}</p>
              <Button className="mt-3" variant="primary" onClick={() => next(ai.score)}>
                Domanda successiva
              </Button>
            </div>
          ) : (
            !loading && (
              <fieldset>
                <legend className="text-sm text-fg-muted">Autovaluta con la griglia: quali elementi hai detto?</legend>
                <ul className="mt-2 space-y-1">
                  {item.keyPoints.map((k, idx) => (
                    <li key={idx}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control px-2 py-2 text-base text-fg-reading hover:bg-white/[0.03]">
                        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#3d8bff]" checked={checks[idx] ?? false} onChange={() => setChecks(checks.map((c, j) => (j === idx ? !c : c)))} />
                        {k}
                      </label>
                    </li>
                  ))}
                </ul>
                <Button className="mt-3" variant="primary" onClick={() => next(checks.filter(Boolean).length / Math.max(1, item.keyPoints.length))}>
                  Registra e continua
                </Button>
              </fieldset>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Dual coding: label the mitochondrion ──────────────────────

/** Numbered markers outside the organelle, joined to their structure by a leader line. */
const MARKERS: Record<string, { mx: number; my: number }> = {
  esterna: { mx: 150, my: 22 },
  intermembrana: { mx: 270, my: 22 },
  atpsintasi: { mx: 400, my: 22 },
  interna: { mx: 530, my: 22 },
  creste: { mx: 190, my: 282 },
  matrice: { mx: 330, my: 282 },
  mtdna: { mx: 480, my: 282 },
  ribosomi: { mx: 630, my: 282 },
};

const PROTON_MODEL =
  "I complessi della catena respiratoria, nella membrana interna, usano l’energia degli elettroni ceduti da NADH e FADH₂ per pompare protoni dalla matrice allo spazio intermembrana. I protoni rientrano nella matrice attraverso l’ATP sintasi: il flusso fa ruotare l’enzima, che sintetizza ATP da ADP e fosfato.";

export function LabelDiagramExercise({ onComplete }: { onComplete?: (score01: number) => void }) {
  const parts = MITO_PARTS;
  const [seed, setSeed] = useState(29);
  const order = useMemo(() => shuffle(parts.map((p) => p.id), seed + 13), [parts, seed]);
  const positions = useMemo(() => shuffle(parts.map((p) => p.id), seed), [parts, seed]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [words, setWords] = useState("");
  const [showModel, setShowModel] = useState(false);
  const ids = useId();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const correct = Object.entries(answers).filter(([spot, label]) => spot === label).length;
  const labelOf = (id?: string) => parts.find((p) => p.id === id)?.label ?? "";
  const numberOf = (spot: string) => (positions as string[]).indexOf(spot) + 1;

  const assign = (spot: string, label: string | null) => {
    if (checked) return;
    const rest = Object.fromEntries(Object.entries(answers).filter(([s, v]) => v !== label && s !== spot));
    setAnswers(label ? { ...rest, [spot]: label } : rest);
  };

  const onSpot = (spot: string) => {
    if (checked || !selected) return;
    assign(spot, selected);
    setSelected(null);
  };

  const verify = () => {
    setChecked(true);
    onComplete?.(correct / parts.length);
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const retry = () => {
    setSeed(Math.floor(Math.random() * 100000));
    setAnswers({});
    setSelected(null);
    setChecked(false);
    setShowModel(false);
  };

  const status = checked
    ? `${correct} etichette corrette su ${parts.length}.`
    : selected
      ? `Ora tocca il punto del diagramma per «${labelOf(selected)}», oppure sceglilo nell’elenco sotto.`
      : "Scegli un’etichetta, poi tocca il punto del diagramma a cui corrisponde.";

  return (
    <div className="space-y-5">
      <p className="max-w-[65ch] text-base leading-relaxed text-fg-muted">Dai un nome a ogni punto numerato: scegli un’etichetta e tocca il punto, oppure usa l’elenco sotto il disegno. Poi descrivi a parole il percorso di un protone.</p>

      <div role="group" aria-label="Etichette" className="flex flex-wrap gap-2">
        {order.map((id) => {
          const used = Object.values(answers).includes(id);
          const isSel = selected === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isSel}
              disabled={checked}
              onClick={() => setSelected(isSel ? null : id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-sm transition-colors duration-150 sm:min-h-9",
                isSel ? "border-azure-400 bg-azure-500/[0.16] text-fg" : used ? "border-white/[0.06] text-fg-subtle" : "border-white/[0.12] text-fg-muted hover:border-white/25 hover:text-fg",
              )}
            >
              {used && <Check className="h-3.5 w-3.5" aria-hidden />}
              {labelOf(id)}
              {used && <span className="sr-only">(già assegnata)</span>}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-fg-muted" role="status">
        {status}
      </p>

      <div className="rounded-card border border-white/[0.07] bg-ink-950/40 px-3 py-6 sm:px-5">
        <div className="relative">
          <MitochondrionDiagram showLabels={false} />
          <svg viewBox="0 0 760 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {parts.map((p) => {
              const m = MARKERS[p.id];
              return (
                <g key={p.id}>
                  <line x1={m.mx} y1={m.my} x2={p.x} y2={p.y} stroke="#eceef3" strokeOpacity="0.55" strokeWidth="2" />
                  <circle cx={p.x} cy={p.y} r="5" fill="#eceef3" />
                </g>
              );
            })}
          </svg>
          {positions.map((spot) => {
            const m = MARKERS[spot];
            const assigned = answers[spot];
            const ok = checked && assigned === spot;
            const n = numberOf(spot);
            return (
              <button
                key={spot}
                type="button"
                onClick={() => onSpot(spot)}
                aria-label={`Punto ${n}: ${assigned ? labelOf(assigned) : "vuoto"}${checked ? (ok ? ", corretto" : `, sbagliato, corretto: ${labelOf(spot)}`) : ""}`}
                className={cn("absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full sm:h-10 sm:w-10", selected && !checked && "cursor-copy")}
                style={{ left: `${(m.mx / 760) * 100}%`, top: `${(m.my / 300) * 100}%` }}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border-2 text-xs font-semibold tabular-nums transition-colors duration-150 sm:h-8 sm:w-8 sm:text-sm",
                    checked ? (ok ? "border-success bg-success/25 text-fg" : "border-danger bg-danger/25 text-fg") : assigned ? "border-azure-300 bg-azure-500 text-white" : selected ? "border-azure-300 bg-ink-900 text-fg" : "border-fg/70 bg-ink-900 text-fg",
                  )}
                >
                  {checked ? ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden /> : n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2" aria-label="Punti del diagramma">
        {[...positions]
          .sort((a, b) => numberOf(a) - numberOf(b))
          .map((spot) => {
            const n = numberOf(spot);
            const wrong = checked && answers[spot] !== spot;
            return (
              <li key={spot} className="flex items-center gap-3">
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums", checked ? (wrong ? "border-danger text-red-300" : "border-success text-green-300") : "border-white/30 text-fg")}>{n}</span>
                <div className="min-w-0 flex-1">
                  <Select aria-label={`Etichetta del punto ${n}`} value={answers[spot] ?? ""} disabled={checked} onChange={(e) => assign(spot, e.target.value || null)} className="h-11 sm:h-10">
                    <option value="">Scegli…</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                  {wrong && <p className="mt-1 text-sm text-fg-muted">Corretto: <span className="text-fg">{labelOf(spot)}</span></p>}
                </div>
              </li>
            );
          })}
      </ol>

      {!checked ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={Object.keys(answers).length < parts.length} onClick={verify}>
            Verifica
          </Button>
          <span className="text-sm tabular-nums text-fg-muted">
            {Object.keys(answers).length} di {parts.length} punti etichettati
          </span>
        </div>
      ) : (
        <div className="animate-fade-in space-y-5 border-t border-white/[0.07] pt-5">
          <Score value={`${correct} su ${parts.length}`} headingRef={resultRef}>
            etichette corrette. {correct < parts.length ? "Rivedi i punti segnati e riprova senza guardare il diagramma della lezione." : "Ora prova a ridisegnarlo su carta, a memoria."}
          </Score>
          <div>
            <label htmlFor={`${ids}-words`} className="block text-base font-semibold text-fg">
              Ora a parole: descrivi il percorso di un protone
            </label>
            <p className="mt-1 max-w-[65ch] text-sm text-fg-muted">Parti dalla catena respiratoria e arriva all’ATP. Parole e immagine insieme sono il cuore del dual coding.</p>
            <Textarea id={`${ids}-words`} rows={4} className="mt-2" value={words} onChange={(e) => setWords(e.target.value)} placeholder="I protoni vengono pompati…" />
            {!showModel ? (
              <Button className="mt-3" variant="secondary" disabled={words.trim().length < 30} onClick={() => setShowModel(true)}>
                Confronta con la risposta modello
              </Button>
            ) : (
              <div className="mt-3 inset-panel p-4" role="status">
                <p className="text-sm font-medium text-fg-muted">Risposta modello</p>
                <p className="mt-1.5 max-w-[65ch] text-base leading-relaxed text-fg-reading">{PROTON_MODEL}</p>
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={retry}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Riprova con una nuova numerazione
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Spacing: forgetting curve simulator ───────────────────────

/**
 * Didactic model: retention R = e^(−t/S); every successful review multiplies the
 * stability S. Illustrative only — real forgetting depends on material and learner.
 */
const HORIZON = 30;
const DAY_CHOICES = [1, 2, 3, 5, 7, 10, 14, 16, 21, 25];
const PRESETS = { none: [] as number[], massed: [1], spaced: [1, 3, 7, 16] };
type Plan = keyof typeof PRESETS | "custom";

function curve(reviews: number[]) {
  const pts: { x: number; y: number }[] = [];
  let S = 1.6;
  let last = 0;
  const set = [...reviews].sort((a, b) => a - b);
  for (let i = 0; i <= HORIZON * 4; i++) {
    const t = i / 4;
    while (set.length && t >= set[0]) {
      last = set.shift()!;
      S *= 2.5;
    }
    pts.push({ x: t, y: Math.exp(-(t - last) / S) });
  }
  return pts;
}

export function ForgettingCurveSim() {
  const [guess, setGuess] = useState(40);
  const [revealed, setRevealed] = useState(false);
  const [plan, setPlan] = useState<Plan>("spaced");
  const [days, setDays] = useState<number[]>(PRESETS.spaced);
  const ids = useId();
  const resultRef = useRef<HTMLParagraphElement>(null);

  const none = useMemo(() => curve([]), []);
  const mine = useMemo(() => curve(days), [days]);
  const noneFinal = Math.round(none.at(-1)!.y * 100);
  const final = Math.round(mine.at(-1)!.y * 100);
  const series = [
    { key: "none", label: "Nessun ripasso", color: "#868d9e", points: none, dashed: true },
    ...(days.length ? [{ key: "plan", label: days.length ? `Ripassi ai giorni ${days.join(", ")}` : "", color: "#3d8bff", points: mine }] : []),
  ];

  const choosePreset = (p: Plan) => {
    setPlan(p);
    if (p !== "custom") setDays(PRESETS[p]);
  };
  const toggleDay = (d: number) => {
    setPlan("custom");
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)));
  };

  if (!revealed) {
    return (
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-fg">Prima prevedi</h3>
        <div>
          <label htmlFor={`${ids}-guess`} className="block max-w-[60ch] text-base text-fg-reading">
            Oggi studi un argomento e poi non lo ripassi più. Quanto ne ricorderai dopo 30 giorni?
          </label>
          <div className="mt-4 flex items-center gap-4">
            <input id={`${ids}-guess`} type="range" min={0} max={100} step={5} value={guess} onChange={(e) => setGuess(Number(e.target.value))} className="h-11 w-full max-w-md accent-[#3d8bff]" aria-valuetext={`${guess}%`} />
            <output htmlFor={`${ids}-guess`} className="w-16 text-2xl font-semibold tabular-nums text-fg">
              {guess}%
            </output>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setRevealed(true);
            requestAnimationFrame(() => resultRef.current?.focus());
          }}
        >
          Verifica con il modello
        </Button>
      </div>
    );
  }

  const diff = guess - noneFinal;
  return (
    <div className="space-y-6">
      <p ref={resultRef} tabIndex={-1} role="status" className="max-w-[65ch] text-base leading-relaxed text-fg-reading focus-visible:outline-offset-4">
        Avevi previsto <strong className="font-semibold text-fg">{guess}%</strong>. Senza ripassi il modello arriva a circa <strong className="font-semibold text-fg">{noneFinal}%</strong> dopo 30 giorni
        {diff > 20 ? ": quasi tutti sovrastimano quanto resterà, ed è proprio per questo che rileggere sembra bastare." : "."} Ora costruisci un piano di ripasso e guarda come cambia la curva.
      </p>

      <div className="space-y-3">
        <Segmented
          ariaLabel="Piano di ripasso"
          value={plan}
          onChange={choosePreset}
          options={[
            { value: "none", label: "Nessuno" },
            { value: "massed", label: "Un ripasso" },
            { value: "spaced", label: "Dilazionato" },
            { value: "custom", label: "Il tuo piano" },
          ]}
        />
        <div role="group" aria-label="Giorni di ripasso">
          <p className="text-sm text-fg-muted">Giorni di ripasso: tocca per aggiungere o togliere</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DAY_CHOICES.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Giorno ${d}`}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "grid h-11 min-w-11 place-items-center rounded-control border px-2 text-sm font-medium tabular-nums transition-colors duration-150 sm:h-9 sm:min-w-9",
                    on ? "border-azure-400 bg-azure-500/25 text-fg" : "border-white/[0.1] text-fg-muted hover:border-white/25 hover:text-fg",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div aria-live="polite">
          <p className="text-4xl font-semibold tracking-[-0.02em] text-fg tabular-nums">{final}%</p>
          <p className="text-sm text-fg-muted">ritenzione stimata al giorno 30{days.length ? `, con ${days.length === 1 ? "1 ripasso" : `${days.length} ripassi`}` : ", senza ripassi"}</p>
        </div>
        <Legend series={series} />
      </div>

      <div className="-mx-1.5 overflow-x-clip px-1.5 py-1.5">
        <LineChart
          ariaLabel="Modello didattico della curva dell’oblio con e senza ripassi"
          series={series}
          xDomain={[0, HORIZON]}
          yDomain={[0, 1]}
          xTicks={[0, 7, 16, 30]}
          yTicks={[0, 0.5, 1]}
          xLabel="giorni dallo studio"
          yLabel="ritenzione"
          xFormat={(v) => `${Math.round(v)}`}
          yFormat={(v) => `${Math.round(v * 100)}%`}
          markers={days.length ? [{ x: HORIZON, y: final / 100, label: `${final}% al giorno 30`, color: "#3d8bff" }] : undefined}
        />
      </div>
      <p className="max-w-[65ch] text-sm leading-relaxed text-fg-muted">
        Modello illustrativo: R = e^(−t/S), con una stabilità S che cresce a ogni ripasso riuscito. La forma qualitativa è coerente con la curva di Ebbinghaus replicata da Murre & Dros (2015); i numeri reali dipendono da materiale e studente.
      </p>
      <Button
        variant="ghost"
        onClick={() => {
          setRevealed(false);
          choosePreset("spaced");
        }}
      >
        <RotateCcw className="h-4 w-4" aria-hidden /> Rifai la previsione
      </Button>
    </div>
  );
}

// ── Interleaving: classify the problem type ───────────────────

const INTERLEAVE_ITEMS = [
  { q: "Un’arteria si restringe da 1 cm² a 0,25 cm²: come cambia la velocità del sangue?", law: "continuita", clue: "Cambia la sezione e si chiede la velocità: la portata A·v resta costante." },
  { q: "Qual è la pressione in più a 3 m di profondità in una piscina?", law: "stevino", clue: "Fluido fermo e profondità: Δp = ρgh." },
  { q: "Nel tratto ristretto di un tubo orizzontale la pressione laterale è maggiore o minore?", law: "bernoulli", clue: "Fluido in moto e domanda sulla pressione: dove la velocità aumenta, la pressione cala." },
  { q: "Se il raggio di un’arteriola si riduce del 20%, come cambia la portata a parità di Δp?", law: "poiseuille", clue: "Raggio, portata e Δp in un fluido viscoso: Q è proporzionale a r⁴." },
  { q: "Un cubo di legno galleggia in acqua: che frazione del volume è immersa?", law: "archimede", clue: "Un corpo immerso: la spinta è uguale al peso del fluido spostato." },
  { q: "Da un foro sul fondo di un serbatoio esce acqua: con quale velocità?", law: "bernoulli", clue: "Velocità di uscita da un’altezza: Bernoulli tra pelo libero e foro (Torricelli, v = √(2gh))." },
  { q: "Due vasi identici in parallelo: qual è la resistenza equivalente?", law: "poiseuille", clue: "Resistenza idraulica dei vasi, R = 8ηL/(πr⁴): in parallelo si sommano i reciproci." },
  { q: "La portata cardiaca è 5 L/min e la sezione aortica 4 cm²: velocità media?", law: "continuita", clue: "Portata e sezione, si chiede la velocità: v = Q/A." },
] as const;

const LAWS = [
  { id: "continuita", label: "Continuità (A·v)" },
  { id: "bernoulli", label: "Bernoulli" },
  { id: "stevino", label: "Stevino" },
  { id: "poiseuille", label: "Poiseuille" },
  { id: "archimede", label: "Archimede" },
] as const;

const lawLabel = (id: string | null) => LAWS.find((l) => l.id === id)?.label ?? "";

export function InterleavingExercise({ onComplete }: { onComplete?: (score01: number) => void }) {
  const [seed, setSeed] = useState(5);
  const items = useMemo(() => shuffle([...INTERLEAVE_ITEMS], seed), [seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<(string | null)[]>(() => items.map(() => null));
  const [finished, setFinished] = useState(false);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const score = picked.filter((p, k) => p === items[k].law).length;
  const answered = picked[i] !== null;
  const item = items[i];

  const choose = (law: string) => {
    if (answered) return;
    setPicked(picked.map((p, k) => (k === i ? law : p)));
    requestAnimationFrame(() => nextRef.current?.focus());
  };

  const next = () => {
    if (i < items.length - 1) {
      setI(i + 1);
      requestAnimationFrame(() => questionRef.current?.focus());
    } else {
      setFinished(true);
      onComplete?.(score / items.length);
      requestAnimationFrame(() => doneRef.current?.focus());
    }
  };

  const retry = () => {
    const s = Math.floor(Math.random() * 100000);
    setSeed(s);
    setPicked(INTERLEAVE_ITEMS.map(() => null));
    setI(0);
    setFinished(false);
    requestAnimationFrame(() => questionRef.current?.focus());
  };

  if (finished) {
    return (
      <div className="space-y-5">
        <Score value={`${score} su ${items.length}`} headingRef={doneRef}>
          quesiti classificati correttamente. Gli errori di classificazione sono i più istruttivi: rileggi l’indizio di quelli sbagliati.
        </Score>
        <ul className="divide-y divide-white/[0.07]">
          {items.map((it, k) => {
            const ok = picked[k] === it.law;
            return (
              <li key={it.q} className="flex gap-3 py-3 text-sm">
                {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />}
                <div className="min-w-0">
                  <p className="text-fg">{it.q}</p>
                  <p className="mt-1 text-fg-muted">
                    {ok ? (
                      <>Hai scelto {lawLabel(picked[k])}: corretto.</>
                    ) : (
                      <>
                        Hai scelto {lawLabel(picked[k])}, serviva <span className="text-fg">{lawLabel(it.law)}</span>. {it.clue}
                      </>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <Button variant="secondary" onClick={retry}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Riprova con un nuovo ordine
        </Button>
      </div>
    );
  }

  const ok = answered && picked[i] === item.law;
  return (
    <div className="space-y-5">
      <p className="max-w-[65ch] text-base leading-relaxed text-fg-muted">Quesiti mescolati: prima di risolverli riconosci quale legge si applica. È il passaggio che la pratica «a blocchi» ti fa saltare.</p>
      <div className="flex items-center gap-4">
        <span className="shrink-0 text-sm tabular-nums text-fg-muted">
          Quesito {i + 1} di {items.length}
        </span>
        <ProgressBar value={(i + (answered ? 1 : 0)) / items.length} label="Avanzamento dei quesiti" />
      </div>
      <h3 ref={questionRef} tabIndex={-1} className="max-w-[60ch] text-lg font-medium leading-snug text-fg focus-visible:outline-offset-4">
        {item.q}
      </h3>
      <div role="group" aria-label="Quale legge si applica?" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {LAWS.map((l) => {
          const chosen = picked[i] === l.id;
          const isRight = answered && l.id === item.law;
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={chosen}
              aria-disabled={answered || undefined}
              onClick={() => choose(l.id)}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-control border px-3.5 py-2 text-left text-sm transition-colors duration-150",
                isRight ? "animate-correct border-success/50 bg-success/[0.08] text-fg" : chosen ? "animate-shake border-danger/50 bg-danger/[0.08] text-fg" : answered ? "border-white/[0.06] text-fg-subtle" : "border-white/[0.12] text-fg-muted hover:border-white/25 hover:text-fg",
              )}
            >
              {isRight ? <Check className="h-4 w-4 shrink-0 text-success" aria-hidden /> : chosen ? <X className="h-4 w-4 shrink-0 text-danger" aria-hidden /> : <span className="h-4 w-4 shrink-0 rounded-full border border-white/25" aria-hidden />}
              {l.label}
            </button>
          );
        })}
      </div>
      <div role="status">
        {answered && (
          <div className={cn("animate-fade-in rounded-card border p-4", ok ? "border-success/30 bg-success/[0.05]" : "border-danger/30 bg-danger/[0.05]")}>
            <p className="flex items-center gap-2 font-medium text-fg">
              {ok ? <Check className="h-4 w-4 text-success" aria-hidden /> : <X className="h-4 w-4 text-danger" aria-hidden />}
              {ok ? `Esatto: è ${lawLabel(item.law)}.` : `Hai scelto ${lawLabel(picked[i])}: qui serve ${lawLabel(item.law)}.`}
            </p>
            <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-fg-muted">Indizio: {item.clue}</p>
          </div>
        )}
      </div>
      {answered && (
        <Button ref={nextRef} variant="primary" onClick={next}>
          {i < items.length - 1 ? "Quesito successivo" : "Vedi il risultato"} <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}

// ── Free recall (brain dump) ──────────────────────────────────

export function FreeRecall({ topicId, onComplete }: { topicId: string; onComplete?: (score01: number) => void }) {
  const lesson = getLesson(topicId);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const record = useAtlas((s) => s.recordRecallScore);
  const ids = useId();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  if (!lesson) return <Notice tone="info">Disponibile per gli argomenti con lezione completa.</Notice>;
  const concepts = lesson.feynman.essentials;
  const t = normText(text);
  const hit = concepts.map((c) => c.keywords.every((g) => g.some((k) => has(t, k))));
  const found = hit.filter(Boolean).length;
  const score = found / concepts.length;
  return (
    <div className="space-y-4">
      <label htmlFor={`${ids}-text`} className="block max-w-[65ch] text-base leading-relaxed text-fg-muted">
        Scrivi tutto ciò che ricordi su «{getTopicRef(topicId)?.topic.title}», senza guardare. Poi confronta con i concetti essenziali.
      </label>
      <Textarea ref={fieldRef} id={`${ids}-text`} rows={7} value={text} onChange={(e) => setText(e.target.value)} readOnly={checked} placeholder="Tutto quello che ricordi, anche in disordine…" />
      {!checked ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            disabled={text.trim().length < 30}
            onClick={() => {
              setChecked(true);
              record(topicId, score);
              onComplete?.(score);
              requestAnimationFrame(() => resultRef.current?.focus());
            }}
          >
            Confronta
          </Button>
          {text.trim().length < 30 && <span className="text-sm text-fg-muted">Scrivi almeno qualche riga per confrontare.</span>}
        </div>
      ) : (
        <div className="animate-fade-in space-y-4 border-t border-white/[0.07] pt-5">
          <Score value={`${found} su ${concepts.length}`} headingRef={resultRef}>
            concetti essenziali richiamati.
          </Score>
          <ul className="divide-y divide-white/[0.07]">
            {concepts.map((c, i) => (
              <li key={c.concept} className="flex gap-3 py-2.5 text-sm">
                {hit[i] ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />}
                <span className="min-w-0">
                  <span className="sr-only">{hit[i] ? "Richiamato: " : "Mancante: "}</span>
                  <span className={hit[i] ? "text-fg-muted" : "text-fg"}>{c.concept}</span>
                  {!hit[i] && <span className="mt-0.5 block text-fg-muted">{c.explanation}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-fg-muted">Il riconoscimento usa parole chiave: se hai espresso un concetto con altre parole, consideralo presente.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setChecked(false);
              setText("");
              requestAnimationFrame(() => fieldRef.current?.focus());
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Riprova da capo
          </Button>
        </div>
      )}
    </div>
  );
}
