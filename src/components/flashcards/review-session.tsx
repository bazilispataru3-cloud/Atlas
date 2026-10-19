"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, GalleryVerticalEnd, Keyboard } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { getTopicRef } from "@/data/syllabus";
import { Badge, Button, Card, EmptyState, Kbd, ProgressBar } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { useAtlas, type FlashCard } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { describeInterval, isDue, nextInterval, RATING_LABELS, type Rating } from "@/lib/srs";
import { cn, fmt, pluralize } from "@/lib/utils";

const MAX_PER_SESSION = 100;
/** Time on one card is capped so an idle tab does not inflate study time. */
const MAX_SEC_PER_CARD = 90;

const RATING_STYLE: Record<Rating, string> = {
  1: "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20",
  2: "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
  3: "border-azure-400/35 bg-azure-500/12 text-azure-100 hover:bg-azure-500/22",
  4: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
};

function buildQueue(cards: FlashCard[], deck: string | null, now: Date) {
  return cards
    .filter((c) => !c.suspended && (!deck || c.deck === deck) && isDue(c.srs, now))
    .sort((a, b) => a.srs.due.localeCompare(b.srs.due))
    .slice(0, MAX_PER_SESSION)
    .map((c) => c.id);
}

export function ReviewSession() {
  const params = useSearchParams();
  const deck = params.get("deck");
  const hydrated = useHydrated();
  const cards = useAtlas((s) => s.cards);
  const reviewCard = useAtlas((s) => s.reviewCard);
  const logSession = useAtlas((s) => s.logSession);

  // The queue is frozen when the session starts; "Di nuovo" puts a card back at the end.
  const [queue, setQueue] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState<Record<Rating, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const shownAt = useRef(Date.now());
  const timeByTopic = useRef(new Map<string, { subject: SubjectId; sec: number }>());
  const totalSec = useRef(0);
  const flushed = useRef(false);

  useEffect(() => {
    if (hydrated && queue === null) setQueue(buildQueue(useAtlas.getState().cards, deck, new Date()));
  }, [hydrated, queue, deck]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const currentId = queue?.[pos];
  const card = currentId ? byId.get(currentId) : undefined;
  const done = queue !== null && pos >= queue.length;

  const flush = useCallback(() => {
    if (flushed.current) return;
    const entries = [...timeByTopic.current.entries()].filter(([, v]) => v.sec >= 30);
    for (const [topicId, v] of entries) {
      logSession({ topicId, subject: v.subject, mode: "flashcard", start: new Date(Date.now() - v.sec * 1000).toISOString(), minutes: v.sec / 60 });
    }
    if (entries.length) flushed.current = true;
  }, [logSession]);

  useEffect(() => {
    if (done) flush();
  }, [done, flush]);
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const reveal = useCallback(() => setRevealed(true), []);

  const rate = useCallback(
    (r: Rating) => {
      if (!card || !queue) return;
      const sec = Math.min(MAX_SEC_PER_CARD, (Date.now() - shownAt.current) / 1000);
      totalSec.current += sec;
      if (card.topicId && card.subject) {
        const t = timeByTopic.current.get(card.topicId) ?? { subject: card.subject, sec: 0 };
        t.sec += sec;
        timeByTopic.current.set(card.topicId, t);
      }
      reviewCard(card.id, r);
      setTally((t) => ({ ...t, [r]: t[r] + 1 }));
      if (r === 1) setQueue((q) => (q ? [...q, card.id] : q));
      setPos((p) => p + 1);
      setRevealed(false);
      shownAt.current = Date.now();
    },
    [card, queue, reviewCard],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        reveal();
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        rate(Number(e.key) as Rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, reveal, rate]);

  if (!hydrated || queue === null) {
    return <div className="mx-auto mt-20 h-64 max-w-2xl animate-pulse rounded-3xl bg-white/[0.03]" />;
  }

  const answered = tally[1] + tally[2] + tally[3] + tally[4];
  const header = (
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" size="sm" href="/flashcard"><ArrowLeft className="h-4 w-4" /> Flashcard</Button>
      {deck && <Badge tone="muted">Mazzo: {deck}</Badge>}
    </div>
  );

  if (!queue.length) {
    return (
      <div className="mx-auto max-w-2xl pb-16">
        {header}
        <EmptyState
          className="mt-10"
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
          title="Nessuna carta da ripassare adesso"
          description="Hai completato i ripassi in scadenza. Le prossime carte torneranno secondo il calendario della ripetizione dilazionata."
          action={<Button variant="secondary" href="/flashcard">Torna alle flashcard</Button>}
        />
      </div>
    );
  }

  if (done) {
    const retained = (tally[3] + tally[4]) / Math.max(1, answered);
    return (
      <div className="mx-auto max-w-2xl pb-16">
        {header}
        <Card className="mt-8 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
          <h1 className="mt-4 font-display text-4xl text-fg">Ripasso completato</h1>
          <p className="mt-2 text-[14px] text-fg-muted">
            {pluralize(answered, "risposta", "risposte")} in {fmt.minutes(totalSec.current / 60)} · ricordate al primo colpo o con poco sforzo: {fmt.percent(retained)}
          </p>
          <div className="mt-6 grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as Rating[]).map((r) => (
              <div key={r} className={cn("rounded-2xl border p-3", RATING_STYLE[r])}>
                <div className="font-mono text-2xl">{tally[r]}</div>
                <div className="text-[12px] opacity-80">{RATING_LABELS[r]}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="primary" href="/flashcard">Torna alle flashcard</Button>
            <Button variant="secondary" href="/">Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!card) {
    // The card was deleted elsewhere: skip it.
    setTimeout(() => setPos((p) => p + 1), 0);
    return null;
  }

  const ref = card.topicId ? getTopicRef(card.topicId) : undefined;
  const remaining = queue.length - pos;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      {header}
      <div className="mt-6 flex items-center gap-3">
        <ProgressBar value={pos / queue.length} className="flex-1" label="Avanzamento del ripasso" />
        <span className="font-mono text-[12px] text-fg-subtle">{pluralize(remaining, "rimasta", "rimaste")}</span>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-6 py-3 text-[12px] text-fg-subtle">
          <GalleryVerticalEnd className="h-3.5 w-3.5" /> {card.deck}
          {ref && <span>· {ref.subject.name}</span>}
          {card.srs.lapses > 0 && <Badge tone="warning" className="ml-auto">Sbagliata {pluralize(card.srs.lapses, "volta", "volte")}</Badge>}
        </div>
        <div className="min-h-[220px] px-6 py-10 text-center">
          <div key={`${card.id}-f`} className="animate-fade-up text-[22px] font-medium leading-snug text-fg">
            <RichText text={card.front} />
          </div>
          {revealed && (
            <div key={`${card.id}-b`} className="mx-auto mt-8 max-w-xl animate-fade-up border-t border-white/[0.08] pt-8 text-[16.5px] leading-relaxed text-fg-muted">
              <RichText text={card.back} />
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.06] p-4">
          {!revealed ? (
            <Button variant="primary" size="lg" className="w-full" onClick={reveal} autoFocus>
              <Eye className="h-4 w-4" /> Mostra risposta <Kbd>Spazio</Kbd>
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([1, 2, 3, 4] as Rating[]).map((r) => (
                <button key={r} onClick={() => rate(r)} className={cn("rounded-2xl border px-3 py-3 text-center transition active:scale-[0.98]", RATING_STYLE[r])}>
                  <div className="text-[14px] font-semibold">{RATING_LABELS[r]}</div>
                  <div className="mt-0.5 text-[11.5px] opacity-75">{describeInterval(nextInterval(card.srs, r))}</div>
                  <div className="mt-1 hidden font-mono text-[10px] opacity-60 sm:block">{r}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
      <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-fg-subtle">
        <Keyboard className="h-3.5 w-3.5" /> Spazio per girare la carta, 1–4 per valutare. «Di nuovo» la ripropone alla fine di questa sessione.
      </p>
    </div>
  );
}
