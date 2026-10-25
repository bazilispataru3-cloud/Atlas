"use client";

import { useEffect, useId, useState } from "react";
import { CalendarCheck, FileText, GalleryVerticalEnd, ListChecks, Network, Plus, RotateCcw } from "lucide-react";
import type { ConceptMap, Question } from "@/lib/types";
import { Button, Input, Notice, Segmented, Spinner } from "@/components/ui/primitives";
import { Markdown } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { ConceptMapView } from "@/components/exercises/concept-map";
import { QuizRunner } from "@/components/exercises/quiz-runner";
import { postJSON, useIntegrations } from "@/lib/ai-client";
import { docTextWithMarkers } from "@/lib/library";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import { addDays, cn, fmt, pluralize } from "@/lib/utils";

type Kind = "summary" | "flashcards" | "conceptmap" | "quiz" | "plan";

interface SummaryOut { summary: string; keyPoints: string[]; definitions: { term: string; definition: string }[]; uncertainties: string[]; pages: number[] }
interface CardOut { front: string; back: string; page: number | null }
interface QuizOut { type: "mcq" | "cloze"; stem: string; options: string[]; correctIndex: number; answer: string; explanation: string; page: number | null }

type Result =
  | { kind: "summary"; data: SummaryOut; range: string }
  | { kind: "flashcards" | "plan"; data: CardOut[]; range: string; added?: number }
  | { kind: "conceptmap"; data: ConceptMap; range: string }
  | { kind: "quiz"; data: Question[]; range: string };

const TOOLS: { id: Kind; label: string; icon: typeof FileText; hint: string }[] = [
  { id: "summary", label: "Riassunto", icon: FileText, hint: "Punti chiave, definizioni e pagine da cui vengono" },
  { id: "flashcards", label: "Flashcard", icon: GalleryVerticalEnd, hint: "Un’idea per carta: le rivedi prima di aggiungerle" },
  { id: "conceptmap", label: "Mappa concettuale", icon: Network, hint: "Concetti collegati da relazioni con un nome" },
  { id: "quiz", label: "Domande di verifica", icon: ListChecks, hint: "Risposta multipla a 5 opzioni e completamento" },
];

const LABEL: Record<Kind, string> = { summary: "Riassunto", flashcards: "Flashcard", conceptmap: "Mappa", quiz: "Domande", plan: "Piano" };

/** Results survive closing the panel or the sheet, for this visit. */
const cache = new Map<string, { results: Partial<Record<Kind, Result>>; shown: Kind | null }>();

const toCard = (doc: LibraryDoc, c: CardOut) => ({
  front: c.front,
  back: c.page ? `${c.back}\n\n(${doc.name}, p. ${c.page})` : c.back,
  deck: doc.name,
  subject: doc.subject,
  origin: "documento" as const,
});

