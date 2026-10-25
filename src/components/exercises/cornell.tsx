"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Check, Layers, ListChecks, RotateCcw, Save } from "lucide-react";
import { Button, Notice, ProgressBar, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { getTopicRef } from "@/data/syllabus";
import { useAtlas } from "@/lib/store";
import { cn, fmt, pluralize } from "@/lib/utils";

const SHEET_FIELD =
  "block w-full resize-y bg-transparent px-4 pb-3 pt-1 text-base leading-relaxed text-fg placeholder:text-fg-subtle transition-[background-color,box-shadow] duration-150 focus:bg-white/[0.025] focus:outline-none focus:shadow-[inset_0_0_0_2px_rgb(61_139_255/0.7)] sm:text-sm";

/** Cue lines written by the student, without bullets. */
const cueList = (cues: string) =>
  cues
    .split("\n")
    .map((l) => l.replace(/^\s*([•\-*]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 2);

const RATINGS = [
  { value: 0, label: "Non la sapevo" },
  { value: 0.5, label: "In parte" },
  { value: 1, label: "Corretta" },
] as const;

/** Cornell notes: cue column, notes column, summary (autosaved per topic), plus a guided review. */
export function CornellEditor({ topicId, seedCues }: { topicId: string; seedCues?: string[] }) {
  const saved = useAtlas((s) => s.cornell[topicId]);
  const save = useAtlas((s) => s.saveCornell);
  const recordRecall = useAtlas((s) => s.recordRecallScore);
  const addCards = useAtlas((s) => s.addCards);
  const [cues, setCues] = useState(saved?.cues ?? "");
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const [summary, setSummary] = useState(saved?.summary ?? "");
  const ids = useId();

  // Guided review
  const [review, setReview] = useState<{ cues: string[]; i: number; answers: string[]; ratings: (number | null)[]; shown: boolean } | null>(null);
  const qRef = useRef<HTMLHeadingElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const cuesRef = useRef<HTMLTextAreaElement>(null);
  const reviewBtnRef = useRef<HTMLButtonElement>(null);

  // Autosave only real edits (an unchanged sheet is never written, so opening the editor creates nothing).
  useEffect(() => {
    if (cues === (saved?.cues ?? "") && notes === (saved?.notes ?? "") && summary === (saved?.summary ?? "")) return;
    const t = setTimeout(() => save(topicId, { cues, notes, summary }), 800);
    return () => clearTimeout(t);
  }, [cues, notes, summary, topicId, save, saved]);

  const questions = cueList(cues);
  const canReview = questions.length > 0 && notes.trim().length > 0;

  const startReview = () => {
    save(topicId, { cues, notes, summary });
    setReview({ cues: questions, i: 0, answers: questions.map(() => ""), ratings: questions.map(() => null), shown: false });
    requestAnimationFrame(() => qRef.current?.focus());
  };

  const rate = (v: number) => {
    if (!review) return;
    const ratings = review.ratings.map((r, k) => (k === review.i ? v : r));
    if (review.i < review.cues.length - 1) {
      setReview({ ...review, ratings, i: review.i + 1, shown: false });
      requestAnimationFrame(() => qRef.current?.focus());
    } else {
      setReview({ ...review, ratings, i: review.cues.length, shown: false });
      const avg = ratings.reduce<number>((a, r) => a + (r ?? 0), 0) / ratings.length;
      recordRecall(topicId, avg);
      requestAnimationFrame(() => doneRef.current?.focus());
    }
  };

  const exitReview = () => {
    setReview(null);
    requestAnimationFrame(() => reviewBtnRef.current?.focus());
  };

  const makeCards = () => {
    if (!review) return;
    const ref = getTopicRef(topicId);
    const items = review.cues.map((q, k) => ({ front: q, back: review.answers[k].trim() })).filter((c) => c.back);
    const n = addCards(items.map((c) => ({ ...c, topicId, subject: ref?.subject.id, deck: ref?.topic.title ?? "Metodo Cornell", origin: "manuale" as const })));
    toast(n ? `${pluralize(n, "flashcard aggiunta", "flashcard aggiunte")} al ripasso` : "Le carte sono già nel tuo mazzo", {
      tone: n ? "success" : "info",
      description: n ? `Mazzo «${ref?.topic.title ?? "Metodo Cornell"}», nella pagina Flashcard.` : undefined,
    });
  };

  if (review) {
    const done = review.i >= review.cues.length;
    if (done) {
      const avg = review.ratings.reduce<number>((a, r) => a + (r ?? 0), 0) / review.ratings.length;
      const withAnswer = review.answers.filter((a) => a.trim()).length;
      return (
        <div className="space-y-5">
          <div>
            <h3 ref={doneRef} tabIndex={-1} className="text-3xl font-semibold tracking-[-0.02em] text-fg tabular-nums focus-visible:outline-offset-4">
              {Math.round(avg * 100)}%
            </h3>
            <p className="mt-1 max-w-[60ch] text-base text-fg-muted">
              di risposte corrette su {pluralize(review.cues.length, "domanda guida", "domande guida")}. Il risultato conta nei progressi dell’argomento.
            </p>
          </div>
          <ul className="divide-y divide-white/[0.07]">
            {review.cues.map((q, k) => {
              const r = review.ratings[k] ?? 0;
              return (
                <li key={k} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                  <span className="text-fg">{q}</span>
                  <span className={cn("shrink-0 text-xs font-medium", r === 1 ? "text-green-300" : r === 0.5 ? "text-orange-300" : "text-red-300")}>{RATINGS.find((x) => x.value === r)?.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={startReview}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Ripassa di nuovo
            </Button>
            {withAnswer > 0 && (
              <Button variant="secondary" onClick={makeCards}>
                <Layers className="h-4 w-4" aria-hidden /> Crea {pluralize(withAnswer, "flashcard", "flashcard")} con le tue risposte
              </Button>
            )}
            <Button variant="ghost" onClick={exitReview}>
              Torna agli appunti
            </Button>
          </div>
        </div>
      );
    }
    const q = review.cues[review.i];
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">
            Domanda guida {review.i + 1} di {review.cues.length}
          </p>
          <Button variant="ghost" size="sm" onClick={exitReview}>
            Interrompi il ripasso
          </Button>
        </div>
        <ProgressBar value={review.i / review.cues.length} label="Avanzamento del ripasso" />
        <h3 ref={qRef} tabIndex={-1} className="max-w-[60ch] text-xl font-semibold leading-snug text-fg text-balance focus-visible:outline-offset-4">
          {q}
        </h3>
        <div>
          <label htmlFor={`${ids}-ans`} className="mb-1.5 block text-sm font-medium text-fg-muted">
            Rispondi a voce o per iscritto, senza guardare gli appunti
          </label>
          <Textarea
            id={`${ids}-ans`}
            rows={4}
            value={review.answers[review.i]}
            onChange={(e) => setReview({ ...review, answers: review.answers.map((a, k) => (k === review.i ? e.target.value : a)) })}
            placeholder="La tua risposta (facoltativa se rispondi a voce)"
          />
        </div>
        {!review.shown ? (
          <Button
            variant="primary"
            onClick={() => {
              setReview({ ...review, shown: true });
              requestAnimationFrame(() => notesRef.current?.focus());
            }}
          >
            <BookOpen className="h-4 w-4" aria-hidden /> Mostra i miei appunti
          </Button>
        ) : (
          <div className="animate-fade-in space-y-4">
            <div ref={notesRef} tabIndex={-1} className="inset-panel max-h-72 overflow-y-auto p-4 focus-visible:outline-offset-2">
              <p className="text-sm font-medium text-fg-muted">I tuoi appunti</p>
              <p className="mt-1.5 whitespace-pre-line text-base leading-relaxed text-fg-reading">{notes}</p>
            </div>
            <div role="group" aria-label="Com’è andata la tua risposta?">
              <p className="text-sm text-fg-muted">Com’è andata la tua risposta?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {RATINGS.map((r) => (
                  <Button key={r.label} variant={r.value === 1 ? "primary" : "secondary"} className="h-11" onClick={() => rate(r.value)}>
                    {r.value === 1 && <Check className="h-4 w-4" aria-hidden />} {r.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[60ch] text-base leading-relaxed text-fg-muted">
          Scrivi gli appunti, poi una domanda guida per ogni blocco e, in fondo, la sintesi con parole tue. Poi ripassa: ATLAS copre gli appunti e ti fa una domanda alla volta.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-subtle" aria-live="polite">
            {saved?.updatedAt ? `Salvato ${fmt.dateShort(saved.updatedAt)}` : "Salvataggio automatico"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              save(topicId, { cues, notes, summary });
              toast("Note Cornell salvate", { tone: "success" });
            }}
          >
            <Save className="h-4 w-4" aria-hidden /> Salva
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-white/[0.1] bg-ink-950/60">
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* Phones: notes first (they are written first), cues below; from md the classic sheet, cues on the left. */}
          <div className="border-azure-400/25 md:border-r">
            <label htmlFor={`${ids}-cues`} className="block px-4 pt-3 text-ui font-medium text-fg-muted">
              Domande guida
            </label>
            <textarea
              ref={cuesRef}
              id={`${ids}-cues`}
              value={cues}
              onChange={(e) => setCues(e.target.value)}
              rows={10}
              className={SHEET_FIELD}
              placeholder={"Una domanda per riga, es.\nPerché il ciclo si ferma senza O₂?"}
            />
            {!cues.trim() && seedCues && seedCues.length > 0 && (
              <div className="px-4 pb-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="-ml-2"
                  onClick={() => {
                    setCues(seedCues.map((c) => `• ${c}`).join("\n"));
                    requestAnimationFrame(() => cuesRef.current?.focus());
                  }}
                >
                  <ListChecks className="h-4 w-4" aria-hidden /> Mostra esempi dalla lezione
                </Button>
              </div>
            )}
          </div>
          <div className="order-first border-b border-azure-400/25 md:order-none md:border-b-0">
            <label htmlFor={`${ids}-notes`} className="block px-4 pt-3 text-ui font-medium text-fg-muted">
              Appunti
            </label>
            <textarea id={`${ids}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={12} className={SHEET_FIELD} placeholder="Appunti della lezione o della lettura: frasi brevi, simboli, esempi." />
          </div>
        </div>
        <div className="border-t border-azure-400/25">
          <label htmlFor={`${ids}-sum`} className="block px-4 pt-3 text-ui font-medium text-fg-muted">
            Sintesi
          </label>
          <textarea id={`${ids}-sum`} value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className={SHEET_FIELD} placeholder="3–5 righe con parole tue." />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button ref={reviewBtnRef} variant="primary" onClick={startReview} disabled={!canReview}>
          <ListChecks className="h-4 w-4" aria-hidden /> Ripassa con le domande guida
        </Button>
        {!canReview && <span className="text-sm text-fg-muted">Scrivi almeno una domanda guida e i tuoi appunti per ripassare.</span>}
      </div>
      {canReview && questions.length > 0 && !summary.trim() && <Notice tone="info">Prima del ripasso scrivi la sintesi: riassumere con parole tue ti obbliga a scegliere l’essenziale.</Notice>}
    </div>
  );
}
