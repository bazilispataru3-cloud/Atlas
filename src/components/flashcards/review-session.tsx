"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, Eye, GalleryVerticalEnd, ListChecks, X } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { getTopicRef } from "@/data/syllabus";
import { questionsFor } from "@/data/questions";
import { Badge, Button, EmptyState, Kbd, Meridian, Modal, Skeleton } from "@/components/ui/primitives";
import { RichText } from "@/components/ui/rich-text";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { formatDay, formatDuration } from "@/components/quiz/format";
import { useAtlas, type FlashCard } from "@/lib/store";
import { useFocusMode, useHydrated, useReducedMotion } from "@/lib/hooks";
import { describeNextReview, isDue, nextInterval, RATING_HINTS, RATING_LABELS, type Rating } from "@/lib/srs";
import { cn, pluralize } from "@/lib/utils";

const MAX_PER_SESSION = 100;
/** Time on one card is capped so an idle tab does not inflate study time. */
const MAX_SEC_PER_CARD = 90;
const RATINGS: Rating[] = [1, 2, 3, 4];
/** A state dot next to each label: the colour is never the only cue (label + criterion + interval). */
const RATING_DOT: Record<Rating, string> = { 1: "bg-danger", 2: "bg-warning", 3: "bg-azure-400", 4: "bg-success" };

function buildQueue(cards: FlashCard[], deck: string | null, now: Date) {
  return cards
    .filter((c) => !c.suspended && (!deck || c.deck === deck) && isDue(c.srs, now))
    .sort((a, b) => a.srs.due.localeCompare(b.srs.due))
    .slice(0, MAX_PER_SESSION)
    .map((c) => c.id);
}

/** The next day with reviews after `now`, and how many cards fall on it. */
function nextReviewDay(cards: FlashCard[], deck: string | null, now: Date) {
  const pending = cards.filter((c) => !c.suspended && (!deck || c.deck === deck) && !isDue(c.srs, now));
  if (!pending.length) return null;
  const first = pending.reduce((a, c) => (c.srs.due < a.srs.due ? c : a)).srs.due;
  const day = new Date(first).toDateString();
  return { date: first, count: pending.filter((c) => new Date(c.srs.due).toDateString() === day).length };
}

type Confirmation = { n: number; rating: Rating; text: string };

