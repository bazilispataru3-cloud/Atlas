"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Edit3, GalleryVerticalEnd, Pause, Play, Plus, RotateCcw, Search, Sparkles, Trash2 } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { allTopicRefs, getTopicRef, SUBJECTS } from "@/data/syllabus";
import { getLesson, LESSONS } from "@/data/lessons";
import { Badge, Button, EmptyState, Input, Label, Meridian, Modal, Notice, PageHeader, SectionTitle, Select, Skeleton, TabPanel, Tabs, Textarea } from "@/components/ui/primitives";
import { Bars } from "@/components/ui/charts";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { formatDay } from "@/components/quiz/format";
import { useAtlas, type FlashCard } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/hooks";
import { isDue, maturity, RATING_LABELS } from "@/lib/srs";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { addDays, capFirst, cn, dayKey, fmt, pluralize, startOfDay } from "@/lib/utils";

const MATURITY_ORDER = ["nuova", "in apprendimento", "giovane", "matura"] as const;
type Maturity = (typeof MATURITY_ORDER)[number];
/** A sequential ramp (dark to light): ordered categories read as one scale, never as unrelated colours. */
const MATURITY_FILL: Record<Maturity, string> = {
  nuova: "bg-ink-500",
  "in apprendimento": "bg-azure-700",
  giovane: "bg-azure-500",
  matura: "bg-azure-300",
};
const MATURITY_LABEL: Record<Maturity, [string, string]> = {
  nuova: ["nuova", "nuove"],
  "in apprendimento": ["in apprendimento", "in apprendimento"],
  giovane: ["giovane", "giovani"],
  matura: ["matura", "mature"],
};
/** Rough time per card, only to give an order of magnitude ("circa 10 min"). */
const SEC_PER_CARD = 20;
const NEW_DECK = "__nuovo__";

const ORIGIN_LABEL: Record<FlashCard["origin"], string> = { ai: "AI", atlas: "ATLAS", documento: "Documento", manuale: "Manuale" };

function MaturityBar({ counts, className, label }: { counts: Record<Maturity, number>; className?: string; label: string }) {
  const total = MATURITY_ORDER.reduce((s, m) => s + counts[m], 0);
  return (
    <div className={cn("flex h-1.5 gap-[2px] overflow-hidden rounded-full bg-white/[0.06]", className)} role="img" aria-label={label}>
      {total > 0 && MATURITY_ORDER.map((m) => (counts[m] ? <span key={m} className={MATURITY_FILL[m]} style={{ flex: counts[m] }} /> : null))}
    </div>
  );
}

const countMaturity = (cards: FlashCard[]) => {
  const out = { nuova: 0, "in apprendimento": 0, giovane: 0, matura: 0 } as Record<Maturity, number>;
  for (const c of cards) out[maturity(c.srs)]++;
  return out;
};
const describeMaturity = (counts: Record<Maturity, number>) =>
  MATURITY_ORDER.filter((m) => counts[m])
    .map((m) => `${counts[m]} ${MATURITY_LABEL[m][counts[m] === 1 ? 0 : 1]}`)
    .join(", ") || "nessuna carta";

// ── Card editor ───────────────────────────────────────────────