export function AiTools({ doc, page, onGoToPage }: { doc: LibraryDoc; page: number; onGoToPage?: (p: number) => void }) {
  const integrations = useIntegrations();
  const addCards = useAtlas((s) => s.addCards);
  const ids = useId();
  const last = doc.pages ?? 1;
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState(String(last));
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [loading, setLoading] = useState<Kind | null>(null);
  const [error, setError] = useState<{ kind: Kind; message: string } | null>(null);
  const [results, setResults] = useState<Partial<Record<Kind, Result>>>(() => cache.get(doc.id)?.results ?? {});
  const [shown, setShown] = useState<Kind | null>(() => cache.get(doc.id)?.shown ?? null);

  useEffect(() => {
    cache.set(doc.id, { results, shown });
  }, [doc.id, results, shown]);

  if (!doc.textIndexed) {
    return (
      <Notice tone="info" title="Strumenti AI non disponibili per questo documento">
        Non contiene testo leggibile (è una scansione o un audio), quindi non si può riassumere né trasformare in flashcard. L’OCR e la trascrizione non sono disponibili in questa versione.
      </Notice>
    );
  }
  if (integrations === null) return <Spinner label="Controllo degli strumenti AI" />;
  if (!integrations.ai) {
    return (
      <Notice tone="info" title="Funzioni AI non attive">
        In questa versione riassunti, flashcard, mappe e domande generate dal documento non sono attivi. Puoi comunque leggere, cercare, evidenziare, creare flashcard dalle selezioni e salvare segnalibri.
      </Notice>
    );
  }

  const parseRange = (): [number, number] | null => {
    const a = parseInt(from, 10);
    const b = parseInt(to, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1 || a > last || b > last) {
      setRangeError(`Scegli pagine tra 1 e ${last}.`);
      return null;
    }
    if (a > b) {
      setRangeError("La prima pagina deve venire prima dell’ultima.");
      return null;
    }
    setRangeError(null);
    return [a, b];
  };

  const run = async (kind: Kind) => {
    const r = parseRange();
    if (!r) {
      document.getElementById(`${ids}-from`)?.focus();
      return;
    }
    const range = r[0] === r[1] ? `p. ${r[0]}` : `pp. ${r[0]}–${r[1]}`;
    setLoading(kind);
    setError(null);
    const text = await docTextWithMarkers(doc.id, r[0], r[1]);
    if (text.length < 40) {
      setLoading(null);
      setError({ kind, message: "Nelle pagine scelte c’è troppo poco testo. Allarga l’intervallo." });
      return;
    }
    const apiKind = kind === "plan" ? "flashcards" : kind;
    const res = await postJSON<{ data: unknown }>("/api/ai/generate", { kind: apiKind, title: doc.name, text, count: kind === "quiz" ? 10 : 12 });
    setLoading(null);
    if (!res.ok) {
      setError({ kind, message: res.error.message || "Il servizio AI non ha risposto. Riprova tra poco." });
      return;
    }
    const data = res.data.data as Record<string, unknown>;
    let result: Result;
    if (kind === "summary") result = { kind, data: data as unknown as SummaryOut, range };
    else if (kind === "flashcards" || kind === "plan") {
      const cards = (data.cards as CardOut[]) ?? [];
      result = { kind, data: cards, range };
      if (kind === "plan") {
        const n = addCards(cards.map((c) => toCard(doc, c)));
        result.added = n;
        toast(n ? `${pluralize(n, "flashcard aggiunta", "flashcard aggiunte")} al ripasso` : "Nessuna flashcard nuova", {
          tone: n ? "success" : "info",
          description: n ? `Nel mazzo «${doc.name}».` : "Le domande generate erano già nel mazzo.",
        });
      }
    } else if (kind === "conceptmap") {
      const map = data as unknown as ConceptMap;
      const nodeIds = new Set(map.nodes.map((n) => n.id));
      result = { kind, data: { nodes: map.nodes, edges: map.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to) && e.from !== e.to) }, range };
    } else {
      const qs = ((data.questions as QuizOut[]) ?? []).flatMap<Question>((q, i) => {
        const base = { id: `doc-${doc.id}-${Date.now()}-${i}`, subject: doc.subject ?? "biologia", topicId: doc.name, explanation: q.page ? `${q.explanation} (p. ${q.page})` : q.explanation, difficulty: 2 as const, skill: "concetto" as const };
        if (q.type === "mcq" && q.options.length === 5 && q.correctIndex >= 0 && q.correctIndex < 5) return [{ ...base, type: "mcq", stem: q.stem, options: q.options, correct: q.correctIndex }];
        if (q.type === "cloze" && q.answer) return [{ ...base, type: "cloze", stem: q.stem, answers: [q.answer] }];
        return [];
      });
      result = { kind: "quiz", data: qs, range };
    }
    setResults((x) => ({ ...x, [kind]: result }));
    setShown(kind);
  };

  const done = (Object.keys(results) as Kind[]).filter((k) => results[k]);
  const current = shown && results[shown] ? results[shown]! : null;
  const busy = !!loading;

  const rangeBtn = "inline-flex h-8 items-center rounded-lg border border-white/[0.1] px-2.5 text-ui text-fg-muted transition-colors hover:border-white/[0.18] hover:text-fg";

  return (
    <div className="space-y-6">
      {/* Pages */}
      <fieldset>
        <legend className="mb-2 text-ui font-medium text-fg-muted">Pagine da usare</legend>
        <div className="flex items-center gap-2">
          <label htmlFor={`${ids}-from`} className="text-sm text-fg-muted">Da</label>
          <Input
            id={`${ids}-from`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={from}
            onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))}
            onBlur={parseRange}
            onFocus={(e) => e.target.select()}
            aria-invalid={!!rangeError || undefined}
            aria-describedby={rangeError ? `${ids}-range-err` : undefined}
            className="w-16 text-center tabular-nums"
          />
          <label htmlFor={`${ids}-to`} className="text-sm text-fg-muted">a</label>
          <Input
            id={`${ids}-to`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={to}
            onChange={(e) => setTo(e.target.value.replace(/\D/g, ""))}
            onBlur={parseRange}
            onFocus={(e) => e.target.select()}
            aria-invalid={!!rangeError || undefined}
            aria-describedby={rangeError ? `${ids}-range-err` : undefined}
            className="w-16 text-center tabular-nums"
          />
          <span className="text-sm text-fg-subtle">di {last}</span>
        </div>
        {rangeError && (
          <p id={`${ids}-range-err`} role="alert" className="mt-2 text-sm text-orange-300">
            {rangeError}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button type="button" className={rangeBtn} onClick={() => { setFrom(String(page)); setTo(String(page)); setRangeError(null); }}>
            Solo pagina {page}
          </button>
          <button type="button" className={rangeBtn} onClick={() => { setFrom("1"); setTo(String(last)); setRangeError(null); }}>
            Tutto il documento
          </button>
        </div>
      </fieldset>

      {/* Generate */}
      <section aria-labelledby={`${ids}-gen`}>
        <h2 id={`${ids}-gen`} className="mb-2 text-ui font-medium text-fg-muted">Genera dal testo</h2>
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-control border border-white/[0.08]">
          {TOOLS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => run(t.id)}
                disabled={busy}
                aria-busy={loading === t.id || undefined}
                className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <t.icon className={cn("mt-0.5 h-4 w-4 shrink-0", loading === t.id ? "text-azure-300" : "text-fg-subtle")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-fg-subtle">{t.hint}</span>
                </span>
                {loading === t.id ? <Spinner label={`Generazione: ${t.label}`} /> : results[t.id] ? <span className="shrink-0 text-xs text-fg-subtle">Rigenera</span> : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 rounded-control border border-white/[0.08] px-3.5 py-3">
          <div className="flex items-start gap-3">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-fg">Piano di ripasso</div>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
                Genera fino a 12 flashcard e le aggiunge subito al mazzo «{doc.name}», con ripassi dopo 1, 3, 7 e 16 giorni.
              </p>
              <Button size="sm" variant="secondary" className="mt-2.5" onClick={() => run("plan")} disabled={busy} loading={loading === "plan"}>
                {loading !== "plan" && <Plus className="h-4 w-4" aria-hidden />} Crea piano di ripasso
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div aria-live="polite" className="space-y-3">
        {busy && <p className="text-sm text-fg-muted">Generazione in corso: può richiedere fino a mezzo minuto.</p>}
        {error && (
          <Notice
            tone="warning"
            title="Generazione non riuscita"
            action={
              <Button size="sm" variant="ghost" onClick={() => run(error.kind)} disabled={busy}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Riprova
              </Button>
            }
          >
            {error.message}
          </Notice>
        )}
      </div>

      {/* Results */}
      {current && (
        <section aria-labelledby={`${ids}-res`} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`${ids}-res`} className="text-sm font-semibold text-fg">
              {LABEL[current.kind]} <span className="font-normal text-fg-subtle">({current.range})</span>
            </h2>
            {done.length > 1 && (
              <Segmented size="sm" ariaLabel="Risultati generati" value={shown!} onChange={setShown} options={done.map((k) => ({ value: k, label: LABEL[k] }))} />
            )}
          </div>

          {current.kind === "summary" && (
            <div className="space-y-4 text-sm">
              <Markdown source={current.data.summary} />
              {current.data.keyPoints.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-ui font-medium text-fg-muted">Punti chiave</h3>
                  <ul className="list-disc space-y-1 pl-5 leading-relaxed text-fg-reading marker:text-fg-subtle">
                    {current.data.keyPoints.map((k) => <li key={k}>{k}</li>)}
                  </ul>
                </div>
              )}
              {current.data.definitions.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-ui font-medium text-fg-muted">Definizioni</h3>
                  <dl className="space-y-2 leading-relaxed">
                    {current.data.definitions.map((d) => (
                      <div key={d.term}>
                        <dt className="font-medium text-fg">{d.term}</dt>
                        <dd className="text-fg-muted">{d.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {current.data.uncertainties.length > 0 && (
                <Notice tone="warning" title="Da verificare sulla fonte">
                  <ul className="list-disc space-y-0.5 pl-4">{current.data.uncertainties.map((u) => <li key={u}>{u}</li>)}</ul>
                </Notice>
              )}
              {current.data.pages.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-fg-subtle">Pagine più rilevanti:</span>
                  {current.data.pages.map((p) =>
                    onGoToPage ? (
                      <button key={p} type="button" onClick={() => onGoToPage(p)} className="inline-flex h-8 items-center rounded-lg border border-white/[0.1] px-2.5 text-ui text-azure-200 hover:bg-white/[0.04]">
                        p. {p}
                      </button>
                    ) : (
                      <span key={p} className="text-xs text-fg-muted">p. {p}</span>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {(current.kind === "flashcards" || current.kind === "plan") && (
            <div className="space-y-2">
              {current.kind === "plan" && current.added !== undefined && (
                <Notice tone="success" title={current.added ? `${pluralize(current.added, "flashcard aggiunta", "flashcard aggiunte")} al ripasso` : "Nessuna flashcard nuova"}>
                  {current.added
                    ? `Primi ripassi: ${[1, 3, 7, 16].map((d) => fmt.dateShort(addDays(new Date(), d))).join(", ")}. Gli intervalli poi si adattano alle tue risposte.`
                    : "Le domande generate erano già nel mazzo."}
                </Notice>
              )}
              {current.kind === "flashcards" && current.data.length > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={current.added !== undefined}
                  onClick={() => {
                    const n = addCards(current.data.map((c) => toCard(doc, c)));
                    setResults((x) => ({ ...x, flashcards: { ...current, added: n } }));
                    toast(n ? `${pluralize(n, "flashcard aggiunta", "flashcard aggiunte")} al ripasso` : "Nessuna flashcard nuova", { tone: n ? "success" : "info", description: n ? `Nel mazzo «${doc.name}».` : "Erano già tutte nel mazzo." });
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden /> {current.added !== undefined ? "Aggiunte al ripasso" : `Aggiungi ${current.data.length} al ripasso`}
                </Button>
              )}
              {current.data.length === 0 && <Notice tone="info">Non sono uscite flashcard valide. Prova con più pagine.</Notice>}
              <ul className="space-y-2">
                {current.data.map((c, i) => (
                  <li key={i} className="rounded-control border border-white/[0.07] px-3.5 py-3 text-sm">
                    <div className="font-medium text-fg">{c.front}</div>
                    <div className="mt-1 leading-relaxed text-fg-muted">{c.back}</div>
                    {c.page && <div className="mt-1.5 text-xs text-fg-subtle">Pagina {c.page}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {current.kind === "conceptmap" &&
            (current.data.nodes.length ? (
              <ConceptMapView map={current.data} label={`Mappa di «${doc.name}»`} />
            ) : (
              <Notice tone="info">La mappa generata era vuota. Riprova con più pagine.</Notice>
            ))}

          {current.kind === "quiz" &&
            (current.data.length ? (
              <QuizRunner questions={current.data} title={`Domande su «${doc.name}»`} sourceLabel="generate dall’AI dal tuo documento" seed={1} compactSummary />
            ) : (
              <Notice tone="info">L’AI non ha prodotto domande valide. Riprova con altre pagine.</Notice>
            ))}
        </section>
      )}

      <p className="text-xs leading-relaxed text-fg-subtle">
        Il testo delle pagine scelte viene inviato al servizio AI solo per questa richiesta. Controlla sempre i risultati sulla fonte.
      </p>
    </div>
  );
}
