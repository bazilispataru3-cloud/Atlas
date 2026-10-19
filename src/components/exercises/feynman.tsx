"use client";

import { useMemo, useState } from "react";
import { Mic, MicOff, Sparkles, RotateCcw, Check, X, AlertTriangle, Feather } from "lucide-react";
import { Badge, Button, Card, Notice, ProgressRing, Select, Textarea } from "@/components/ui/primitives";
import { getLesson, LESSONS } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import { analyzeFeynman, type LocalFeynmanResult } from "@/lib/feynman";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { useSpeechInput } from "@/lib/speech";
import { useAtlas } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AiFeynman {
  score: number;
  verdict: string;
  correct: string[];
  errors: { claim: string; correction: string }[];
  omissions: string[];
  jargon: string[];
  improvedExplanation: string;
  followUpQuestions: string[];
}

/**
 * Feynman technique: explain simply → analysis (AI when configured, otherwise a
 * transparent keyword rubric) → corrections → second attempt.
 */
export function FeynmanExercise({ topicId: fixedTopic, onScore }: { topicId?: string; onScore?: (score01: number) => void }) {
  const integrations = useIntegrations();
  const addFeynman = useAtlas((s) => s.addFeynman);
  const recordRecall = useAtlas((s) => s.recordRecallScore);
  const history = useAtlas((s) => s.feynman);
  const [topicId, setTopicId] = useState(fixedTopic ?? "bio-mitocondri");
  const [text, setText] = useState("");
  const [attempt, setAttempt] = useState(1);
  const [local, setLocal] = useState<LocalFeynmanResult | null>(null);
  const [ai, setAi] = useState<AiFeynman | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speech = useSpeechInput((chunk) => setText((t) => t + chunk));

  const lesson = getLesson(topicId);
  const ref = getTopicRef(topicId);
  const topicTitle = topicId === "bio-mitocondri" ? "Il ciclo di Krebs e la respirazione cellulare" : ref?.topic.title ?? "";
  const previous = useMemo(() => history.filter((h) => h.topicId === topicId).slice(-3), [history, topicId]);

  const analyze = async () => {
    if (!lesson && !integrations?.ai) return;
    setError(null);
    setAi(null);
    const localResult = lesson ? analyzeFeynman(text, lesson.feynman) : null;
    setLocal(localResult);
    let finalScore = localResult?.score ?? 0;
    let analysis: "ai" | "locale" = "locale";
    if (integrations?.ai) {
      setLoading(true);
      const r = await postJSON<{ data: AiFeynman }>("/api/ai/evaluate", { kind: "feynman", topicId, topicTitle, explanation: text, attempt });
      setLoading(false);
      if (r.ok) {
        setAi(r.data.data);
        finalScore = r.data.data.score;
        analysis = "ai";
      } else setError(`${r.error.message} Mostro l’analisi locale.`);
    }
    addFeynman({ topicId, text, score: finalScore, analysis });
    recordRecall(topicId, finalScore / 100);
    onScore?.(finalScore / 100);
  };

  const retry = () => {
    setAttempt((a) => a + 1);
    setLocal(null);
    setAi(null);
  };

  const score = ai?.score ?? local?.score ?? null;
  const analyzed = score !== null;

  return (
    <div className="space-y-4">
      {!fixedTopic && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-[13px] text-fg-muted" htmlFor="fey-topic">Argomento</label>
          <Select id="fey-topic" value={topicId} onChange={(e) => { setTopicId(e.target.value); setText(""); setLocal(null); setAi(null); setAttempt(1); }} className="max-w-sm">
            {LESSONS.map((l) => (
              <option key={l.topicId} value={l.topicId}>{getTopicRef(l.topicId)?.topic.title}</option>
            ))}
          </Select>
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fuchsia-400/15 text-fuchsia-300"><Feather className="h-4 w-4" /></span>
          <div>
            <div className="text-[15px] font-medium text-fg">
              Spiega «{topicTitle}» con parole semplici {attempt > 1 && <Badge tone="ultra" className="ml-1">Tentativo {attempt}</Badge>}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-subtle">
              Immagina di parlare a una persona intelligente che non ha mai studiato biologia o chimica. Frasi brevi, un esempio, nessun termine tecnico senza spiegarlo.
            </p>
          </div>
        </div>
        <Textarea
          className="mt-4"
          rows={8}
          value={text + (speech.interim ? ` ${speech.interim}` : "")}
          onChange={(e) => setText(e.target.value)}
          disabled={analyzed}
          placeholder="Inizia così: «Immagina il mitocondrio come…»"
          aria-label="La tua spiegazione"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {speech.supported && !analyzed && (
            <Button variant={speech.listening ? "danger" : "secondary"} onClick={speech.listening ? speech.stop : speech.start}>
              {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {speech.listening ? "Interrompi dettatura" : "Detta a voce"}
            </Button>
          )}
          <span className="text-[12px] text-fg-subtle">{text.trim().split(/\s+/).filter(Boolean).length} parole</span>
          <div className="ml-auto flex gap-2">
            {!analyzed ? (
              <Button variant="primary" disabled={text.trim().length < 60 || loading || (!lesson && !integrations?.ai)} onClick={analyze}>
                <Sparkles className="h-4 w-4" /> {loading ? "Analisi in corso…" : "Analizza la spiegazione"}
              </Button>
            ) : (
              <Button variant="primary" onClick={retry}>
                <RotateCcw className="h-4 w-4" /> Secondo tentativo
              </Button>
            )}
          </div>
        </div>
        {speech.supported && (
          <p className="mt-2 text-[11px] text-fg-subtle">La dettatura usa il riconoscimento vocale del browser: in Chrome l’audio viene elaborato dal servizio vocale di Google.</p>
        )}
        {speech.error && <Notice tone="warning" className="mt-3">{speech.error}</Notice>}
        {text.trim().length > 0 && text.trim().length < 60 && <p className="mt-2 text-[12px] text-fg-subtle">Scrivi almeno qualche frase (60 caratteri) per ricevere un’analisi utile.</p>}
        {!lesson && !integrations?.ai && <Notice tone="info" className="mt-3">Per questo argomento non c’è ancora una griglia di valutazione ATLAS e l’AI non è configurata: usa uno degli argomenti con lezione completa.</Notice>}
      </Card>

      {error && <Notice tone="warning">{error}</Notice>}

      {analyzed && (
        <Card className="p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProgressRing value={(score ?? 0) / 100} size={104} stroke={9} tone={(score ?? 0) >= 75 ? "success" : (score ?? 0) >= 50 ? "warning" : "danger"}>
              <div className="text-center">
                <div className="font-mono text-xl text-fg">{score}</div>
                <div className="text-[10.5px] text-fg-subtle">/ 100</div>
              </div>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <Badge tone={ai ? "azure" : "muted"}>{ai ? `Analisi AI (${integrations?.model ?? "Claude"})` : "Analisi locale con griglia ATLAS (AI non configurata)"}</Badge>
              <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
                {ai?.verdict ??
                  (local && local.missing.length === 0 && local.misconceptions.length === 0
                    ? "Hai toccato tutti i concetti essenziali senza errori riconosciuti. Ora prova a semplificare ancora o ad aggiungere un esempio."
                    : "Ecco cosa è emerso dal confronto con i concetti essenziali dell’argomento.")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FeedbackList title="Corretto" tone="ok" items={ai?.correct ?? local?.covered.map((c) => c.concept) ?? []} />
            <FeedbackList title="Omissioni" tone="warn" items={ai?.omissions ?? local?.missing.map((m) => `${m.concept} — ${m.explanation}`) ?? []} />
          </div>
          {(ai?.errors.length || local?.misconceptions.length) ? (
            <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/[0.05] p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium text-red-200"><X className="h-4 w-4" /> Errori da correggere</div>
              <ul className="mt-2 space-y-2.5">
                {(ai?.errors ?? local?.misconceptions.map((m) => ({ claim: m.sentence, correction: m.correction })) ?? []).map((e, i) => (
                  <li key={i} className="text-[13.5px]">
                    <div className="text-fg-subtle line-through decoration-red-400/60">«{e.claim}»</div>
                    <div className="mt-0.5 text-fg">{e.correction}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {ai?.jargon.length ? (
            <p className="mt-4 flex gap-2 text-[13px] text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Termini tecnici non spiegati: {ai.jargon.join(", ")}</p>
          ) : local && local.avgSentenceWords > 25 ? (
            <p className="mt-4 flex gap-2 text-[13px] text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Frasi lunghe in media {local.avgSentenceWords} parole: spezzale, è il cuore della tecnica.</p>
          ) : null}
          {ai?.improvedExplanation && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-[12px] uppercase tracking-wide text-fg-subtle">Una versione semplice e corretta</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{ai.improvedExplanation}</p>
            </div>
          )}
          {(ai?.followUpQuestions.length || lesson) && (
            <div className="mt-4">
              <div className="text-[12px] uppercase tracking-wide text-fg-subtle">Per il secondo tentativo</div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] text-fg-muted">
                {(ai?.followUpQuestions ?? lesson?.elaborative.slice(0, 3).map((e) => e.question) ?? []).map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}

      {previous.length > 0 && (
        <div className="text-[12px] text-fg-subtle">
          Tentativi precedenti su questo argomento: {previous.map((p) => `${p.score}/100`).join(" → ")}
        </div>
      )}
    </div>
  );
}

function FeedbackList({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" }) {
  return (
    <div className={cn("rounded-2xl border p-4", tone === "ok" ? "border-emerald-400/20 bg-emerald-500/[0.04]" : "border-amber-400/20 bg-amber-500/[0.04]")}>
      <div className={cn("flex items-center gap-2 text-[13px] font-medium", tone === "ok" ? "text-emerald-200" : "text-amber-200")}>
        {tone === "ok" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {title}
      </div>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-[13px] text-fg-muted">
          {items.map((i) => <li key={i}>• {i}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-fg-subtle">{tone === "ok" ? "Nessun concetto essenziale riconosciuto." : "Nessuna omissione rilevata."}</p>
      )}
    </div>
  );
}