export function ReviewSession() {
  const params = useSearchParams();
  const router = useRouter();
  const deck = params.get("deck");
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const cards = useAtlas((s) => s.cards);
  const reviewCard = useAtlas((s) => s.reviewCard);
  const logSession = useAtlas((s) => s.logSession);

  // The queue is frozen when the session starts; a card that must come back today goes to the end.
  const [queue, setQueue] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState<Record<Rating, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const shownAt = useRef(Date.now());
  const timeByTopic = useRef(new Map<string, { subject: SubjectId; sec: number }>());
  const topicCount = useRef(new Map<string, number>());
  const firstRating = useRef(new Map<string, Rating>());
  const totalSec = useRef(0);
  const flushed = useRef(false);

  const revealRef = useRef<HTMLButtonElement>(null);
  const goodRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (hydrated && queue === null) setQueue(buildQueue(useAtlas.getState().cards, deck, new Date()));
  }, [hydrated, queue, deck]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const currentId = queue?.[pos];
  const card = currentId ? byId.get(currentId) : undefined;
  const done = queue !== null && queue.length > 0 && pos >= queue.length;
  const inSession = queue !== null && queue.length > 0 && !done;

  // Nothing but the card while reviewing: the shell hides its navigation.
  useFocusMode(inSession);

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

  // A card deleted elsewhere while the session is open is skipped.
  useEffect(() => {
    if (inSession && currentId && !card) setPos((p) => p + 1);
  }, [inSession, currentId, card]);

  const reveal = useCallback(() => setRevealed(true), []);

  const rate = useCallback(
    (r: Rating) => {
      if (!card || !queue || !revealed) return;
      const sec = Math.min(MAX_SEC_PER_CARD, (Date.now() - shownAt.current) / 1000);
      totalSec.current += sec;
      if (card.topicId && card.subject) {
        const t = timeByTopic.current.get(card.topicId) ?? { subject: card.subject, sec: 0 };
        t.sec += sec;
        timeByTopic.current.set(card.topicId, t);
      }
      if (card.topicId) topicCount.current.set(card.topicId, (topicCount.current.get(card.topicId) ?? 0) + 1);
      if (!firstRating.current.has(card.id)) firstRating.current.set(card.id, r);

      const days = nextInterval(card.srs, r);
      reviewCard(card.id, r);
      const due = useAtlas.getState().cards.find((c) => c.id === card.id)?.srs.due;
      const when = days === 0 ? "torna in questa sessione" : `torna ${formatDay(due ?? new Date())}`;
      setConfirmation((c) => ({ n: (c?.n ?? 0) + 1, rating: r, text: `«${RATING_LABELS[r]}», ${when}` }));
      setTally((t) => ({ ...t, [r]: t[r] + 1 }));
      if (days === 0) setQueue((q) => (q ? [...q, card.id] : q));
      setPos((p) => p + 1);
      setRevealed(false);
      shownAt.current = Date.now();
    },
    [card, queue, revealed, reviewCard],
  );

  // Keyboard: Space / Enter turn the card, 1–4 rate it. Never while typing or inside a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!inSession || exitOpen || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('[role="dialog"]')) return;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t?.isContentEditable) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        // Other buttons and links keep their own Enter / Space.
        if (t && t !== document.body && t !== revealRef.current && t.closest("button, a, summary")) return;
        e.preventDefault();
        reveal();
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rate(Number(e.key) as Rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inSession, exitOpen, revealed, reveal, rate]);

  // Focus follows the action: after turning the card, the most common answer; on a new card, "Mostra risposta".
  useEffect(() => {
    if (!inSession) return;
    if (revealed) goodRef.current?.focus({ preventScroll: true });
    else if (pos > 0) revealRef.current?.focus({ preventScroll: true });
  }, [revealed, pos, inSession]);

  // The next card slides in from the right (skipped with reduced motion).
  useEffect(() => {
    if (!card || reduceMotion || pos === 0) return;
    cardRef.current?.animate(
      [
        { opacity: 0, transform: "translateX(24px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  }, [card?.id, pos, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (done) doneRef.current?.focus({ preventScroll: true });
  }, [done]);

  const exit = () => {
    setExitOpen(false);
    router.push("/flashcard");
  };
  const requestExit = () => (pos > 0 ? setExitOpen(true) : exit());

  if (!hydrated || queue === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-16" role="status" aria-label="Preparazione del ripasso">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-1 w-full" />
        <Skeleton className="h-72 w-full rounded-panel" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const back = (
    <Button variant="ghost" size="sm" href="/flashcard" className="-ml-2">
      <ArrowLeft className="h-4 w-4" aria-hidden /> Flashcard
    </Button>
  );
  const upcoming = nextReviewDay(cards, deck, new Date());

  if (!queue.length) {
    return (
      <div className="mx-auto max-w-2xl pb-16">
        {back}
        <h1 className="sr-only">Ripasso flashcard{deck ? `: ${deck}` : ""}</h1>
        <EmptyState
          className="mt-6"
          icon={<Check aria-hidden />}
          title={cards.length ? "Nessuna carta da ripassare adesso" : "Non hai ancora flashcard"}
          description={
            !cards.length
              ? "Aggiungi un mazzo dalle lezioni ATLAS o crea le tue carte: entrano subito in ripasso."
              : upcoming
                ? `Hai completato i ripassi in scadenza. Prossimo ripasso: ${formatDay(upcoming.date)}, ${pluralize(upcoming.count, "carta", "carte")}.`
                : "Hai completato i ripassi in scadenza."
          }
          action={
            <Button variant={cards.length ? "secondary" : "primary"} href={cards.length ? "/flashcard" : "/flashcard#aggiungi"}>
              {cards.length ? "Torna alle flashcard" : "Aggiungi carte"}
            </Button>
          }
        />
      </div>
    );
  }

  if (done) {
    const answered = tally[1] + tally[2] + tally[3] + tally[4];
    const unique = firstRating.current.size;
    const repeats = answered - unique;
    const firstTry = [...firstRating.current.values()].filter((r) => r >= 3).length;
    const topic = [...topicCount.current.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => getTopicRef(id))
      .find((ref) => ref && questionsFor({ topicIds: [ref.topic.id] }).length > 0);
    return (
      <div className="mx-auto max-w-2xl pb-16">
        {back}
        <section className="card mt-4 rounded-panel p-6 sm:p-8" aria-labelledby="ripasso-fatto">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-success/30 bg-success/10 text-success animate-pop-in" aria-hidden>
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <h1 id="ripasso-fatto" ref={doneRef} tabIndex={-1} className="mt-4 font-display text-4xl leading-tight text-fg outline-none">
            Ripasso completato
          </h1>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-fg-muted">
            Hai ripassato {pluralize(unique, "carta", "carte")} in {formatDuration(totalSec.current, { seconds: false })}
            {repeats > 0 ? `, con ${pluralize(repeats, "riproposta", "riproposte")}` : ""}. Ne hai ricordate {firstTry} al primo tentativo.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((r) => (
              <div key={r} className="inset-panel px-3.5 py-3">
                <dt className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <span className={cn("h-1.5 w-1.5 rounded-full", RATING_DOT[r])} aria-hidden />
                  {RATING_LABELS[r]}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{tally[r]}</dd>
              </div>
            ))}
          </dl>

          {upcoming && (
            <p className="mt-5 text-sm text-fg-muted">
              Prossimo ripasso: <span className="text-fg">{formatDay(upcoming.date)}</span>, {pluralize(upcoming.count, "carta", "carte")}.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 border-t border-white/[0.07] pt-6 sm:flex-row sm:flex-wrap">
            {topic && (
              <Button variant="primary" href={`/quiz?topic=${topic.topic.id}`} className="w-full min-w-0 sm:w-auto sm:max-w-full">
                <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">Fai un quiz su «{topic.topic.title}»</span>
              </Button>
            )}
            <Button variant={topic ? "secondary" : "primary"} href="/flashcard" className="w-full sm:w-auto">
              Torna alle flashcard
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!card) return null; // skipped by the effect above

  const ref = card.topicId ? getTopicRef(card.topicId) : undefined;
  const tone = ref ? SUBJECT_TONE[ref.subject.id] : "muted";

  return (
    <div className="mx-auto max-w-2xl pb-6">
      {/* Minimal header: exit, title, position; the meridian shows the way through the queue */}
      <header className="sticky top-0 z-30 -mx-4 -mt-[max(1rem,env(safe-area-inset-top))] bg-ink-950/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 sm:-mx-6 sm:px-6 lg:-mt-6">
        <div className="flex h-14 items-center gap-2">
          <Button variant="ghost" size="icon" className="-ml-2 h-11 w-11 shrink-0" onClick={requestExit} aria-label="Esci dal ripasso">
            <X className="h-5 w-5" aria-hidden />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-fg">{deck ? `Ripasso: ${deck}` : "Ripasso flashcard"}</h1>
          <span className="shrink-0 text-ui tabular-nums text-fg-muted">
            <span className="sr-only">Carta </span>
            <span className="font-semibold text-fg">{pos + 1}</span> di {queue.length}
          </span>
        </div>
        <Meridian value={pos / queue.length} label={`Ripasso: ${pos} carte valutate su ${queue.length}`} />
      </header>

      {/* Confirmation of the last rating: fixed height, so nothing moves */}
      <div className="flex h-10 items-center text-ui text-fg-muted" role="status" aria-live="polite">
        {confirmation && (
          <span key={confirmation.n} className="flex min-w-0 items-center gap-2 animate-fade-in">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", RATING_DOT[confirmation.rating])} aria-hidden />
            <span className="truncate">Carta precedente: {confirmation.text}</span>
          </span>
        )}
      </div>

      {/* The card: front and back share one grid cell, so the height never jumps when it turns */}
      <div className="[perspective:1800px]">
        <div
          key={card.id}
          ref={cardRef}
          className={cn(
            "grid transition-transform duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]",
            revealed && "[transform:rotateY(180deg)]",
          )}
        >
          <div
            onClick={revealed ? undefined : reveal}
            inert={revealed}
            className={cn(
              "card flex min-h-[clamp(15rem,42dvh,22rem)] cursor-pointer flex-col rounded-panel p-5 [backface-visibility:hidden] [grid-area:1/1] sm:p-7",
              !revealed && "transition-[border-color] duration-200 hover:border-white/[0.14]",
            )}
          >
            <CardMeta card={card} subjectName={ref?.subject.name} tone={tone} />
            <div className="flex flex-1 items-center justify-center py-6 text-center">
              <div className="max-w-[34ch] text-balance text-xl font-medium leading-snug text-fg sm:text-2xl sm:leading-snug">
                <RichText text={card.front} />
              </div>
            </div>
            <p className="text-center text-xs text-fg-subtle">
              <span className="[@media(hover:hover)]:hidden">Tocca la carta per vedere la risposta</span>
              <span className="hidden [@media(hover:hover)]:inline">
                Rispondi a mente, poi premi <Kbd>Spazio</Kbd>
              </span>
            </p>
          </div>

          <div
            inert={!revealed}
            aria-hidden={!revealed}
            className="flex min-h-[clamp(15rem,42dvh,22rem)] flex-col rounded-panel border border-azure-400/20 bg-[linear-gradient(180deg,rgb(26_102_255/0.07),rgb(17_20_26/0.9))] p-5 [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)] sm:p-7"
          >
            <CardMeta card={card} subjectName={ref?.subject.name} tone={tone} />
            <div className="mt-4 line-clamp-3 text-sm leading-relaxed text-fg-muted">
              <RichText text={card.front} />
            </div>
            <div className="mt-4 border-t border-white/[0.08] pt-4 text-lg leading-relaxed text-fg-reading">
              <h2 className="sr-only">Risposta</h2>
              <RichText text={card.back} />
            </div>
          </div>
        </div>
      </div>

      {/* Actions: thumb-reachable at the bottom on phones */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-white/[0.07] bg-ink-950/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {!revealed ? (
          <Button ref={revealRef} variant="primary" size="lg" className="w-full" onClick={reveal} autoFocus>
            <Eye className="h-4 w-4" aria-hidden /> Mostra la risposta
            <Kbd className="ml-1 hidden border-white/30 bg-white/10 text-white/90 [@media(hover:hover)]:inline-flex">Spazio</Kbd>
          </Button>
        ) : (
          <div role="group" aria-label="Quanto bene la ricordavi?">
            <p className="mb-2 text-ui text-fg-muted">Quanto bene la ricordavi?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map((r) => {
                const days = nextInterval(card.srs, r);
                return (
                  <button
                    key={r}
                    ref={r === 3 ? goodRef : undefined}
                    type="button"
                    onClick={() => rate(r)}
                    aria-keyshortcuts={String(r)}
                    className={cn(
                      "flex min-h-[4.5rem] flex-col items-start justify-center gap-0.5 rounded-control border px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.98] animate-fade-in",
                      r === 3
                        ? "border-azure-400/45 bg-azure-500/[0.12] hover:border-azure-400/70 hover:bg-azure-500/[0.18]"
                        : "border-white/[0.09] bg-white/[0.035] hover:border-white/[0.16] hover:bg-white/[0.07]",
                    )}
                    style={{ animationDelay: `${(r - 1) * 30}ms` }}
                  >
                    <span className="flex w-full items-center gap-2">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", RATING_DOT[r])} aria-hidden />
                      <span className="text-sm font-semibold text-fg">{RATING_LABELS[r]}</span>
                      <Kbd className="ml-auto hidden [@media(hover:hover)]:inline-flex">{r}</Kbd>
                    </span>
                    <span className="text-xs text-fg-muted">{RATING_HINTS[r]}</span>
                    <span className="text-xs text-fg-subtle">{days === 0 ? "Rivedi in questa sessione" : `Rivedi ${describeNextReview(days)}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 hidden text-center text-xs text-fg-subtle [@media(hover:hover)]:block">
        Valuta con onestà: è la tua risposta a decidere quando la carta torna.
      </p>

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        size="sm"
        title="Uscire dal ripasso?"
        description={`Le ${pluralize(pos, "carta valutata è salvata", "carte valutate sono salvate")}. Le altre ${queue.length - pos} restano da ripassare.`}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={exit}>
              Esci dal ripasso
            </Button>
            <Button variant="primary" onClick={() => setExitOpen(false)} data-autofocus>
              Continua il ripasso
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">Puoi riprendere quando vuoi dalla pagina Flashcard: le carte in scadenza ti aspettano lì.</p>
      </Modal>
    </div>
  );
}

function CardMeta({ card, subjectName, tone }: { card: FlashCard; subjectName?: string; tone: keyof typeof TONE }) {
  return (
    <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
      <span className="flex min-w-0 items-center gap-1.5">
        <GalleryVerticalEnd className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{card.deck}</span>
      </span>
      {subjectName && (
        <span className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", TONE[tone].dot)} aria-hidden />
          {subjectName}
        </span>
      )}
      {card.srs.lapses > 0 && (
        <Badge tone="warning" className="ml-auto">
          Sbagliata {pluralize(card.srs.lapses, "volta", "volte")}
        </Badge>
      )}
    </div>
  );
}
