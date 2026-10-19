"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, MicOff, Timer, Sparkles, Check, X, RotateCcw, Shuffle } from "lucide-react";
import { Badge, Button, Card, Notice, ProgressBar, Segmented, Textarea } from "@/components/ui/primitives";
import { LineChart, Legend } from "@/components/ui/charts";
import { MitochondrionDiagram, MITO_PARTS } from "@/components/diagrams/diagrams";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { useSpeechInput } from "@/lib/speech";
import { useAtlas } from "@/lib/store";
import { getLesson } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import { has, normText } from "@/lib/feynman";
import { cn, fmt, shuffle } from "@/lib/utils";

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

  const stopSpeech = speech.stop;
  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      setRunning(false);
      stopSpeech();
      setPhase("review");
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left, stopSpeech]);

  if (!items.length) return <Notice tone="info">Le domande orali sono disponibili per gli argomenti con lezione completa.</Notice>;
  const item = items[i];

  const submit = async () => {
    setRunning(false);
    speech.stop();
    setPhase("review");
    setChecks(item.keyPoints.map(() => false));
    setAi(null);
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
      setPhase("answer");
      setAi(null);
    } else {
      const avg = s.reduce((a, b) => a + b, 0) / s.length;
      record(topicId, avg);
      onComplete?.(avg);
      setPhase("done");
    }
  };

  if (phase === "done") {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return (
      <Card className="p-6">
        <div className="font-display text-3xl text-fg">Interrogazione conclusa: {Math.round(avg * 100)}%</div>
        <p className="mt-2 text-[13.5px] text-fg-muted">Le risposte incomplete sono registrate come lacune: le ritroverai nell’analisi e nel piano di ripasso.</p>
        <Button className="mt-4" variant="secondary" onClick={() => { setI(0); setScores([]); setAnswer(""); setLeft(secondsPerQuestion); setPhase("answer"); }}>
          <RotateCcw className="h-4 w-4" /> Nuova interrogazione
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="ultra">Domanda {i + 1} di {items.length}</Badge>
        <span className="text-[12px] text-fg-subtle">{getTopicRef(topicId)?.topic.title}</span>
        <div className={cn("ml-auto flex items-center gap-1.5 font-mono text-[14px]", left <= 15 ? "text-red-300" : "text-fg")}>
          <Timer className="h-4 w-4" /> {fmt.clock(left)}
        </div>
      </div>
      <ProgressBar value={left / secondsPerQuestion} tone={left <= 15 ? "danger" : "ultra"} />
      <p className="font-display text-2xl leading-snug text-fg">«{item.question}»</p>
      {phase === "answer" && (
        <>
          <Textarea rows={5} value={answer + (speech.interim ? ` ${speech.interim}` : "")} onChange={(e) => setAnswer(e.target.value)} placeholder={running ? "Rispondi come se parlassi alla commissione…" : "Premi «Inizia» per far partire il tempo."} disabled={!running} aria-label="Risposta orale" />
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <Button variant="primary" onClick={() => setRunning(true)}>Inizia ({secondsPerQuestion} s)</Button>
            ) : (
              <>
                {speech.supported && (
                  <Button variant={speech.listening ? "danger" : "secondary"} onClick={speech.listening ? speech.stop : speech.start}>
                    {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {speech.listening ? "Stop" : "Rispondi a voce"}
                  </Button>
                )}
                <Button variant="primary" onClick={submit}>Ho finito</Button>
              </>
            )}
          </div>
        </>
      )}
      {phase === "review" && (
        <div className="space-y-3 animate-fade-in">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[13.5px] text-fg-muted">
            <div className="text-[11px] uppercase tracking-wide text-fg-subtle">La tua risposta</div>
            {answer || <span className="italic">Nessuna risposta</span>}
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3 text-[13.5px] text-fg-muted">
            <div className="text-[11px] uppercase tracking-wide text-emerald-200/80">Risposta attesa</div>
            {item.modelAnswer}
          </div>
          {loading && <p className="text-[12.5px] text-fg-subtle">Valutazione AI in corso…</p>}
          {ai ? (
            <div className="rounded-xl border border-azure-400/25 bg-azure-500/[0.06] p-3 text-[13.5px]">
              <div className="flex items-center gap-1.5 text-fg"><Sparkles className="h-4 w-4 text-azure-300" /> Valutazione AI: {Math.round(ai.score * 100)}%</div>
              <p className="mt-1 text-fg-muted">{ai.feedback}</p>
              <Button className="mt-2" size="sm" variant="primary" onClick={() => next(ai.score)}>Domanda successiva</Button>
            </div>
          ) : (
            !loading && (
              <div>
                <div className="text-[12.5px] text-fg-muted">Autovaluta con la griglia: quali elementi hai detto?</div>
                <ul className="mt-2 space-y-1.5">
                  {item.keyPoints.map((k, idx) => (
                    <li key={idx}>
                      <label className="flex cursor-pointer items-start gap-2 text-[13px] text-fg-muted">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#e879f9]" checked={checks[idx] ?? false} onChange={() => setChecks(checks.map((c, j) => (j === idx ? !c : c)))} />
                        {k}
                      </label>
                    </li>
                  ))}
                </ul>
                <Button className="mt-3" size="sm" variant="primary" onClick={() => next(checks.filter(Boolean).length / Math.max(1, item.keyPoints.length))}>
                  Registra e continua
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </Card>
  );
}

// ── Dual coding: label the mitochondrion ──────────────────────

export function LabelDiagramExercise({ onComplete }: { onComplete?: (score01: number) => void }) {
  const parts = MITO_PARTS;
  const [order] = useState(() => shuffle(parts.map((p) => p.id), 13));
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const positions = useMemo(() => shuffle(parts.map((p) => p.id), 29), [parts]);
  const correct = Object.entries(answers).filter(([spot, label]) => spot === label).length;

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-fg-muted">Scegli un’etichetta e poi tocca il punto del diagramma a cui corrisponde. Quando hai finito, verifica e descrivi a parole il percorso di un protone.</p>
      <div className="flex flex-wrap gap-2">
        {order.map((id) => {
          const p = parts.find((x) => x.id === id)!;
          const used = Object.values(answers).includes(id);
          return (
            <button key={id} onClick={() => setSelected(id)} disabled={checked} className={cn("rounded-lg border px-2.5 py-1.5 text-[12.5px] transition", selected === id ? "border-azure-400/70 bg-azure-500/15 text-fg" : used ? "border-white/5 text-fg-subtle line-through" : "border-white/10 text-fg-muted hover:text-fg")}>
              {p.label}
            </button>
          );
        })}
      </div>
      <Card className="relative p-3">
        <MitochondrionDiagram showLabels={false} />
        <svg viewBox="0 0 760 300" className="absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]">
          {positions.map((spotId, idx) => {
            const spot = parts.find((p) => p.id === spotId)!;
            const assigned = answers[spotId];
            const ok = checked && assigned === spotId;
            return (
              <g key={spotId} onClick={() => { if (!checked && selected) { setAnswers({ ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== selected)), [spotId]: selected }); setSelected(null); } }} className="cursor-pointer">
                <circle cx={spot.x} cy={spot.y} r="13" fill={checked ? (ok ? "#16a34a" : "#dc2626") : assigned ? "#1b6ee6" : "#111116"} stroke="#f5f5f7" strokeWidth="1.5" />
                <text x={spot.x} y={spot.y + 4} textAnchor="middle" fontSize="11" fill="#fff">{idx + 1}</text>
              </g>
            );
          })}
        </svg>
      </Card>
      <ul className="grid gap-1.5 text-[12.5px] sm:grid-cols-2">
        {positions.map((spotId, idx) => (
          <li key={spotId} className="text-fg-muted">
            <span className="font-mono text-fg-subtle">{idx + 1}.</span> {answers[spotId] ? parts.find((p) => p.id === answers[spotId])?.label : "—"}
            {checked && answers[spotId] !== spotId && <span className="text-emerald-300"> → {parts.find((p) => p.id === spotId)?.label}</span>}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {!checked ? (
          <Button variant="primary" disabled={Object.keys(answers).length < parts.length} onClick={() => { setChecked(true); onComplete?.(correct / parts.length); }}>
            Verifica ({Object.keys(answers).length}/{parts.length})
          </Button>
        ) : (
          <>
            <Badge tone={correct === parts.length ? "success" : "warning"}>{correct}/{parts.length} corrette</Badge>
            <Button variant="ghost" size="sm" onClick={() => { setAnswers({}); setChecked(false); }}><RotateCcw className="h-4 w-4" /> Riprova</Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Spacing: forgetting curve simulator ───────────────────────

/**
 * Didactic model: retention R = e^(−t/S); every successful review multiplies the
 * stability S. Illustrative only — real forgetting depends on material and learner.
 */
export function ForgettingCurveSim() {
  const [plan, setPlan] = useState<"none" | "massed" | "spaced">("spaced");
  const horizon = 30;
  const schedules = { none: [] as number[], massed: [1], spaced: [1, 3, 7, 16] };
  const curve = (reviews: number[]) => {
    const pts: { x: number; y: number }[] = [];
    let S = 1.6;
    let last = 0;
    const set = [...reviews];
    for (let i = 0; i <= horizon * 4; i++) {
      const t = i / 4;
      if (set.length && t >= set[0]) {
        last = set.shift()!;
        S *= 2.5;
      }
      pts.push({ x: t, y: Math.exp(-(t - last) / S) });
    }
    return pts;
  };
  const series = [
    { key: "none", label: "Nessun ripasso", color: "#d95926", points: curve(schedules.none), dashed: true },
    { key: plan, label: plan === "spaced" ? "Ripassi a 1, 3, 7, 16 giorni" : plan === "massed" ? "Un solo ripasso il giorno dopo" : "Nessun ripasso", color: "#3987e5", points: curve(schedules[plan]) },
  ].filter((s, i, arr) => arr.findIndex((x) => x.key === s.key) === i);
  const finalR = series.at(-1)!.points.at(-1)!.y;
  return (
    <div className="space-y-3">
      <Segmented
        value={plan}
        onChange={setPlan}
        options={[
          { value: "none", label: "Nessun ripasso" },
          { value: "massed", label: "Un ripasso" },
          { value: "spaced", label: "Ripasso dilazionato" },
        ]}
      />
      <Legend series={series} />
      <LineChart
        ariaLabel="Modello didattico della curva dell’oblio con e senza ripassi"
        series={series}
        xDomain={[0, horizon]}
        yDomain={[0, 1]}
        xTicks={[0, 1, 3, 7, 16, 30]}
        yTicks={[0, 0.5, 1]}
        xLabel="giorni dallo studio"
        yLabel="ritenzione"
        xFormat={(v) => `${Math.round(v)}`}
        yFormat={(v) => `${Math.round(v * 100)}%`}
      />
      <p className="text-[12.5px] text-fg-subtle">
        Modello illustrativo (R = e^(−t/S), stabilità che cresce a ogni ripasso riuscito): ritenzione stimata dopo 30 giorni {Math.round(finalR * 100)}%. La forma qualitativa è coerente con la curva di Ebbinghaus replicata da Murre & Dros (2015); i numeri reali dipendono da materiale e studente.
      </p>
    </div>
  );
}

// ── Interleaving: classify the problem type ───────────────────

const INTERLEAVE_ITEMS = [
  { q: "Un’arteria si restringe da 1 cm² a 0,25 cm²: come cambia la velocità del sangue?", law: "continuita" },
  { q: "Qual è la pressione in più a 3 m di profondità in una piscina?", law: "stevino" },
  { q: "Nel tratto ristretto di un tubo orizzontale la pressione laterale è maggiore o minore?", law: "bernoulli" },
  { q: "Se il raggio di un’arteriola si riduce del 20%, come cambia la portata a parità di Δp?", law: "poiseuille" },
  { q: "Un cubo di legno galleggia in acqua: che frazione del volume è immersa?", law: "archimede" },
  { q: "Da un foro sul fondo di un serbatoio esce acqua: con quale velocità?", law: "bernoulli" },
  { q: "Due vasi identici in parallelo: qual è la resistenza equivalente?", law: "poiseuille" },
  { q: "La portata cardiaca è 5 L/min e la sezione aortica 4 cm²: velocità media?", law: "continuita" },
] as const;

const LAWS = [
  { id: "continuita", label: "Continuità (A·v)" },
  { id: "bernoulli", label: "Bernoulli" },
  { id: "stevino", label: "Stevino" },
  { id: "poiseuille", label: "Poiseuille" },
  { id: "archimede", label: "Archimede" },
] as const;

export function InterleavingExercise({ onComplete }: { onComplete?: (score01: number) => void }) {
  const items = useMemo(() => shuffle([...INTERLEAVE_ITEMS], 5), []);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<(string | null)[]>(() => items.map(() => null));
  const done = picked.every(Boolean);
  const score = picked.filter((p, k) => p === items[k].law).length;
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-fg-muted">Quesiti mescolati: prima di risolverli devi riconoscere quale legge si applica. È il passaggio che la pratica «a blocchi» ti fa saltare.</p>
      {!done ? (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[12px] text-fg-subtle"><Shuffle className="h-3.5 w-3.5" /> Quesito {i + 1} di {items.length}</div>
          <p className="mt-2 text-[16px] text-fg">{items[i].q}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LAWS.map((l) => (
              <button key={l.id} onClick={() => { const n = picked.map((p, k) => (k === i ? l.id : p)); setPicked(n); if (i < items.length - 1) setI(i + 1); else onComplete?.(n.filter((p, k) => p === items[k].law).length / items.length); }} className="rounded-xl border border-white/10 px-3 py-2 text-[13px] text-fg-muted transition hover:border-fuchsia-300/40 hover:text-fg">
                {l.label}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="space-y-2 p-5">
          <div className="font-display text-3xl text-fg">{score}/{items.length} classificati correttamente</div>
          <ul className="space-y-1.5 text-[13px]">
            {items.map((it, k) => (
              <li key={k} className="flex gap-2">
                {picked[k] === it.law ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />}
                <span className="text-fg-muted">{it.q} <span className="text-fg">→ {LAWS.find((l) => l.id === it.law)?.label}</span></span>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={() => { setPicked(items.map(() => null)); setI(0); }}><RotateCcw className="h-4 w-4" /> Riprova</Button>
        </Card>
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
  if (!lesson) return <Notice tone="info">Disponibile per gli argomenti con lezione completa.</Notice>;
  const concepts = lesson.feynman.essentials;
  const t = normText(text);
  const hit = concepts.map((c) => c.keywords.every((g) => g.some((k) => has(t, k))));
  const score = hit.filter(Boolean).length / concepts.length;
  return (
    <div className="space-y-3">
      <p className="text-[13.5px] text-fg-muted">Scrivi tutto ciò che ricordi su «{getTopicRef(topicId)?.topic.title}», senza guardare. Poi confronta con i concetti essenziali.</p>
      <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} disabled={checked} placeholder="Tutto quello che ricordi, anche in disordine…" aria-label="Richiamo libero" />
      {!checked ? (
        <Button variant="primary" disabled={text.trim().length < 30} onClick={() => { setChecked(true); record(topicId, score); onComplete?.(score); }}>Confronta</Button>
      ) : (
        <Card className="p-4">
          <div className="text-[14px] text-fg">Concetti essenziali richiamati: <span className="font-mono">{hit.filter(Boolean).length}/{concepts.length}</span></div>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {concepts.map((c, i) => (
              <li key={c.concept} className="flex gap-2">
                {hit[i] ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
                <span className={hit[i] ? "text-fg-muted" : "text-fg"}>{c.concept}{!hit[i] && <span className="text-fg-subtle"> — {c.explanation}</span>}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] text-fg-subtle">Il riconoscimento usa parole chiave: se hai espresso un concetto con altre parole, consideralo presente.</p>
        </Card>
      )}
    </div>
  );
}
