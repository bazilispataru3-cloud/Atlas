"use client";

import { useState } from "react";
import { Eye, Check, RotateCcw, Lightbulb, ChevronRight, GalleryVerticalEnd, Plus } from "lucide-react";
import { Badge, Button, Card, ProgressBar, Textarea } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import type { GuidedProblem, SubjectId } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const done = scores.every((s) => s !== null);
  const total = scores.reduce<number>((a, s) => a + (s ?? 0), 0) / Math.max(1, items.length);

  const rate = (v: number) => {
    const next = scores.map((s, k) => (k === i ? v : s));
    setScores(next);
    if (next.every((s) => s !== null)) onComplete?.(next.reduce<number>((a, s) => a + (s ?? 0), 0) / items.length);
    else if (i < items.length - 1) setTimeout(() => setI(i + 1), 250);
  };

  const item = items[i];
  return (
    <div className="space-y-4">
      {intro && <p className="text-[13.5px] leading-relaxed text-fg-muted">{intro}</p>}
      <div className="flex items-center gap-3">
        <ProgressBar value={scores.filter((s) => s !== null).length / items.length} tone="fast" />
        <span className="shrink-0 font-mono text-[12px] text-fg-subtle">{scores.filter((s) => s !== null).length}/{items.length}</span>
      </div>
      <Card className="p-5">
        <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-wide text-fg-subtle">
          {label} {i + 1}
          {item.context && <Badge tone="muted">{item.context}</Badge>}
        </div>
        <p className="mt-2 text-[16px] leading-relaxed text-fg"><RichText text={item.prompt} /></p>
        <Textarea
          className="mt-4"
          rows={4}
          value={text[i]}
          onChange={(e) => setText(text.map((t, k) => (k === i ? e.target.value : t)))}
          placeholder="Scrivi prima la tua risposta, senza guardare."
          disabled={revealed[i]}
          aria-label="La tua risposta"
        />
        {!revealed[i] ? (
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" onClick={() => setRevealed(revealed.map((r, k) => (k === i ? true : r)))} disabled={!text[i].trim()}>
              <Eye className="h-4 w-4" /> Mostra la risposta
            </Button>
          </div>
        ) : (
          <div className="mt-4 animate-fade-in">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4">
              <div className="text-[11.5px] uppercase tracking-wide text-emerald-200/80">Risposta di riferimento</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted"><RichText text={item.answer} /></p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-fg-subtle">Com’è andata?</span>
              {[
                { v: 0, l: "Non la sapevo" },
                { v: 0.5, l: "In parte" },
                { v: 1, l: "Corretta" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => rate(o.v)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[12.5px] transition",
                    scores[i] === o.v ? "border-azure-400/60 bg-azure-500/15 text-fg" : "border-white/10 text-fg-muted hover:border-white/20 hover:text-fg",
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {items.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Vai a ${label.toLowerCase()} ${k + 1}`} className={cn("h-2 w-6 rounded-full", k === i ? "bg-azure-400" : scores[k] === null ? "bg-white/10" : scores[k]! >= 1 ? "bg-emerald-400/70" : scores[k]! > 0 ? "bg-amber-400/70" : "bg-red-400/70")} />
          ))}
        </div>
        {i < items.length - 1 && (
          <Button variant="ghost" size="sm" onClick={() => setI(i + 1)}>
            Successiva <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      {done && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13.5px] text-fg-muted">
          Punteggio di richiamo: <span className="font-mono text-fg">{Math.round(total * 100)}%</span>. Le domande «non la sapevo» sono le prime da ripassare domani.
        </div>
      )}
    </div>
  );
}

/** Quick flip cards (no scheduling) with "add to my deck". */
export function FlipCards({ cards, topicId, subject, deck }: { cards: { id: string; front: string; back: string }[]; topicId?: string; subject?: SubjectId; deck: string }) {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const addCards = useAtlas((s) => s.addCards);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-fg-subtle">Prova a rispondere, poi tocca la carta per girarla.</p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const n = addCards(cards.map((c) => ({ front: c.front, back: c.back, topicId, subject, deck, origin: "atlas" as const })));
            toast(n ? `${n} flashcard aggiunte al ripasso dilazionato` : "Le carte sono già nel tuo mazzo", { tone: n ? "success" : "info" });
          }}
        >
          <Plus className="h-4 w-4" /> <GalleryVerticalEnd className="h-4 w-4" /> Aggiungi al mio mazzo
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const f = flipped.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => setFlipped((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
              className="group relative h-44 [perspective:1000px]"
              aria-label={f ? `Retro: ${c.back}` : `Fronte: ${c.front}`}
            >
              <div className={cn("relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]", f && "[transform:rotateY(180deg)]")}>
                <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-ink-800 p-4 text-left [backface-visibility:hidden]">
                  <span className="text-[10.5px] uppercase tracking-wide text-teal-300/80">Domanda</span>
                  <span className="text-[14.5px] leading-snug text-fg">{c.front}</span>
                  <span className="text-[11px] text-fg-subtle">tocca per girare</span>
                </div>
                <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-teal-300/25 bg-teal-400/[0.07] p-4 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="text-[10.5px] uppercase tracking-wide text-teal-200/80">Risposta</span>
                  <span className="text-[14px] leading-snug text-fg">{c.back}</span>
                  <span />
                </div>
              </div>
            </button>
          );
        })}
      </div>
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
  return (
    <Card className="p-5">
      <div className="text-[11.5px] uppercase tracking-wide text-fg-subtle">Problema {n}</div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-fg">{p.statement}</p>
      <Textarea className="mt-3" rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Imposta la soluzione: dati, formula, calcolo, unità di misura." aria-label="La tua soluzione" />
      <ol className="mt-3 space-y-2">
        {p.steps.slice(0, shown).map((s, i) => (
          <li key={i} className="animate-fade-in rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-[13.5px]">
            <div className="flex items-center gap-2 text-fg-muted"><Lightbulb className="h-3.5 w-3.5 text-amber-300" /> {s.hint}</div>
            <div className="mt-1 font-mono text-[13px] text-fg">{s.result}</div>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown < p.steps.length && !solved && (
          <Button size="sm" variant="secondary" onClick={() => setShown(shown + 1)}>
            <Lightbulb className="h-4 w-4" /> {shown === 0 ? "Primo suggerimento" : "Suggerimento successivo"}
          </Button>
        )}
        {!solved ? (
          <Button size="sm" variant="primary" onClick={() => { setSolved(true); setShown(p.steps.length); }}>
            <Check className="h-4 w-4" /> Mostra soluzione
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { setSolved(false); setShown(0); setAnswer(""); }}>
            <RotateCcw className="h-4 w-4" /> Riprova
          </Button>
        )}
      </div>
      {solved && <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-3 text-[14px] text-fg">Soluzione: {p.answer}</div>}
    </Card>
  );
}
