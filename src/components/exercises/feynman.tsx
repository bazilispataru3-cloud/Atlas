"use client";

import { useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, CircleAlert, Mic, MicOff, RotateCcw, Sparkles, X } from "lucide-react";
import { Badge, Button, Notice, ProgressRing, Select, Textarea } from "@/components/ui/primitives";
import { getLesson, LESSONS } from "@/data/lessons";
import { getTopicRef, SUBJECTS } from "@/data/syllabus";
import { analyzeFeynman, type LocalFeynmanResult } from "@/lib/feynman";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { useSpeechInput } from "@/lib/speech";
import { useAtlas } from "@/lib/store";
import { cn, fmt } from "@/lib/utils";

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

/** Minimum length before the analysis is useful. */
const MIN_CHARS = 60;

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
  const ids = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  const lesson = getLesson(topicId);
  const ref = getTopicRef(topicId);
  const topicTitle = ref?.topic.title ?? "";
  const previous = useMemo(() => history.filter((h) => h.topicId === topicId).slice(-4), [history, topicId]);
  const chars = text.trim().length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  const analyze = async () => {
    if (!lesson && !integrations?.ai) return;
    speech.stop();
    setError(null);
    setAi(null);
    const localResult = lesson ? analyzeFeynman(text, lesson.feynman) : null;
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
      } else setError(`${r.error.message} Qui sotto trovi l’analisi locale con la griglia ATLAS.`);
    }
    setLocal(localResult);
    addFeynman({ topicId, text, score: finalScore, analysis });
    recordRecall(topicId, finalScore / 100);
    onScore?.(finalScore / 100);
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const retry = () => {
    setAttempt((a) => a + 1);
    setLocal(null);
    setAi(null);
    setError(null);
    requestAnimationFrame(() => fieldRef.current?.focus());
  };

  const score = ai?.score ?? local?.score ?? null;
  const analyzed = score !== null;
  const scoreTone = (score ?? 0) >= 75 ? "success" : (score ?? 0) >= 50 ? "warning" : "danger";
  const errors = ai?.errors ?? local?.misconceptions.map((m) => ({ claim: m.sentence, correction: m.correction })) ?? [];
  const followUps = ai?.followUpQuestions ?? lesson?.elaborative.slice(0, 3).map((e) => e.question) ?? [];

  return (
    <div className="space-y-6">
      {!fixedTopic && (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <label className="text-sm font-medium text-fg-muted" htmlFor={`${ids}-topic`}>
            Argomento
          </label>
          <Select
            id={`${ids}-topic`}
            value={topicId}
            onChange={(e) => {
              setTopicId(e.target.value);
              setText("");
              setLocal(null);
              setAi(null);
              setAttempt(1);
            }}
            className="sm:max-w-sm"
          >
            {SUBJECTS.map((s) => {
              const ls = LESSONS.filter((l) => getTopicRef(l.topicId)?.subject.id === s.id);
              return ls.length ? (
                <optgroup key={s.id} label={s.name}>
                  {ls.map((l) => (
                    <option key={l.topicId} value={l.topicId}>
                      {getTopicRef(l.topicId)?.topic.title}
                    </option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </Select>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`${ids}-title`} className="text-lg font-semibold tracking-[-0.01em] text-fg text-balance">
            Spiega «{topicTitle}» con parole semplici
          </h3>
          {attempt > 1 && <Badge tone="azure">Tentativo {attempt}</Badge>}
        </div>
        <p className="mt-1.5 max-w-[65ch] text-base leading-relaxed text-fg-muted">
          Immagina di parlare a una persona intelligente che non ha mai studiato questa materia. Frasi brevi, un esempio, nessun termine tecnico senza spiegarlo.
        </p>
        <Textarea
          ref={fieldRef}
          className="mt-4 min-h-48"
          rows={8}
          value={text + (speech.interim ? ` ${speech.interim}` : "")}
          onChange={(e) => setText(e.target.value)}
          readOnly={analyzed || loading}
          placeholder="Inizia così: «Immagina il mitocondrio come…»"
          aria-labelledby={`${ids}-title`}
          aria-describedby={`${ids}-hint`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {speech.supported && !analyzed && (
            <Button variant={speech.listening ? "danger" : "secondary"} onClick={speech.listening ? speech.stop : speech.start} aria-pressed={speech.listening}>
              {speech.listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
              {speech.listening ? "Interrompi dettatura" : "Detta a voce"}
            </Button>
          )}
          <span className="text-sm tabular-nums text-fg-muted">{words === 1 ? "1 parola" : `${words} parole`}</span>
          <div className="ml-auto">
            {!analyzed ? (
              <Button variant="primary" loading={loading} disabled={chars < MIN_CHARS || (!lesson && !integrations?.ai)} onClick={analyze}>
                {!loading && <Sparkles className="h-4 w-4" aria-hidden />}
                {loading ? "Analisi in corso" : "Analizza la spiegazione"}
              </Button>
            ) : (
              <Button variant="secondary" onClick={retry}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Secondo tentativo
              </Button>
            )}
          </div>
        </div>
        <p id={`${ids}-hint`} className="mt-2 text-sm text-fg-muted">
          {analyzed
            ? "Leggi l’analisi, torna alla lezione sui punti mancanti e poi riscrivi la spiegazione."
            : chars < MIN_CHARS
              ? `Scrivi almeno qualche frase: mancano ${MIN_CHARS - chars} caratteri per ricevere un’analisi utile.`
              : "Quando sei pronto, analizza la spiegazione."}
        </p>
        {speech.supported && <p className="mt-1 text-xs text-fg-subtle">La dettatura usa il riconoscimento vocale del browser: in Chrome l’audio viene elaborato dal servizio vocale di Google.</p>}
        {speech.error && (
          <Notice tone="warning" className="mt-3" live>
            {speech.error}
          </Notice>
        )}
        {!lesson && !integrations?.ai && (
          <Notice tone="info" className="mt-3">
            Per questo argomento non c’è ancora una griglia di valutazione ATLAS e l’AI non è configurata: usa uno degli argomenti con lezione completa.
          </Notice>
        )}
      </div>

      {error && (
        <Notice tone="warning" live>
          {error}
        </Notice>
      )}

      {analyzed && (
        <section aria-labelledby={`${ids}-result`} className="animate-fade-in space-y-6 border-t border-white/[0.07] pt-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProgressRing value={(score ?? 0) / 100} size={96} stroke={7} tone={scoreTone} label={`Punteggio ${score} su 100`}>
              <span className="text-2xl font-semibold tabular-nums text-fg">{score}</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <h3 id={`${ids}-result`} ref={resultRef} tabIndex={-1} className="text-xl font-semibold text-fg focus-visible:outline-offset-4">
                {score} su 100
              </h3>
              <p className="mt-1 max-w-[65ch] text-base leading-relaxed text-fg-muted">
                {ai?.verdict ??
                  (local && local.missing.length === 0 && local.misconceptions.length === 0
                    ? "Hai toccato tutti i concetti essenziali senza errori riconosciuti. Ora prova a semplificare ancora o ad aggiungere un esempio."
                    : "Ecco che cosa è emerso dal confronto con i concetti essenziali dell’argomento.")}
              </p>
              <Badge tone={ai ? "azure" : "muted"} className="mt-2.5">
                {ai ? `Analisi AI (${integrations?.model ?? "Claude"})` : "Analisi locale con griglia ATLAS (AI non configurata)"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FeedbackList title="Corretto" tone="ok" items={ai?.correct ?? local?.covered.map((c) => c.concept) ?? []} />
            <FeedbackList title="Da aggiungere" tone="warn" items={ai?.omissions ?? local?.missing.map((m) => `${m.concept}: ${m.explanation}`) ?? []} />
          </div>

          {errors.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <CircleAlert className="h-4 w-4 text-danger" aria-hidden /> Errori da correggere
              </h4>
              <ul className="mt-2 divide-y divide-white/[0.07]">
                {errors.map((e, i) => (
                  <li key={i} className="py-2.5 text-sm leading-relaxed">
                    <span className="block text-fg-muted line-through decoration-danger/70">«{e.claim}»</span>
                    <span className="mt-0.5 block text-fg">{e.correction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ai?.jargon.length ? (
            <p className="flex gap-2 text-sm text-fg-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden /> Termini tecnici non spiegati: {ai.jargon.join(", ")}.
            </p>
          ) : local && local.avgSentenceWords > 25 ? (
            <p className="flex gap-2 text-sm text-fg-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden /> Le frasi sono lunghe in media {local.avgSentenceWords} parole: spezzale, è il cuore della tecnica.
            </p>
          ) : null}

          {ai?.improvedExplanation && (
            <div className="inset-panel p-4">
              <h4 className="text-sm font-semibold text-fg">Una versione semplice e corretta</h4>
              <p className="mt-1.5 max-w-[65ch] text-base leading-relaxed text-fg-reading">{ai.improvedExplanation}</p>
            </div>
          )}

          {followUps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-fg">Per il secondo tentativo, chiediti</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-fg-muted marker:text-fg-subtle">
                {followUps.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="primary" onClick={retry}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Secondo tentativo
          </Button>
        </section>
      )}

      {previous.length > 0 && (
        <div className="border-t border-white/[0.07] pt-4">
          <h4 className="text-sm font-medium text-fg-muted">I tuoi ultimi tentativi su questo argomento</h4>
          <ol className="mt-2 flex flex-wrap gap-2">
            {previous.map((p) => (
              <li key={p.id} className="inline-flex items-baseline gap-1.5 rounded-chip border border-white/[0.08] px-2 py-1 text-xs text-fg-muted">
                <span className="font-semibold tabular-nums text-fg">{p.score}</span>
                <span>{fmt.dateShort(p.date)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function FeedbackList({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-semibold text-fg">
        {tone === "ok" ? <Check className="h-4 w-4 text-success" aria-hidden /> : <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />} {title}
        <span className="text-xs font-normal tabular-nums text-fg-subtle">{items.length}</span>
      </h4>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-fg-muted">
          {items.map((i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", tone === "ok" ? "bg-success" : "bg-warning")} />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
          {tone === "ok" ? <X className="h-4 w-4 text-fg-subtle" aria-hidden /> : <Check className="h-4 w-4 text-fg-subtle" aria-hidden />}
          {tone === "ok" ? "Nessun concetto essenziale riconosciuto." : "Nessuna omissione rilevata."}
        </p>
      )}
    </div>
  );
}
