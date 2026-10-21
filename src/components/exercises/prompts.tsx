"use client";

import { useRef, useState } from "react";
import { Eye, Check, RotateCcw, Lightbulb, ChevronRight, Plus, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, ProgressBar, Textarea } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import type { GuidedProblem, SubjectId } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";

/** True on devices with a mouse or trackpad: there we can focus text fields without popping a keyboard. */
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const SELF_RATINGS = [
  { v: 0, l: "Non la sapevo", dot: "bg-danger" },
  { v: 0.5, l: "In parte", dot: "bg-warning" },
  { v: 1, l: "Corretta", dot: "bg-success" },
] as const;

/**
 * Generic "generate, then compare" exercise used for active recall, elaborative
 * interrogation and self-explanation. The student writes first, then reveals the
 * model answer and rates their own answer (0 / ½ / 1).
 */
export function RevealPrompts({
  items,
  label = "Domanda",
  intro,
  onComplete,
}: {
  items: { prompt: string; answer: string; context?: string }[];
  label?: string;
  intro?: string;
  onComplete?: (score01: number) => void;
}) {
  const [i, setI] = useState(0);
  const [text, setText] = useState<string[]>(() => items.map(() => ""));
  const [revealed, setRevealed] = useState<boolean[]>(() => items.map(() => false));
  const [scores, setScores] = useState<(number | null)[]>(() => items.map(() => null));
  const cardRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const done = scores.every((s) => s !== null);
  const rated = scores.filter((s) => s !== null).length;
  const total = scores.reduce<number>((a, s) => a + (s ?? 0), 0) / Math.max(1, items.length);

  /** Moves to another prompt and keeps the keyboard user in the exercise. */
  const goTo = (k: number) => {
    setI(k);
    requestAnimationFrame(() => {
      if (finePointer() && fieldRef.current && !fieldRef.current.disabled) fieldRef.current.focus({ preventScroll: true });
      else cardRef.current?.focus({ preventScroll: true });
    });
  };

  const rate = (v: number) => {
    const next = scores.map((s, k) => (k === i ? v : s));
    setScores(next);
    if (next.every((s) => s !== null)) onComplete?.(next.reduce<number>((a, s) => a + (s ?? 0), 0) / items.length);
    else if (i < items.length - 1) setTimeout(() => goTo(i + 1), 250);
  };

  const reveal = () => {
    setRevealed(revealed.map((r, k) => (k === i ? true : r)));
    requestAnimationFrame(() => answerRef.current?.focus({ preventScroll: true }));
  };

  const item = items[i];
  return (
    <div className="space-y-4">
      {intro && <p className="max-w-prose text-sm leading-relaxed text-fg-muted">{intro}</p>}
      <div className="flex items-center gap-3">
        <ProgressBar value={rated / items.length} label={`${label}: ${rated} valutate su ${items.length}`} />
        <span className="shrink-0 text-xs tabular-nums text-fg-muted">
          {rated} di {items.length}
        </span>
      </div>
      <Card className="p-5 outline-none sm:p-6" ref={cardRef as never} tabIndex={-1} aria-label={`${label} ${i + 1} di ${items.length}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
          <span>
            {label} {i + 1}
          </span>
          {item.context && <Badge tone="muted">{item.context}</Badge>}
        </div>
        <div className="mt-2 max-w-[65ch] text-base leading-relaxed text-fg">
          <RichText text={item.prompt} />
        </div>
        <Textarea
          ref={fieldRef}
          className="mt-4"
          rows={4}
          value={text[i]}
          onChange={(e) => setText(text.map((t, k) => (k === i ? e.target.value : t)))}
          placeholder="Scrivi prima la tua risposta, senza guardare."
          disabled={revealed[i]}
          aria-label="La tua risposta"
        />
        {!revealed[i] ? (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {!text[i].trim() && <span className="text-xs text-fg-subtle">Scrivi qualcosa per poter confrontare</span>}
            <Button variant="secondary" onClick={reveal} disabled={!text[i].trim()}>
              <Eye className="h-4 w-4" aria-hidden /> Mostra la risposta
            </Button>
          </div>
        ) : (
          <div className="mt-4 animate-fade-in">
            <div ref={answerRef} tabIndex={-1} className="rounded-control border border-success/20 bg-success/[0.05] p-4 outline-none focus-visible:outline-2">
              <div className="text-xs font-medium text-fg-muted">Risposta di riferimento</div>
              <div className="mt-1.5 max-w-prose text-sm leading-relaxed text-fg-reading">
                <RichText text={item.answer} />
              </div>
            </div>
            <fieldset className="mt-4">
              <legend className="mb-2 text-ui text-fg-muted">Com’è andata?</legend>
              <div className="flex flex-wrap gap-2">
                {SELF_RATINGS.map((o) => {
                  const on = scores[i] === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => rate(o.v)}
                      aria-pressed={on}
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-control border px-3.5 text-sm transition-[background-color,border-color,color] duration-150 active:translate-y-px sm:h-9",
                        on ? "border-azure-400/60 bg-azure-500/15 text-fg" : "border-white/[0.1] text-fg-muted hover:border-white/[0.2] hover:text-fg",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", o.dot)} aria-hidden />
                      {o.l}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}
      </Card>
      <div className="flex items-center justify-between gap-3">
        <ol className="flex flex-wrap gap-0.5" aria-label={`Vai a ${label.toLowerCase()}`}>
          {items.map((_, k) => {
            const s = scores[k];
            const status = s === null ? "da fare" : s >= 1 ? "corretta" : s > 0 ? "in parte" : "non la sapevi";
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => goTo(k)}
                  aria-current={k === i ? "step" : undefined}
                  aria-label={`${label} ${k + 1}, ${status}`}
                  className="grid h-6 w-8 place-items-center rounded-md"
                >
                  <span
                    className={cn(
                      "h-1.5 w-6 rounded-full transition-colors duration-150",
                      k === i ? "bg-azure-400" : s === null ? "bg-white/[0.12]" : s >= 1 ? "bg-success/80" : s > 0 ? "bg-warning/80" : "bg-danger/80",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ol>
        {i < items.length - 1 && (
          <Button variant="ghost" size="sm" onClick={() => goTo(i + 1)}>
            Successiva <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
      {done && (
        <div className="inset-panel animate-fade-in p-4 text-sm leading-relaxed text-fg-muted" role="status">
          Punteggio di richiamo: <span className="font-semibold text-fg">{Math.round(total * 100)}%</span>. Le domande che non sapevi sono le prime da ripassare domani.
        </div>
      )}
    </div>
  );
}

/** Quick flip cards (no scheduling) with "add to my deck". */
export function FlipCards({
  cards,
  topicId,
  subject,
  deck,
  showAddAction = true,
}: {
  cards: { id: string; front: string; back: string }[];
  topicId?: string;
  subject?: SubjectId;
  deck: string;
  /** Hide the instruction and the "Aggiungi al mio mazzo" button when the page already offers them. */
  showAddAction?: boolean;
}) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const addCards = useAtlas((s) => s.addCards);
  return (
    <div className="space-y-4">
      {showAddAction && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-fg-muted">
            Prova a rispondere, poi <span className="[@media(hover:hover)]:hidden">tocca</span>
            <span className="hidden [@media(hover:hover)]:inline">fai clic su</span> la carta per girarla.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="h-10 sm:h-8"
            onClick={() => {
              const n = addCards(cards.map((c) => ({ front: c.front, back: c.back, topicId, subject, deck, origin: "atlas" as const })));
              toast(n ? `${pluralize(n, "flashcard aggiunta", "flashcard aggiunte")} al ripasso` : "Le carte sono già nel tuo mazzo", {
                tone: n ? "success" : "info",
                description: n ? `Mazzo «${deck}», nella pagina Flashcard.` : undefined,
              });
            }}
          >
            <Plus className="h-4 w-4" aria-hidden /> Aggiungi al mio mazzo
          </Button>
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const f = flipped.has(c.id);
          return (
            <li key={c.id} className="[perspective:1200px]">
              <button
                type="button"
                onClick={() =>
                  setFlipped((s) => {
                    const n = new Set(s);
                    if (n.has(c.id)) n.delete(c.id);
                    else n.add(c.id);
                    return n;
                  })
                }
                aria-pressed={f}
                className="group grid h-full w-full rounded-card text-left transition-transform duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] aria-pressed:[transform:rotateY(180deg)]"
              >
                <span
                  aria-hidden={f}
                  className="flex min-h-44 flex-col justify-between gap-3 rounded-card border border-white/[0.08] bg-ink-800 p-4 transition-colors duration-150 [backface-visibility:hidden] [grid-area:1/1] group-hover:border-white/[0.15]"
                >
                  <span className="text-xs text-fg-subtle">Domanda</span>
                  <span className="text-base leading-snug text-fg">{c.front}</span>
                  <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
                    <RotateCcw className="h-3 w-3" aria-hidden /> Gira la carta
                  </span>
                </span>
                <span
                  aria-hidden={!f}
                  className="flex min-h-44 flex-col gap-3 rounded-card border border-azure-400/25 bg-[linear-gradient(180deg,rgb(26_102_255/0.08),rgb(17_20_26/0.95))] p-4 [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)]"
                >
                  <span className="text-xs text-fg-muted">Risposta</span>
                  <span className="text-sm leading-relaxed text-fg-reading">{c.back}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Guided problems: progressive hints, then the solution. */
export function GuidedProblems({ problems }: { problems: GuidedProblem[] }) {
  return (
    <div className="space-y-4">
      {problems.map((p, n) => (
        <GuidedProblemCard key={p.id} p={p} n={n + 1} />
      ))}
    </div>
  );
}

function GuidedProblemCard({ p, n }: { p: GuidedProblem; n: number }) {
  const [shown, setShown] = useState(0);
  const [answer, setAnswer] = useState("");
  const [solved, setSolved] = useState(false);
  const solutionRef = useRef<HTMLDivElement>(null);
  const solveRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = `problema-${p.id}`;
  return (
    <Card as="article" className="p-5 sm:p-6" aria-labelledby={`${fieldId}-t`}>
      <h3 id={`${fieldId}-t`} className="text-xs font-medium text-fg-subtle">
        Problema {n}
      </h3>
      <p className="mt-1.5 max-w-[65ch] text-base leading-relaxed text-fg">{p.statement}</p>
      <Textarea
        ref={fieldRef}
        className="mt-3"
        rows={2}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Imposta la soluzione: dati, formula, calcolo, unità di misura."
        aria-label={`La tua soluzione al problema ${n}`}
      />
      <ol className="mt-3 space-y-2" aria-live="polite">
        {p.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="inset-panel animate-fade-in p-3 text-sm">
            <div className="flex items-start gap-2 text-fg-muted">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-azure-300" aria-hidden />
              <span>
                <span className="sr-only">Suggerimento {i + 1}: </span>
                {s.hint}
              </span>
            </div>
            <div className="mt-1 pl-5 font-mono text-ui text-fg">{s.result}</div>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown < p.steps.length && !solved && (
          <Button
            size="sm"
            variant="secondary"
            className="h-10 sm:h-8"
            onClick={() => {
              const next = shown + 1;
              setShown(next);
              // The hint button disappears after the last hint: focus moves to "Mostra soluzione".
              if (next >= p.steps.length) requestAnimationFrame(() => solveRef.current?.focus({ preventScroll: true }));
            }}
          >
            <Lightbulb className="h-4 w-4" aria-hidden /> {shown === 0 ? "Primo suggerimento" : `Suggerimento successivo (${shown + 1} di ${p.steps.length})`}
          </Button>
        )}
        {!solved ? (
          <Button
            ref={solveRef}
            size="sm"
            variant="primary"
            className="h-10 sm:h-8"
            onClick={() => {
              setSolved(true);
              setShown(p.steps.length);
              requestAnimationFrame(() => solutionRef.current?.focus({ preventScroll: true }));
            }}
          >
            <Check className="h-4 w-4" aria-hidden /> Mostra la soluzione
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-10 sm:h-8"
            onClick={() => {
              setSolved(false);
              setShown(0);
              setAnswer("");
              requestAnimationFrame(() => fieldRef.current?.focus({ preventScroll: true }));
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Riprova da capo
          </Button>
        )}
      </div>
      {solved && (
        <div
          ref={solutionRef}
          tabIndex={-1}
          role="status"
          className="mt-3 flex animate-fade-in gap-2.5 rounded-control border border-success/25 bg-success/[0.06] p-3 text-sm text-fg outline-none focus-visible:outline-2"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <span>
            <span className="font-medium">Soluzione:</span> {p.answer}
          </span>
        </div>
      )}
    </Card>
  );
}
