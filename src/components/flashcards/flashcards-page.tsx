"use client";

import { useMemo, useState } from "react";
import { BarChart3, Brain, Clock, Edit3, GalleryVerticalEnd, History, Library, Loader2, Pause, Play, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { allTopicRefs, getTopicRef, SUBJECTS } from "@/data/syllabus";
import { getLesson, LESSONS } from "@/data/lessons";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Notice, PageHeader, SectionTitle, Select, Stat, Textarea } from "@/components/ui/primitives";
import { Bars } from "@/components/ui/charts";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { useAtlas, type FlashCard } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/hooks";
import { describeInterval, isDue, maturity, RATING_LABELS } from "@/lib/srs";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { addDays, cn, dayKey, fmt, pluralize, startOfDay } from "@/lib/utils";

const MATURITY_ORDER = ["nuova", "in apprendimento", "giovane", "matura"] as const;
const MATURITY_FILL: Record<(typeof MATURITY_ORDER)[number], string> = {
  nuova: "bg-white/20",
  "in apprendimento": "bg-amber-400/70",
  giovane: "bg-azure-400/80",
  matura: "bg-emerald-400/80",
};

// ── Card editor ───────────────────────────────────────────────

function CardEditor({ open, onClose, card, decks }: { open: boolean; onClose: () => void; card?: FlashCard; decks: string[] }) {
  const addCards = useAtlas((s) => s.addCards);
  const updateCard = useAtlas((s) => s.updateCard);
  const [front, setFront] = useState(card?.front ?? "");
  const [back, setBack] = useState(card?.back ?? "");
  const [deck, setDeck] = useState(card?.deck ?? decks[0] ?? "Le mie flashcard");
  const [newDeck, setNewDeck] = useState("");
  const [topicId, setTopicId] = useState(card?.topicId ?? "");
  const ref = topicId ? getTopicRef(topicId) : undefined;

  const save = () => {
    const d = (newDeck.trim() || deck).trim();
    if (card) {
      updateCard(card.id, { front: front.trim(), back: back.trim(), deck: d });
      toast("Flashcard aggiornata");
    } else {
      const n = addCards([{ front: front.trim(), back: back.trim(), deck: d, topicId: topicId || undefined, subject: ref?.subject.id, origin: "manuale" }]);
      toast(n ? "Flashcard creata: è già in ripasso" : "Esiste già una carta con questo fronte", { tone: n ? "success" : "warning" });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={card ? "Modifica flashcard" : "Nuova flashcard"}
      description="Una sola idea per carta. Formula il fronte come una domanda a cui sapresti rispondere con precisione."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Annulla</Button>
          <Button variant="primary" disabled={front.trim().length < 3 || back.trim().length < 1} onClick={save}>Salva</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="fc-front">Fronte (domanda)</Label>
          <Textarea id="fc-front" rows={3} value={front} onChange={(e) => setFront(e.target.value)} placeholder="Es. Dove avviene la fosforilazione ossidativa?" />
        </div>
        <div>
          <Label htmlFor="fc-back">Retro (risposta)</Label>
          <Textarea id="fc-back" rows={3} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Es. Sulla membrana mitocondriale interna (creste)." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fc-deck">Mazzo</Label>
            <Select id="fc-deck" value={deck} onChange={(e) => setDeck(e.target.value)}>
              {[...new Set([...decks, "Le mie flashcard"])].map((d) => <option key={d}>{d}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="fc-newdeck">…oppure nuovo mazzo</Label>
            <Input id="fc-newdeck" value={newDeck} onChange={(e) => setNewDeck(e.target.value)} placeholder="Nome del mazzo" />
          </div>
        </div>
        {!card && (
          <div>
            <Label htmlFor="fc-topic">Argomento del syllabus (facoltativo)</Label>
            <Select id="fc-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">Nessuno</option>
              {SUBJECTS.map((s) => (
                <optgroup key={s.id} label={s.name}>
                  {allTopicRefs().filter((r) => r.subject.id === s.id).map((r) => <option key={r.topic.id} value={r.topic.id}>{r.topic.title}</option>)}
                </optgroup>
              ))}
            </Select>
            <p className="mt-1.5 text-[11.5px] text-fg-subtle">Collegare la carta a un argomento fa contare i tuoi ripassi nella padronanza di quell’argomento.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── AI generator ──────────────────────────────────────────────

interface GenCard { front: string; back: string; page: number | null }

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
  };

  const add = () => {
    if (!cards) return;
    const n = addCards(cards.filter((_, i) => selected.has(i)).map((c) => ({ front: c.front, back: c.back, topicId, subject: ref?.subject.id, deck: `${ref?.topic.title ?? "AI"} (AI)`, origin: "ai" as const })));
    toast(`${pluralize(n, "flashcard aggiunta", "flashcard aggiunte")} al ripasso`);
    setCards(null);
  };

  if (integrations && !integrations.ai) {
    return (
      <Notice tone="info" title="Generazione AI non configurata">
        Per generare flashcard con l’AI imposta <code>ANTHROPIC_API_KEY</code> sul server. Intanto puoi aggiungere i mazzi delle lezioni ATLAS o creare carte a mano.
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_120px]">
        <div>
          <Label htmlFor="ai-topic">Argomento</Label>
          <Select id="ai-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            {SUBJECTS.map((s) => (
              <optgroup key={s.id} label={s.name}>
                {allTopicRefs().filter((r) => r.subject.id === s.id).map((r) => <option key={r.topic.id} value={r.topic.id}>{r.topic.title}</option>)}
              </optgroup>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ai-count">Quante</Label>
          <Select id="ai-count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="ai-text">Materiale (facoltativo)</Label>
        <Textarea id="ai-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Incolla i tuoi appunti. Se lasci vuoto, l’AI usa il testo del syllabus e, se presente, la lezione ATLAS." />
      </div>
      <Button variant="primary" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Genera flashcard
      </Button>
      {error && <Notice tone="warning">{error}</Notice>}
      {cards && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-fg-muted">Controlla le carte prima di aggiungerle: l’AI può sbagliare.</span>
            <Button size="sm" variant="primary" disabled={!selected.size} onClick={add}>
              <Plus className="h-4 w-4" /> Aggiungi {selected.size}
            </Button>
          </div>
          {cards.map((c, i) => (
            <label key={i} className={cn("flex cursor-pointer gap-3 rounded-2xl border p-3 transition", selected.has(i) ? "border-azure-400/30 bg-azure-500/[0.05]" : "border-white/[0.07]")}>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#2f8bff]"
                checked={selected.has(i)}
                onChange={() => setSelected((s) => {
                  const n = new Set(s);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })}
              />
              <span className="min-w-0 text-[13px]">
                <span className="block font-medium text-fg">{c.front}</span>
                <span className="mt-0.5 block text-fg-muted">{c.back}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export function FlashcardsPage() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  const allCards = useAtlas((s) => s.cards);
  const allReviews = useAtlas((s) => s.cardReviews);
  const cards = hydrated ? allCards : [];
  const reviews = hydrated ? allReviews : [];
  const addCards = useAtlas((s) => s.addCards);
  const updateCard = useAtlas((s) => s.updateCard);
  const deleteCard = useAtlas((s) => s.deleteCard);
  const [editor, setEditor] = useState<{ open: boolean; card?: FlashCard }>({ open: false });
  const [q, setQ] = useState("");
  const [deckFilter, setDeckFilter] = useState("tutti");
  const [confirmDelete, setConfirmDelete] = useState<FlashCard | null>(null);
  const [showAll, setShowAll] = useState(false);

  const active = cards.filter((c) => !c.suspended);
  const due = active.filter((c) => isDue(c.srs, now));
  const decks = useMemo(() => [...new Set(cards.map((c) => c.deck))].sort((a, b) => a.localeCompare(b, "it")), [cards]);
  const buckets = MATURITY_ORDER.map((m) => ({ m, n: active.filter((c) => maturity(c.srs) === m).length }));

  const since30 = addDays(now, -30).toISOString();
  const recent = reviews.filter((r) => r.date >= since30);
  const retention = recent.length ? recent.filter((r) => r.rating >= 3).length / recent.length : null;
  const last7 = reviews.filter((r) => r.date >= addDays(now, -7).toISOString()).length;

  const forecast = useMemo(() => {
    const start = startOfDay(now);
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(start, i);
      const end = addDays(day, 1).getTime();
      const n = active.filter((c) => {
        const t = new Date(c.srs.due).getTime();
        return i === 0 ? t < end : t >= day.getTime() && t < end;
      }).length;
      return { label: i === 0 ? "Oggi" : fmt.weekdayShort(day), sublabel: fmt.dateShort(day), value: n };
    });
  }, [active, now]);

  const history = useMemo(() => {
    const start = startOfDay(now);
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(start, i - 13);
      const k = dayKey(day);
      return { label: fmt.weekdayShort(day), sublabel: fmt.dateShort(day), value: reviews.filter((r) => dayKey(r.date) === k).length };
    });
  }, [reviews, now]);

  const filtered = cards
    .filter((c) => deckFilter === "tutti" || c.deck === deckFilter)
    .filter((c) => !q.trim() || `${c.front} ${c.back}`.toLowerCase().includes(q.toLowerCase()));
  const lessonDecks = LESSONS.filter((l) => !cards.some((c) => c.topicId === l.topicId && c.origin === "atlas"));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><GalleryVerticalEnd className="h-3.5 w-3.5" /> Flashcard</span>}
        title={<>Ripetizione dilazionata, <span className="italic text-gradient-azure">al momento giusto</span>.</>}
        description="Ogni carta torna quando stai per dimenticarla: gli intervalli si allungano se la ricordi e si accorciano se sbagli (algoritmo derivato da SM-2). Valuta con onestà: è la tua valutazione a guidare il calendario."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditor({ open: true })}>
              <Plus className="h-4 w-4" /> Nuova flashcard
            </Button>
            <Button variant="primary" size="lg" href="/flashcard/ripasso" className={cn(!due.length && "pointer-events-none opacity-50")} aria-disabled={!due.length}>
              <Play className="h-4 w-4 fill-current" /> Ripassa ora {due.length ? `(${due.length})` : ""}
            </Button>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Da ripassare oggi" value={due.length} hint={pluralize(active.length, "carta attiva", "carte attive")} tone="azure" />
        <Stat label="Ritenzione (30 giorni)" value={retention === null ? "—" : fmt.percent(retention)} hint="Risposte «Buono» o «Facile»" />
        <Stat label="Ripassi ultimi 7 giorni" value={last7} hint={pluralize(reviews.length, "ripasso totale", "ripassi totali")} />
        <Card className="p-4">
          <div className="text-[12px] text-fg-subtle">Maturità delle carte</div>
          <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {buckets.map((b) => b.n > 0 && <span key={b.m} className={MATURITY_FILL[b.m]} style={{ flex: b.n }} title={`${b.m}: ${b.n}`} />)}
            {!active.length && <span className="flex-1 bg-white/[0.06]" />}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11.5px] text-fg-subtle">
            {buckets.map((b) => (
              <span key={b.m} className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", MATURITY_FILL[b.m])} /> {b.m}: {b.n}</span>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Carte in scadenza (prossimi 14 giorni)" icon={<Clock className="h-4 w-4" />} />
          <Bars data={forecast} color={TONE.azure.hex} ariaLabel="Carte in scadenza per giorno" />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Ripassi svolti (ultimi 14 giorni)" icon={<BarChart3 className="h-4 w-4" />} />
          <Bars data={history} color={TONE.success.hex} ariaLabel="Ripassi svolti per giorno" />
        </Card>
      </div>

      {/* Decks */}
      <section className="mt-10">
        <SectionTitle title="I tuoi mazzi" icon={<Library className="h-4 w-4" />} />
        {decks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {decks.map((d) => {
              const dc = cards.filter((c) => c.deck === d);
              const dd = dc.filter((c) => !c.suspended && isDue(c.srs, now)).length;
              const subject = dc.find((c) => c.subject)?.subject as SubjectId | undefined;
              const tone = subject ? SUBJECT_TONE[subject] : "muted";
              return (
                <Card key={d} className="flex min-w-0 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14.5px] font-medium text-fg" title={d}>{d}</div>
                      <div className="mt-0.5 text-[12px] text-fg-subtle">{pluralize(dc.length, "carta", "carte")}{subject ? ` · ${SUBJECTS.find((s) => s.id === subject)?.name}` : ""}</div>
                    </div>
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TONE[tone].dot)} />
                  </div>
                  <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                    {MATURITY_ORDER.map((m) => {
                      const n = dc.filter((c) => maturity(c.srs) === m).length;
                      return n ? <span key={m} className={MATURITY_FILL[m]} style={{ flex: n }} /> : null;
                    })}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant={dd ? "primary" : "secondary"} href={`/flashcard/ripasso?deck=${encodeURIComponent(d)}`} className={cn(!dd && "pointer-events-none opacity-50")}>
                      <Play className="h-3.5 w-3.5" /> {dd ? `Ripassa ${dd}` : "Niente da ripassare"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDeckFilter(d); setShowAll(true); document.getElementById("archivio")?.scrollIntoView({ behavior: "smooth" }); }}>
                      Sfoglia
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<GalleryVerticalEnd className="h-6 w-6" />} title="Nessuna flashcard ancora" description="Aggiungi un mazzo dalle lezioni ATLAS, creane una a mano o generale con l’AI." />
        )}
      </section>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Mazzi dalle lezioni ATLAS" icon={<Brain className="h-4 w-4" />} />
          {lessonDecks.length ? (
            <ul className="space-y-2">
              {lessonDecks.map((l) => {
                const ref = getTopicRef(l.topicId)!;
                return (
                  <li key={l.topicId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] text-fg">{ref.topic.title}</div>
                      <div className="text-[11.5px] text-fg-subtle">{ref.subject.name} · {pluralize(l.flashcards.length, "carta", "carte")}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const n = addCards(l.flashcards.map((f) => ({ front: f.front, back: f.back, topicId: l.topicId, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
                        toast(`${pluralize(n, "carta aggiunta", "carte aggiunte")} al ripasso`);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Aggiungi
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-fg-subtle">Hai già aggiunto tutti i mazzi delle lezioni disponibili.</p>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle title="Genera con l’AI" icon={<Sparkles className="h-4 w-4" />} />
          <AiGenerator />
        </Card>
      </div>

      {/* Browser */}
      <section id="archivio" className="mt-10 scroll-mt-24">
        <SectionTitle title="Archivio carte" icon={<Search className="h-4 w-4" />} />
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nel testo delle carte…" className="h-9 pl-9" aria-label="Cerca carte" />
          </div>
          <Select value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)} className="h-9 w-auto min-w-[200px] text-[13px]" aria-label="Filtra per mazzo">
            <option value="tutti">Tutti i mazzi</option>
            {decks.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </div>
        <Card className="divide-y divide-white/[0.05] overflow-hidden">
          {filtered.slice(0, showAll ? 500 : 12).map((c) => (
            <div key={c.id} className={cn("flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4", c.suspended && "opacity-50")}>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-fg">{c.front}</div>
                <div className="mt-0.5 line-clamp-2 text-[12.5px] text-fg-muted">{c.back}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                  <Badge tone="muted">{c.deck}</Badge>
                  <Badge tone={c.origin === "ai" ? "ultra" : c.origin === "atlas" ? "azure" : "muted"}>{c.origin === "ai" ? "AI" : c.origin === "atlas" ? "ATLAS" : c.origin === "documento" ? "Documento" : "Manuale"}</Badge>
                  <span className="text-fg-subtle">
                    {maturity(c.srs)} · {c.suspended ? "sospesa" : isDue(c.srs, now) ? "da ripassare" : `prossimo ripasso ${fmt.dateShort(c.srs.due)} (${describeInterval(c.srs.interval)})`}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditor({ open: true, card: c })} aria-label="Modifica"><Edit3 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => updateCard(c.id, { suspended: !c.suspended })} aria-label={c.suspended ? "Riattiva" : "Sospendi"} title={c.suspended ? "Riattiva" : "Sospendi"}>
                  {c.suspended ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(c)} aria-label="Elimina"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="p-6 text-center text-[13px] text-fg-subtle">Nessuna carta trovata.</div>}
        </Card>
        {filtered.length > 12 && !showAll && (
          <Button variant="ghost" className="mt-2" onClick={() => setShowAll(true)}>Mostra tutte ({filtered.length})</Button>
        )}
      </section>

      {/* History */}
      <section className="mt-10">
        <SectionTitle title="Cronologia dei ripassi" icon={<History className="h-4 w-4" />} />
        {reviews.length ? (
          <Card className="divide-y divide-white/[0.05]">
            {reviews.slice(-12).reverse().map((r, i) => (
              <div key={`${r.cardId}-${r.date}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                <span className="min-w-0 truncate text-fg-muted">{cardById.get(r.cardId)?.front ?? "Carta eliminata"}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <Badge tone={r.rating === 1 ? "danger" : r.rating === 2 ? "warning" : r.rating === 3 ? "azure" : "success"}>{RATING_LABELS[r.rating]}</Badge>
                  <span className="w-28 text-right text-[12px] text-fg-subtle">{fmt.dateShort(r.date)} · {fmt.time(r.date)}</span>
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <p className="text-[13px] text-fg-subtle">Nessun ripasso registrato.</p>
        )}
      </section>

      {editor.open && <CardEditor key={editor.card?.id ?? "new"} open onClose={() => setEditor({ open: false })} card={editor.card} decks={decks} />}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Eliminare la flashcard?"
        description="Verranno eliminati anche i suoi ripassi. L’operazione non si può annullare."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}><X className="h-4 w-4" /> Annulla</Button>
            <Button variant="danger" onClick={() => { if (confirmDelete) deleteCard(confirmDelete.id); setConfirmDelete(null); toast("Flashcard eliminata", { tone: "info" }); }}>
              <Trash2 className="h-4 w-4" /> Elimina
            </Button>
          </div>
        }
      >
        <p className="text-[13.5px] text-fg-muted">«{confirmDelete?.front}»</p>
      </Modal>
    </div>
  );
}
