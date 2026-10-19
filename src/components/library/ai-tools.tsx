"use client";

import { useState } from "react";
import { CalendarCheck, FileText, GalleryVerticalEnd, ListChecks, Loader2, Network, Plus, Sparkles } from "lucide-react";
import type { ConceptMap, Question } from "@/lib/types";
import { Badge, Button, Input, Label, Notice } from "@/components/ui/primitives";
import { Markdown } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { ConceptMapView } from "@/components/exercises/concept-map";
import { QuizRunner } from "@/components/exercises/quiz-runner";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { docTextWithMarkers } from "@/lib/library";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { addDays, cn, fmt, pluralize } from "@/lib/utils";

type Kind = "summary" | "flashcards" | "conceptmap" | "quiz" | "plan";

interface SummaryOut { summary: string; keyPoints: string[]; definitions: { term: string; definition: string }[]; uncertainties: string[]; pages: number[] }
interface CardOut { front: string; back: string; page: number | null }
interface QuizOut { type: "mcq" | "cloze"; stem: string; options: string[]; correctIndex: number; answer: string; explanation: string; page: number | null }

const TOOLS: { id: Kind; label: string; icon: typeof FileText; hint: string }[] = [
  { id: "summary", label: "Riassunto", icon: FileText, hint: "Sintesi fedele con punti chiave, definizioni e pagine" },
  { id: "flashcards", label: "Flashcard", icon: GalleryVerticalEnd, hint: "Una idea per carta, con la pagina di origine" },
  { id: "conceptmap", label: "Mappa concettuale", icon: Network, hint: "Concetti e relazioni etichettate" },
  { id: "quiz", label: "Domande e test", icon: ListChecks, hint: "Risposta multipla a 5 opzioni e completamento" },
  { id: "plan", label: "Piano di ripasso", icon: CalendarCheck, hint: "Flashcard in ripetizione dilazionata, ripassi a 1-3-7-16 giorni" },
];