function CardEditor({ open, onClose, card, decks }: { open: boolean; onClose: () => void; card?: FlashCard; decks: string[] }) {
  const addCards = useAtlas((s) => s.addCards);
  const updateCard = useAtlas((s) => s.updateCard);
  const deckOptions = [...new Set([...decks, "Le mie flashcard"])];
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [deck, setDeck] = useState(card?.deck ?? decks[0] ?? "Le mie flashcard");
  const [newDeck, setNewDeck] = useState("");
  const [topicId, setTopicId] = useState(card?.topicId ?? "");
  const ref = topicId ? getTopicRef(topicId) : undefined;
  const creatingDeck = deck === NEW_DECK;
  const valid = front.trim().length >= 3 && back.trim().length >= 1 && (!creatingDeck || newDeck.trim().length > 0);

  const save = () => {
    if (!valid) return;
    const d = creatingDeck ? newDeck.trim() : deck;
    if (card) {
      updateCard(card.id, { front: front.trim(), back: back.trim(), deck: d });
      toast("Modifiche salvate", { tone: "success" });
    } else {
      const n = addCards([{ front: front.trim(), back: back.trim(), deck: d, topicId: topicId || undefined, subject: ref?.subject.id, origin: "manuale" }]);
      if (n) toast("Flashcard creata", { tone: "success", description: `È nel mazzo «${d}» ed entra subito in ripasso.` });
      else toast("Esiste già una carta con questo fronte", { tone: "warning", description: "Modifica il testo del fronte o cerca la carta nell’archivio." });
      if (!n) return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={card ? "Modifica flashcard" : "Nuova flashcard"}
      description="Una sola idea per carta: formula il fronte come una domanda a cui sapresti rispondere con precisione."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" type="submit" form="fc-form" disabled={!valid}>
            {card ? "Salva modifiche" : "Crea flashcard"}
          </Button>
        </div>
      }
    >
      <form
        id="fc-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <Label htmlFor="fc-front">Fronte (domanda)</Label>
          <Textarea id="fc-front" rows={3} value={front} onChange={(e) => setFront(e.target.value)} placeholder="Es. Dove avviene la fosforilazione ossidativa?" />
        </div>
        <div>
          <Label htmlFor="fc-back">Retro (risposta)</Label>
          <Textarea id="fc-back" rows={3} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Es. Sulla membrana mitocondriale interna (creste)." />
        </div>
        <div className={cn("grid gap-3", creatingDeck && "sm:grid-cols-2")}>
          <div>
            <Label htmlFor="fc-deck">Mazzo</Label>
            <Select id="fc-deck" value={deck} onChange={(e) => setDeck(e.target.value)}>
              {deckOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={NEW_DECK}>Nuovo mazzo…</option>
            </Select>
          </div>
          {creatingDeck && (
            <div className="animate-fade-in">
              <Label htmlFor="fc-newdeck">Nome del nuovo mazzo</Label>
              <Input id="fc-newdeck" value={newDeck} onChange={(e) => setNewDeck(e.target.value)} placeholder="Es. Enzimi" autoFocus />
            </div>
          )}
        </div>
        {!card && (
          <div>
            <Label htmlFor="fc-topic">Argomento del programma (facoltativo)</Label>
            <Select id="fc-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} aria-describedby="fc-topic-hint">
              <option value="">Nessuno</option>
              {SUBJECTS.map((s) => (
                <optgroup key={s.id} label={s.name}>
                  {allTopicRefs()
                    .filter((r) => r.subject.id === s.id)
                    .map((r) => (
                      <option key={r.topic.id} value={r.topic.id}>
                        {r.topic.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
            <p id="fc-topic-hint" className="mt-1.5 text-xs text-fg-muted">
              Collegata a un argomento, la carta fa contare i tuoi ripassi nella padronanza di quell’argomento.
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}

// ── AI generator ──────────────────────────────────────────────

interface GenCard {
  front: string;
  back: string;
  page: number | null;
}

function lessonText(topicId: string) {
  const ref = getTopicRef(topicId);
  const lesson = getLesson(topicId);
  if (!ref) return "";
  const parts = [`Syllabus ufficiale: ${ref.topic.syllabusText}`, `Sottoargomenti: ${ref.topic.subtopics.join("; ")}`];
  if (lesson) {
    parts.push(...lesson.intro, ...lesson.sections.flatMap((s) => [s.title, ...s.body, ...(s.bullets ?? [])]), ...lesson.definitions.map((d) => `${d.term}: ${d.definition}`));
  }
  return parts.join("\n");
}

function AiGenerator() {
  const integrations = useIntegrations();
  const addCards = useAtlas((s) => s.addCards);
  const [topicId, setTopicId] = useState("bio-mitocondri");
  const [text, setText] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<GenCard[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const resultsRef = useRef<HTMLDivElement>(null);
  const ref = getTopicRef(topicId);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setCards(null);
    const source = text.trim().length >= 40 ? text.trim() : lessonText(topicId);
    const res = await postJSON<{ data: { cards: GenCard[] } }>("/api/ai/generate", { kind: "flashcards", title: ref?.topic.title ?? "Flashcard", text: source, count });
    setLoading(false);
    if (!res.ok) return setError(res.error.message);
    setCards(res.data.data.cards);
    setSelected(new Set(res.data.data.cards.map((_, i) => i)));
    requestAnimationFrame(() => resultsRef.current?.focus({ preventScroll: false }));
  };

  const add = () => {
    if (!cards) return;
    const deck = `${ref?.topic.title ?? "AI"} (AI)`;
    const n = addCards(cards.filter((_, i) => selected.has(i)).map((c) => ({ front: c.front, back: c.back, topicId, subject: ref?.subject.id, deck, origin: "ai" as const })));
    toast(n ? `${pluralize(n, "flashcard aggiunta", "flashcard aggiunte")} al ripasso` : "Queste carte sono già nel tuo mazzo", {
      tone: n ? "success" : "info",
      description: n ? `Le trovi nel mazzo «${deck}».` : undefined,
    });
    setCards(null);
  };

  if (integrations && !integrations.ai) {
    return (
      <Notice tone="info" title="Generazione con l’AI non configurata">
        Per generare flashcard con l’AI il server deve avere una chiave <code className="text-fg">ANTHROPIC_API_KEY</code>. Intanto puoi aggiungere i mazzi delle lezioni ATLAS o creare carte a mano.
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <Label htmlFor="ai-topic">Argomento</Label>
          <Select id="ai-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            {SUBJECTS.map((s) => (
              <optgroup key={s.id} label={s.name}>
                {allTopicRefs()
                  .filter((r) => r.subject.id === s.id)
                  .map((r) => (
                    <option key={r.topic.id} value={r.topic.id}>
                      {r.topic.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ai-count">Quante carte</Label>
          <Select id="ai-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="ai-text">I tuoi appunti (facoltativo)</Label>
        <Textarea id="ai-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} aria-describedby="ai-text-hint" placeholder="Incolla qui i tuoi appunti." />
        <p id="ai-text-hint" className="mt-1.5 text-xs text-fg-muted">
          Se lasci vuoto, l’AI usa il testo del programma ufficiale e, se c’è, la lezione ATLAS dell’argomento.
        </p>
      </div>
      <Button variant="secondary" onClick={generate} loading={loading}>
        {!loading && <Sparkles className="h-4 w-4" aria-hidden />} {loading ? "Generazione in corso" : "Genera le flashcard"}
      </Button>
      {error && (
        <Notice tone="danger" live title="Generazione non riuscita">
          {error}
        </Notice>
      )}
      {cards && (
        <div ref={resultsRef} tabIndex={-1} className="space-y-2 outline-none" aria-label="Flashcard generate">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-fg-muted" role="status">
              {pluralize(cards.length, "carta generata", "carte generate")}. Controllale prima di aggiungerle: l’AI può sbagliare.
            </p>
            <Button size="sm" variant="primary" disabled={!selected.size} onClick={add} className="h-10 sm:h-8">
              <Plus className="h-4 w-4" aria-hidden /> Aggiungi {selected.size} al ripasso
            </Button>
          </div>
          <ul className="space-y-2">
            {cards.map((c, i) => (
              <li key={i}>
                <label className={cn("flex cursor-pointer gap-3 rounded-control border p-3 transition-colors duration-150", selected.has(i) ? "border-azure-400/30 bg-azure-500/[0.05]" : "border-white/[0.07] hover:border-white/[0.12]")}>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-azure-500"
                    checked={selected.has(i)}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      })
                    }
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium text-fg">{c.front}</span>
                    <span className="mt-0.5 block text-fg-muted">{c.back}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Lesson decks ──────────────────────────────────────────────

function LessonDecks({ cards }: { cards: FlashCard[] }) {
  const addCards = useAtlas((s) => s.addCards);
  const listRef = useRef<HTMLUListElement>(null);
  const lessonDecks = LESSONS.filter((l) => !cards.some((c) => c.topicId === l.topicId && c.origin === "atlas"));
  if (!lessonDecks.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-fg-muted">
        <Check className="h-4 w-4 text-success" aria-hidden /> Hai già aggiunto tutti i mazzi delle lezioni ATLAS disponibili.
      </p>
    );
  }
  return (
    <ul ref={listRef} tabIndex={-1} className="divide-y divide-white/[0.06] outline-none" aria-label="Mazzi delle lezioni non ancora aggiunti">
      {lessonDecks.map((l, i) => {
        const ref = getTopicRef(l.topicId)!;
        return (
          <li key={l.topicId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <div className="truncate text-sm text-fg">{ref.topic.title}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
                <span className={cn("h-1.5 w-1.5 rounded-full", TONE[SUBJECT_TONE[ref.subject.id]].dot)} aria-hidden />
                {ref.subject.name}, {pluralize(l.flashcards.length, "carta", "carte")}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-10 shrink-0 sm:h-8"
              aria-label={`Aggiungi il mazzo «${ref.topic.title}»`}
              onClick={() => {
                const n = addCards(l.flashcards.map((f) => ({ front: f.front, back: f.back, topicId: l.topicId, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
                toast(n ? `${pluralize(n, "carta aggiunta", "carte aggiunte")} al ripasso` : "Queste carte sono già nel tuo mazzo", {
                  tone: n ? "success" : "info",
                  description: n ? `Mazzo «${ref.topic.title}».` : undefined,
                });
                // The row disappears: keep focus in the list instead of losing it to the page.
                requestAnimationFrame(() => {
                  const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button");
                  const next = buttons?.[Math.min(i, (buttons?.length ?? 1) - 1)];
                  (next ?? listRef.current)?.focus({ preventScroll: true });
                });
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Aggiungi
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Page ──────────────────────────────────────────────────────

type AddTab = "lezioni" | "ai";
type ManageTab = "archivio" | "cronologia";

export function FlashcardsPage() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  const allCards = useAtlas((s) => s.cards);
  const allReviews = useAtlas((s) => s.cardReviews);
  const cards = useMemo(() => (hydrated ? allCards : []), [hydrated, allCards]);
  const reviews = useMemo(() => (hydrated ? allReviews : []), [hydrated, allReviews]);
  const updateCard = useAtlas((s) => s.updateCard);
  const deleteCard = useAtlas((s) => s.deleteCard);
  const [editor, setEditor] = useState<{ open: boolean; card?: FlashCard }>({ open: false });
  const [q, setQ] = useState("");
  const [deckFilter, setDeckFilter] = useState("tutti");
  const [confirmDelete, setConfirmDelete] = useState<FlashCard | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>("lezioni");
  const [manageTab, setManageTab] = useState<ManageTab>("archivio");
  const archiveRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => cards.filter((c) => !c.suspended), [cards]);
  const due = active.filter((c) => isDue(c.srs, now));
  const decks = useMemo(() => [...new Set(cards.map((c) => c.deck))].sort((a, b) => a.localeCompare(b, "it")), [cards]);
  const counts = countMaturity(active);

  const todayKey = dayKey(now);
  const doneToday = reviews.filter((r) => dayKey(r.date) === todayKey).length;
  const since30 = addDays(now, -30).toISOString();
  const recent = reviews.filter((r) => r.date >= since30);
  const retention = recent.length ? recent.filter((r) => r.rating >= 3).length / recent.length : null;
  const last7 = reviews.filter((r) => r.date >= addDays(now, -7).toISOString()).length;
  const estimateMin = Math.max(1, Math.round((due.length * SEC_PER_CARD) / 60));

  const upcoming = useMemo(() => {
    const pending = active.filter((c) => !isDue(c.srs, now));
    if (!pending.length) return null;
    const first = pending.reduce((a, c) => (c.srs.due < a.srs.due ? c : a)).srs.due;
    const day = new Date(first).toDateString();
    return { date: first, count: pending.filter((c) => new Date(c.srs.due).toDateString() === day).length };
  }, [active, now]);

  // Next 14 days, from tomorrow: today is the headline number above, and an overdue backlog would flatten the scale.
  const forecast = useMemo(() => {
    const start = startOfDay(now);
    return Array.from({ length: 14 }, (_, k) => {
      const day = addDays(start, k + 1);
      const end = addDays(day, 1).getTime();
      const n = active.filter((c) => {
        const t = new Date(c.srs.due).getTime();
        return t >= day.getTime() && t < end;
      }).length;
      return { label: fmt.weekdayShort(day), sublabel: capFirst(`${fmt.weekday(day)} ${fmt.date(day)}`), value: n };
    });
  }, [active, now]);
  const next7 = forecast.slice(0, 7).reduce((s, d) => s + d.value, 0);

  const history = useMemo(() => {
    const start = startOfDay(now);
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(start, i - 13);
      const k = dayKey(day);
      return { label: i === 13 ? "Oggi" : fmt.weekdayShort(day), sublabel: capFirst(`${fmt.weekday(day)} ${fmt.date(day)}`), value: reviews.filter((r) => dayKey(r.date) === k).length, highlight: i === 13 };
    });
  }, [reviews, now]);
  const reviews14 = history.reduce((s, d) => s + d.value, 0);

  const filtered = cards
    .filter((c) => deckFilter === "tutti" || c.deck === deckFilter)
    .filter((c) => !q.trim() || `${c.front} ${c.back}`.toLowerCase().includes(q.trim().toLowerCase()));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const browseDeck = (d: string) => {
    setDeckFilter(d);
    setQ("");
    setShowAll(true);
    setManageTab("archivio");
    requestAnimationFrame(() => {
      document.getElementById("gestisci")?.scrollIntoView({ behavior: "smooth", block: "start" });
      archiveRef.current?.focus({ preventScroll: true });
    });
  };

  const header = (
    <PageHeader
      title="Flashcard"
      description="Ogni carta torna quando stai per dimenticarla: l’intervallo si allunga se la ricordi e si accorcia se sbagli. È la tua valutazione a decidere il calendario."
    />
  );

  if (!hydrated) {
    return (
      <div className="pb-16">
        {header}
        <div className="mt-8 space-y-4" role="status" aria-label="Caricamento delle flashcard">
          <Skeleton className="h-64 w-full rounded-panel" />
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {header}

      {/* Today's review: the page's one bold element */}
      <section aria-labelledby="ripasso-oggi" className="card mt-8 overflow-hidden rounded-panel">
        <div className="grid lg:grid-cols-12">
          <div className="flex gap-5 p-5 sm:gap-7 sm:p-8 lg:col-span-7">
            <DeckStack count={due.length} empty={!cards.length} />
            <div className="min-w-0 flex-1">
              <h2 id="ripasso-oggi" className="text-sm text-fg-muted">
                Ripasso di oggi
              </h2>
              {!cards.length ? (
                <>
                  <p className="mt-1.5 text-xl font-medium leading-snug text-fg sm:text-2xl">Non hai ancora flashcard</p>
                  <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-fg-muted">Aggiungi il mazzo di una lezione ATLAS o crea le tue carte: entrano subito in ripasso.</p>
                  <Button variant="primary" size="lg" href="#aggiungi" className="mt-5 w-full sm:w-auto">
                    <Plus className="h-4 w-4" aria-hidden /> Aggiungi le prime carte
                  </Button>
                </>
              ) : due.length ? (
                <>
                  <p className="mt-1.5 text-xl font-medium leading-snug text-fg sm:text-2xl">
                    {due.length === 1 ? "Una carta ti aspetta" : `${due.length} carte ti aspettano`}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    Circa {fmt.minutes(estimateMin)}.{doneToday > 0 && ` Oggi ne hai già ${doneToday === 1 ? "ripassata una" : `ripassate ${doneToday}`}.`}
                  </p>
                  <Button variant="primary" size="lg" href="/flashcard/ripasso" className="mt-5 w-full sm:w-auto">
                    <Play className="h-4 w-4 fill-current" aria-hidden /> Ripassa ora
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-xl font-medium leading-snug text-fg sm:text-2xl">Niente da ripassare adesso</p>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    {doneToday > 0 ? `Oggi hai ripassato ${pluralize(doneToday, "carta", "carte")}. ` : ""}
                    {upcoming ? `Prossimo ripasso: ${formatDay(upcoming.date, now)}, ${pluralize(upcoming.count, "carta", "carte")}.` : "Tutte le carte sono sospese."}
                  </p>
                </>
              )}
              {cards.length > 0 && (doneToday > 0 || due.length > 0) && (
                <div className="mt-6">
                  <Meridian value={doneToday / Math.max(1, doneToday + due.length)} label={`Ripasso di oggi: ${doneToday} carte ripassate, ${due.length} da ripassare`} />
                  <p className="mt-2 text-xs text-fg-subtle">
                    {doneToday} {doneToday === 1 ? "ripassata" : "ripassate"} oggi, {due.length} da ripassare
                  </p>
                </div>
              )}
            </div>
          </div>

          {cards.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.07] p-5 sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:gap-x-10 sm:px-8 sm:py-6 lg:col-span-5 lg:grid-cols-2 lg:gap-x-6 lg:border-l lg:border-t-0 lg:p-8">
              <div>
                <dt className="text-ui text-fg-muted">Ritenzione, 30 giorni</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{retention === null ? "—" : fmt.percent(retention)}</dd>
                <dd className="mt-0.5 text-xs text-fg-subtle">Risposte «Buono» o «Facile»</dd>
              </div>
              <div>
                <dt className="text-ui text-fg-muted">Ripassi, 7 giorni</dt>
                <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-fg">{last7}</dd>
                <dd className="mt-0.5 text-xs text-fg-subtle">{pluralize(reviews.length, "ripasso", "ripassi")} in totale</dd>
              </div>
              <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                <dt className="flex items-baseline justify-between gap-3 text-ui text-fg-muted">
                  <span>Maturità delle carte</span>
                  <span className="text-xs text-fg-subtle">{pluralize(active.length, "carta attiva", "carte attive")}</span>
                </dt>
                <dd className="mt-2.5">
                  <MaturityBar counts={counts} className="h-2" label={`Maturità: ${describeMaturity(counts)}`} />
                  <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                    {MATURITY_ORDER.map((m) => (
                      <li key={m} className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={cn("h-2 w-2 rounded-[3px]", MATURITY_FILL[m])} aria-hidden />
                        {capFirst(MATURITY_LABEL[m][1])} <span className="text-fg">{counts[m]}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* Decks */}
      {decks.length > 0 && (
        <section className="mt-12" aria-labelledby="mazzi">
          <SectionTitle id="mazzi" title="I tuoi mazzi" description={`${pluralize(decks.length, "mazzo", "mazzi")}, ${pluralize(cards.length, "carta", "carte")}`} />
          <ul className="card divide-y divide-white/[0.06]">
            {decks.map((d) => {
              const dc = cards.filter((c) => c.deck === d);
              const da = dc.filter((c) => !c.suspended);
              const dd = da.filter((c) => isDue(c.srs, now)).length;
              const subject = dc.find((c) => c.subject)?.subject as SubjectId | undefined;
              const dCounts = countMaturity(da);
              const nextDue = da.length && !dd ? da.reduce((a, c) => (c.srs.due < a.srs.due ? c : a)).srs.due : null;
              return (
                <li key={d} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", subject ? TONE[SUBJECT_TONE[subject]].dot : "bg-fg-subtle")} aria-hidden />
                      <span className="truncate text-sm font-medium text-fg" title={d}>
                        {d}
                      </span>
                    </div>
                    <div className="mt-0.5 pl-4 text-xs text-fg-subtle">
                      {pluralize(dc.length, "carta", "carte")}
                      {subject ? `, ${SUBJECTS.find((s) => s.id === subject)?.name}` : ""}
                    </div>
                  </div>
                  <div className="pl-4 sm:w-44 sm:pl-0">
                    <MaturityBar counts={dCounts} label={`Maturità del mazzo: ${describeMaturity(dCounts)}`} />
                    <div className="mt-1.5 text-xs text-fg-subtle">
                      {dCounts.matura} {dCounts.matura === 1 ? "matura" : "mature"} su {da.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-4 sm:w-60 sm:justify-end sm:pl-0">
                    {dd ? (
                      <Button size="sm" variant="secondary" href={`/flashcard/ripasso?deck=${encodeURIComponent(d)}`} className="h-10 sm:h-8 sm:min-w-28" aria-label={`Ripassa ${dd} carte del mazzo «${d}»`}>
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden /> Ripassa {dd}
                      </Button>
                    ) : (
                      <span className="text-xs text-fg-muted">{nextDue ? `Prossimo ripasso: ${formatDay(nextDue, now)}` : "Tutte sospese"}</span>
                    )}
                    <Button size="sm" variant="ghost" className="h-10 sm:h-8" onClick={() => browseDeck(d)} aria-label={`Sfoglia il mazzo «${d}»`}>
                      Sfoglia
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Add cards */}
      <section id="aggiungi" className="mt-12 scroll-mt-24" aria-labelledby="aggiungi-titolo">
        <SectionTitle
          id="aggiungi-titolo"
          title="Aggiungi carte"
          description="Dalle lezioni ATLAS, dai tuoi appunti con l’AI o scritte da te."
          action={
            <Button variant="secondary" size="sm" className="h-10 sm:h-8" onClick={() => setEditor({ open: true })}>
              <Plus className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Nuova flashcard</span>
              <span className="sm:hidden">Nuova</span>
            </Button>
          }
        />
        <div className="card p-5 sm:p-6">
          <Tabs
            base="aggiungi"
            ariaLabel="Come aggiungere carte"
            value={addTab}
            onChange={setAddTab}
            items={[
              { value: "lezioni", label: "Dalle lezioni ATLAS", count: LESSONS.filter((l) => !cards.some((c) => c.topicId === l.topicId && c.origin === "atlas")).length },
              { value: "ai", label: "Genera con l’AI", icon: <Sparkles /> },
            ]}
          />
          <TabPanel base="aggiungi" value={addTab} className="pt-5">
            {addTab === "lezioni" ? <LessonDecks cards={cards} /> : <AiGenerator />}
          </TabPanel>
        </div>
      </section>

      {/* Statistics */}
      {cards.length > 0 && (
        <section className="mt-12" aria-labelledby="statistiche">
          <SectionTitle id="statistiche" title="Andamento" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-fg">In arrivo nei prossimi 14 giorni</h3>
              <p className="mt-0.5 text-xs text-fg-muted">
                Oggi {due.length} da ripassare; nei prossimi 7 giorni {pluralize(next7, "carta", "carte")}.
              </p>
              <div className="mt-4">
                <Bars data={forecast} color={TONE.azure.hex} ariaLabel="Carte in scadenza per giorno, da domani" seriesLabel="Carte in scadenza" emptyLabel="Nessuna carta in scadenza nei prossimi 14 giorni" />
              </div>
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-fg">Ripassi svolti negli ultimi 14 giorni</h3>
              <p className="mt-0.5 text-xs text-fg-muted">
                {pluralize(reviews14, "ripasso", "ripassi")} in totale, {doneToday} oggi.
              </p>
              <div className="mt-4">
                <Bars data={history} color={TONE.azure.hex} ariaLabel="Ripassi svolti per giorno" seriesLabel="Ripassi" emptyLabel="Ancora nessun ripasso in questo periodo" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Manage cards */}
      {cards.length > 0 && (
        <section id="gestisci" className="mt-12 scroll-mt-24" aria-labelledby="gestisci-titolo">
          <SectionTitle id="gestisci-titolo" title="Gestisci le carte" description="Cerca, modifica, sospendi o elimina le carte; rivedi i tuoi ultimi ripassi." />
          <Tabs
            base="gestisci"
            ariaLabel="Gestione delle carte"
            value={manageTab}
            onChange={setManageTab}
            items={[
              { value: "archivio", label: "Archivio", count: cards.length },
              { value: "cronologia", label: "Cronologia dei ripassi" },
            ]}
          />
          <TabPanel base="gestisci" value={manageTab} className="pt-5">
            {manageTab === "archivio" ? (
              <div ref={archiveRef} tabIndex={-1} className="outline-none" aria-label="Archivio delle carte">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                    <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nel testo delle carte" className="pl-9" aria-label="Cerca nel testo delle carte" />
                  </div>
                  <Select value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)} className="sm:w-64" aria-label="Filtra per mazzo">
                    <option value="tutti">Tutti i mazzi</option>
                    {decks.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </div>
                <p className="mb-2 text-xs text-fg-subtle" role="status">
                  {filtered.length === cards.length ? pluralize(cards.length, "carta", "carte") : `${pluralize(filtered.length, "carta trovata", "carte trovate")} su ${cards.length}`}
                </p>
                {filtered.length ? (
                  <ul className="card divide-y divide-white/[0.06] overflow-hidden">
                    {filtered.slice(0, showAll ? 500 : 12).map((c) => {
                      const cardDue = !c.suspended && isDue(c.srs, now);
                      return (
                        <li key={c.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <div className={cn("text-sm font-medium", c.suspended ? "text-fg-muted" : "text-fg")}>{c.front}</div>
                            <div className="mt-0.5 line-clamp-2 text-ui text-fg-muted">{c.back}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
                              {c.suspended && <Badge tone="muted" icon={<Pause className="h-3 w-3" aria-hidden />}>Sospesa</Badge>}
                              {cardDue && <Badge tone="azure">Da ripassare</Badge>}
                              <Badge tone="muted">{c.deck}</Badge>
                              <Badge tone="muted">{ORIGIN_LABEL[c.origin]}</Badge>
                              <span className="ml-1">{capFirst(maturity(c.srs))}</span>
                              {!c.suspended && !cardDue && <span>, prossimo ripasso {formatDay(c.srs.due, now)}</span>}
                            </div>
                          </div>
                          <div className="-ml-2 flex shrink-0 gap-1 sm:ml-0">
                            <Button size="icon" variant="ghost" className="h-11 w-11 sm:h-9 sm:w-9" onClick={() => setEditor({ open: true, card: c })} aria-label={`Modifica la carta «${c.front.slice(0, 60)}»`}>
                              <Edit3 className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-11 w-11 sm:h-9 sm:w-9"
                              onClick={() => {
                                updateCard(c.id, { suspended: !c.suspended });
                                toast(c.suspended ? "Carta riattivata" : "Carta sospesa", {
                                  tone: "info",
                                  description: c.suspended ? "Torna nei ripassi in scadenza." : "Non comparirà nei ripassi finché non la riattivi.",
                                });
                              }}
                              aria-label={`${c.suspended ? "Riattiva" : "Sospendi"} la carta «${c.front.slice(0, 60)}»`}
                              aria-pressed={!!c.suspended}
                              title={c.suspended ? "Riattiva" : "Sospendi"}
                            >
                              {c.suspended ? <RotateCcw className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-11 w-11 hover:text-red-300 sm:h-9 sm:w-9" onClick={() => setConfirmDelete(c)} aria-label={`Elimina la carta «${c.front.slice(0, 60)}»`} title="Elimina">
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<Search aria-hidden />}
                    title="Nessuna carta trovata"
                    description="Nessuna carta corrisponde alla ricerca o al mazzo scelto."
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setQ("");
                          setDeckFilter("tutti");
                        }}
                      >
                        Mostra tutte le carte
                      </Button>
                    }
                  />
                )}
                {filtered.length > 12 && !showAll && (
                  <Button variant="ghost" className="mt-2" onClick={() => setShowAll(true)}>
                    Mostra tutte ({filtered.length})
                  </Button>
                )}
              </div>
            ) : reviews.length ? (
              <ul className="card divide-y divide-white/[0.06]">
                {reviews
                  .slice(-15)
                  .reverse()
                  .map((r, i) => (
                    <li key={`${r.cardId}-${r.date}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0 truncate text-sm text-fg-reading">{cardById.get(r.cardId)?.front ?? "Carta eliminata"}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <Badge tone={r.rating === 1 ? "danger" : r.rating === 2 ? "warning" : r.rating === 3 ? "azure" : "success"}>{RATING_LABELS[r.rating]}</Badge>
                        <span className="hidden w-32 text-right text-xs tabular-nums text-fg-subtle sm:block">
                          {fmt.dateShort(r.date)}, {fmt.time(r.date)}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <EmptyState
                icon={<GalleryVerticalEnd aria-hidden />}
                title="Nessun ripasso registrato"
                description="Ogni valutazione che dai durante il ripasso compare qui."
                action={
                  due.length ? (
                    <Button variant="secondary" href="/flashcard/ripasso">
                      Inizia il ripasso
                    </Button>
                  ) : undefined
                }
              />
            )}
          </TabPanel>
        </section>
      )}

      {editor.open && <CardEditor key={editor.card?.id ?? "new"} open onClose={() => setEditor({ open: false })} card={editor.card} decks={decks} />}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Eliminare la flashcard?"
        description="Verranno eliminati anche i suoi ripassi. L’operazione non si può annullare."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} data-autofocus>
              Annulla
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) deleteCard(confirmDelete.id);
                setConfirmDelete(null);
                toast("Flashcard eliminata", { tone: "info" });
                // The row is gone: keep focus in the archive.
                setTimeout(() => archiveRef.current?.focus({ preventScroll: true }), 40);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Elimina
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-fg-reading">«{confirmDelete?.front}»</p>
      </Modal>
    </div>
  );
}

/** A small stack of cards: the count of today's reviews sits on the top one. */
function DeckStack({ count, empty }: { count: number; empty: boolean }) {
  return (
    <div className="relative mt-1 h-[5.5rem] w-[4.25rem] shrink-0 sm:h-[7.5rem] sm:w-[5.75rem]" aria-hidden>
      <span className="absolute inset-0 translate-x-[5px] translate-y-[-3px] rotate-[6deg] rounded-[10px] border border-white/[0.07] bg-ink-750/70" />
      <span className="absolute inset-0 translate-x-[2px] rotate-[2.5deg] rounded-[10px] border border-white/[0.09] bg-ink-750" />
      <span
        className={cn(
          "absolute inset-0 grid place-items-center rounded-[10px] border bg-ink-800 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.9)]",
          count > 0 ? "border-azure-400/40" : "border-white/[0.12]",
        )}
      >
        {count > 0 ? (
          <span className="font-display text-4xl leading-none text-fg sm:text-5xl">{count}</span>
        ) : empty ? (
          <Plus className="h-6 w-6 text-fg-subtle" />
        ) : (
          <Check className="h-6 w-6 text-success" />
        )}
      </span>
    </div>
  );
}