export function AiTools({ doc, page }: { doc: LibraryDoc; page: number }) {
  const integrations = useIntegrations();
  const addCards = useAtlas((s) => s.addCards);
  const openProfessor = useUI((s) => s.openProfessor);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(doc.pages ?? 1);
  const [loading, setLoading] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { kind: "summary"; data: SummaryOut }
    | { kind: "flashcards" | "plan"; data: CardOut[] }
    | { kind: "conceptmap"; data: ConceptMap }
    | { kind: "quiz"; data: Question[] }
    | null
  >(null);
  const [planAdded, setPlanAdded] = useState<number | null>(null);

  if (!doc.textIndexed) {
    return <Notice tone="info">Questo documento non ha testo estraibile (scansione o audio): le funzioni AI non possono analizzarlo. L’OCR e la trascrizione non sono disponibili in questa versione.</Notice>;
  }
  if (integrations && !integrations.ai) {
    return (
      <Notice tone="info" title="AI non configurata">
        Riassunti, flashcard, mappe e domande dal documento richiedono <code>ANTHROPIC_API_KEY</code> sul server. Lettura, ricerca, evidenziazioni e segnalibri funzionano comunque.
      </Notice>
    );
  }

  const run = async (kind: Kind) => {
    setLoading(kind);
    setError(null);
    setResult(null);
    setPlanAdded(null);
    const text = await docTextWithMarkers(doc.id, from, to);
    if (text.length < 40) {
      setLoading(null);
      return setError("Nell’intervallo di pagine scelto non c’è abbastanza testo.");
    }
    const apiKind = kind === "plan" ? "flashcards" : kind;
    const res = await postJSON<{ data: unknown }>("/api/ai/generate", { kind: apiKind, title: doc.name, text, count: kind === "quiz" ? 10 : 12 });
    setLoading(null);
    if (!res.ok) return setError(res.error.message);
    const data = res.data.data as Record<string, unknown>;
    if (kind === "summary") setResult({ kind, data: data as unknown as SummaryOut });
    else if (kind === "flashcards" || kind === "plan") {
      const cards = (data.cards as CardOut[]) ?? [];
      setResult({ kind, data: cards });
      if (kind === "plan") {
        const n = addCards(cards.map((c) => ({ front: c.front, back: c.page ? `${c.back}\n\n(${doc.name}, p. ${c.page})` : c.back, deck: doc.name, subject: doc.subject, origin: "documento" as const })));
        setPlanAdded(n);
      }
    } else if (kind === "conceptmap") {
      const map = data as unknown as ConceptMap;
      const ids = new Set(map.nodes.map((n) => n.id));
      setResult({ kind, data: { nodes: map.nodes, edges: map.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to) } });
    } else {
      const qs = ((data.questions as QuizOut[]) ?? []).flatMap<Question>((q, i) => {
        const base = { id: `doc-${doc.id}-${i}`, subject: doc.subject ?? "biologia", topicId: doc.name, explanation: q.page ? `${q.explanation} (p. ${q.page})` : q.explanation, difficulty: 2 as const, skill: "concetto" as const };
        if (q.type === "mcq" && q.options.length === 5 && q.correctIndex >= 0 && q.correctIndex < 5) return [{ ...base, type: "mcq", stem: q.stem, options: q.options, correct: q.correctIndex }];
        if (q.type === "cloze" && q.answer) return [{ ...base, type: "cloze", stem: q.stem, answers: [q.answer] }];
        return [];
      });
      setResult({ kind: "quiz", data: qs });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="ai-from">Da pagina</Label>
          <Input id="ai-from" type="number" min={1} max={doc.pages} value={from} onChange={(e) => setFrom(Math.max(1, Number(e.target.value)))} className="h-9" />
        </div>
        <div>
          <Label htmlFor="ai-to">A pagina</Label>
          <Input id="ai-to" type="number" min={from} max={doc.pages} value={to} onChange={(e) => setTo(Math.max(from, Number(e.target.value)))} className="h-9" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => { setFrom(page); setTo(page); }} className="rounded-lg border border-white/10 px-2 py-1 text-[11.5px] text-fg-subtle hover:text-fg">Solo p. {page}</button>
        <button onClick={() => { setFrom(1); setTo(doc.pages ?? 1); }} className="rounded-lg border border-white/10 px-2 py-1 text-[11.5px] text-fg-subtle hover:text-fg">Tutto il documento</button>
      </div>
      <div className="grid gap-2">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => run(t.id)} disabled={!!loading} className={cn("flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-azure-400/40 disabled:opacity-50", loading === t.id && "border-azure-400/50")}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-azure-500/12 text-azure-300">{loading === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <t.icon className="h-4 w-4" />}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-fg">{t.label}</span>
              <span className="block text-[11.5px] text-fg-subtle">{t.hint}</span>
            </span>
          </button>
        ))}
        <button onClick={() => openProfessor({ docId: doc.id, prompt: `Spiegami i concetti principali di «${doc.name}» (pp. ${from}-${to}), citando le pagine.` })} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-azure-400/40">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-azure-500/12 text-azure-300"><Sparkles className="h-4 w-4" /></span>
          <span>
            <span className="block text-[13px] font-medium text-fg">Spiegazione con l’AI Professor</span>
            <span className="block text-[11.5px] text-fg-subtle">Domande libere sul documento, con citazione delle pagine</span>
          </span>
        </button>
      </div>
      <p className="text-[11.5px] leading-relaxed text-fg-subtle">Il testo delle pagine selezionate viene inviato al servizio AI solo per questa richiesta. Controlla sempre i risultati sulla fonte.</p>
      {error && <Notice tone="warning">{error}</Notice>}

      {result?.kind === "summary" && (
        <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <Markdown source={result.data.summary} />
          {result.data.keyPoints.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-fg-muted">{result.data.keyPoints.map((k) => <li key={k}>{k}</li>)}</ul>
          )}
          {result.data.definitions.length > 0 && (
            <dl className="space-y-1.5 text-[13px]">{result.data.definitions.map((d) => <div key={d.term}><dt className="inline font-medium text-fg">{d.term}: </dt><dd className="inline text-fg-muted">{d.definition}</dd></div>)}</dl>
          )}
          {result.data.uncertainties.length > 0 && (
            <Notice tone="warning" title="Da verificare">{result.data.uncertainties.join(" · ")}</Notice>
          )}
          {result.data.pages.length > 0 && <div className="text-[12px] text-fg-subtle">Pagine più rilevanti: {result.data.pages.join(", ")}</div>}
        </div>
      )}

      {(result?.kind === "flashcards" || result?.kind === "plan") && (
        <div className="space-y-2">
          {result.kind === "plan" && planAdded !== null && (
            <Notice tone="info" title={`${pluralize(planAdded, "flashcard aggiunta", "flashcard aggiunte")} al ripasso`}>
              Prossimi ripassi: {[1, 3, 7, 16].map((d) => fmt.dateShort(addDays(new Date(), d))).join(" · ")} (gli intervalli si adattano alle tue risposte).
            </Notice>
          )}
          {result.kind === "flashcards" && (
            <Button size="sm" variant="primary" onClick={() => { const n = addCards(result.data.map((c) => ({ front: c.front, back: c.page ? `${c.back}\n\n(${doc.name}, p. ${c.page})` : c.back, deck: doc.name, subject: doc.subject, origin: "documento" as const }))); toast(`${pluralize(n, "flashcard aggiunta", "flashcard aggiunte")}`); }}>
              <Plus className="h-4 w-4" /> Aggiungi tutte al ripasso
            </Button>
          )}
          {result.data.map((c, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] p-3 text-[13px]">
              <div className="font-medium text-fg">{c.front}</div>
              <div className="mt-0.5 text-fg-muted">{c.back}</div>
              {c.page && <Badge tone="muted" className="mt-1.5">p. {c.page}</Badge>}
            </div>
          ))}
        </div>
      )}

      {result?.kind === "conceptmap" && (
        <div className="rounded-2xl border border-white/[0.08] p-2">
          {result.data.nodes.length ? <ConceptMapView map={result.data} /> : <Notice tone="info">La mappa generata era vuota. Riprova con più pagine.</Notice>}
        </div>
      )}

      {result?.kind === "quiz" && (
        result.data.length ? (
          <QuizRunner questions={result.data} title={`Test · ${doc.name}`} sourceLabel="generato dall’AI dal tuo documento" seed={1} compactSummary />
        ) : (
          <Notice tone="info">L’AI non ha prodotto domande valide. Riprova con un altro intervallo di pagine.</Notice>
        )
      )}
    </div>
  );
}
