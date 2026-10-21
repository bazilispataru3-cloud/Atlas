"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, ExternalLink, FileAudio, Highlighter, Link2, ListTree, Loader2, Minus, Plus, Search, Sparkles, StickyNote, Trash2,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Badge, Button, Card, EmptyState, Input, Notice, Segmented, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { useUI } from "@/lib/ui-store";
import { getDocFile, getPageTexts, loadPdfjs, openPdf, type PageText } from "@/lib/library";
import { normText } from "@/lib/feynman";
import { cn, pluralize, uid } from "@/lib/utils";
import { AiTools } from "./ai-tools";

type Color = LibraryDoc["highlights"][number]["color"];
type OutlineItem = { title: string; page: number | null; depth: number };
type PanelTab = "ai" | "cerca" | "evidenziazioni" | "indice";

const COLOR_CLASS: Record<Color, string> = { azure: "bg-azure-400", gold: "bg-gold-400", rose: "bg-pink-400" };

async function flattenOutline(doc: PDFDocumentProxy): Promise<OutlineItem[]> {
  const outline = await doc.getOutline();
  if (!outline) return [];
  const out: OutlineItem[] = [];
  const walk = async (items: typeof outline, depth: number) => {
    for (const it of items) {
      let page: number | null = null;
      try {
        const dest = typeof it.dest === "string" ? await doc.getDestination(it.dest) : it.dest;
        const ref = dest?.[0];
        if (typeof ref === "number") page = ref + 1;
        else if (ref && typeof ref === "object") page = (await doc.getPageIndex(ref)) + 1;
      } catch {
        page = null;
      }
      out.push({ title: it.title, page, depth });
      if (it.items?.length && depth < 2) await walk(it.items, depth + 1);
    }
  };
  await walk(outline, 0);
  return out;
}

/** Renders one PDF page (canvas + selectable text layer) and marks highlights and search hits. */
function PdfPage({ pdf, page, zoom, marks, search }: { pdf: PDFDocumentProxy; page: number; zoom: number; marks: { text: string; color: Color }[]; search: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [rendered, setRendered] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    let textLayer: { cancel: () => void } | null = null;
    (async () => {
      const pdfjs = await loadPdfjs();
      const p = await pdf.getPage(page);
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      const scale = Math.min(3, (width / base.width) * zoom);
      const viewport = p.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;
      const canvas = canvasRef.current!;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      pageRef.current!.style.width = `${Math.floor(viewport.width)}px`;
      pageRef.current!.style.height = `${Math.floor(viewport.height)}px`;
      pageRef.current!.style.setProperty("--total-scale-factor", String(scale));
      renderTask = p.render({ canvas, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined });
      try {
        await renderTask.promise;
      } catch {
        return; // cancelled
      }
      if (cancelled) return;
      const layer = layerRef.current!;
      layer.replaceChildren();
      const tl = new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: layer, viewport });
      textLayer = tl;
      await tl.render().catch(() => undefined);
      if (!cancelled) setRendered((n) => n + 1);
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [pdf, page, zoom, width]);

  // Highlights and search hits are matched span by span on the rendered text layer.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !rendered) return;
    const normMarks = marks.map((m) => ({ ...m, n: normText(m.text) }));
    const q = normText(search);
    for (const span of Array.from(layer.querySelectorAll("span"))) {
      span.classList.remove("hl-azure", "hl-gold", "hl-rose", "search-hit");
      const t = normText(span.textContent ?? "");
      if (t.length < 3) continue;
      const hit = normMarks.find((m) => m.n.includes(t) || (t.length > 25 && t.includes(m.n)));
      if (hit) span.classList.add(`hl-${hit.color}`);
      if (q.length >= 3 && t.includes(q)) span.classList.add("search-hit");
    }
  }, [marks, search, rendered]);

  return (
    <div ref={wrapRef} className="w-full overflow-x-auto">
      <div ref={pageRef} className="pdf-page relative mx-auto bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        <canvas ref={canvasRef} className="absolute inset-0" />
        <div ref={layerRef} className="textLayer" />
      </div>
    </div>
  );
}

function TextPage({ text, marks, search }: { text: string; marks: { text: string; color: Color }[]; search: string }) {
  // Wrap highlighted passages (exact match) in <mark>.
  const parts = useMemo(() => {
    const ranges: { start: number; end: number; cls: string }[] = [];
    for (const m of marks) {
      const i = text.indexOf(m.text);
      if (i >= 0) ranges.push({ start: i, end: i + m.text.length, cls: m.color === "gold" ? "bg-gold-400/30" : m.color === "rose" ? "bg-pink-400/30" : "bg-azure-400/30" });
    }
    if (search.trim().length >= 3) {
      const lower = text.toLowerCase();
      const q = search.toLowerCase();
      let i = lower.indexOf(q);
      while (i >= 0 && ranges.length < 200) {
        ranges.push({ start: i, end: i + q.length, cls: "bg-emerald-400/40" });
        i = lower.indexOf(q, i + q.length);
      }
    }
    ranges.sort((a, b) => a.start - b.start);
    const out: { t: string; cls?: string }[] = [];
    let pos = 0;
    for (const r of ranges) {
      if (r.start < pos) continue;
      out.push({ t: text.slice(pos, r.start) });
      out.push({ t: text.slice(r.start, r.end), cls: r.cls });
      pos = r.end;
    }
    out.push({ t: text.slice(pos) });
    return out;
  }, [text, marks, search]);
  return (
    <article className="doc-text mx-auto max-w-3xl whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-[15px] leading-relaxed text-fg-muted">
      {parts.map((p, i) => (p.cls ? <mark key={i} className={cn("rounded px-0.5 text-fg", p.cls)}>{p.t}</mark> : <span key={i}>{p.t}</span>))}
    </article>
  );
}

export function DocReader({ docId }: { docId: string }) {
  const hydrated = useHydrated();
  const doc = useAtlas((s) => s.library.find((d) => d.id === docId));
  const updateDoc = useAtlas((s) => s.updateDoc);
  const openProfessor = useUI((s) => s.openProfessor);

  const [blob, setBlob] = useState<Blob | null | undefined>(undefined);
  const [texts, setTexts] = useState<PageText[]>([]);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<PanelTab>("ai");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState("");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [srcEdit, setSrcEdit] = useState(false);
  const [src, setSrc] = useState("");
  const restored = useRef(false);

  useEffect(() => {
    if (doc && !restored.current) {
      restored.current = true;
      setPage(doc.lastPage ?? 1);
      setSrc(doc.sourceUrl ?? "");
    }
  }, [doc]);

  // Load file + extracted text from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    getDocFile(docId).then((b) => !cancelled && setBlob(b ?? null));
    getPageTexts(docId).then((t) => !cancelled && setTexts(t));
    return () => {
      cancelled = true;
    };
  }, [docId]);

  // Open the PDF once.
  useEffect(() => {
    if (!blob || doc?.kind !== "pdf") return;
    let handle: Awaited<ReturnType<typeof openPdf>> | null = null;
    let cancelled = false;
    (async () => {
      try {
        handle = await openPdf(await blob.arrayBuffer());
        if (cancelled) return handle.close();
        setPdf(handle.doc);
        setOutline(await flattenOutline(handle.doc).catch(() => []));
      } catch {
        toast("Impossibile aprire il PDF", { tone: "warning" });
      }
    })();
    return () => {
      cancelled = true;
      setPdf(null);
      handle?.close();
    };
  }, [blob, doc?.kind]);

  useEffect(() => {
    if (!blob || doc?.kind !== "audio") return;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob, doc?.kind]);

  const numPages = doc?.pages ?? (pdf?.numPages || texts.length || 1);
  const go = useCallback(
    (p: number) => {
      const n = Math.max(1, Math.min(numPages, p));
      setPage(n);
      updateDoc(docId, { lastPage: n });
      setSelection("");
    },
    [numPages, docId, updateDoc],
  );

  // Track text selection inside the reading area.
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
      const anchor = sel?.anchorNode?.parentElement;
      setSelection(text && anchor?.closest("[data-reading-area]") ? text.slice(0, 800) : "");
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight") go(page + 1);
      if (e.key === "ArrowLeft") go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page]);

  const results = useMemo(() => {
    const q = normText(query);
    if (q.length < 3) return [];
    return texts
      .map((t) => {
        const n = normText(t.text);
        const i = n.indexOf(q);
        if (i < 0) return null;
        let count = 0;
        for (let k = i; k >= 0; k = n.indexOf(q, k + q.length)) count++;
        return { page: t.page, count, snippet: t.text.slice(Math.max(0, i - 60), i + q.length + 80) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [query, texts]);

  if (!hydrated) return <div className="mt-20 h-96 animate-pulse rounded-3xl bg-white/[0.03]" />;
  if (!doc) {
    return (
      <EmptyState
        className="mt-10"
        title="Documento non trovato"
        description="Potrebbe essere stato eliminato o caricato su un altro dispositivo: i file della biblioteca restano nel browser in cui li hai caricati."
        action={<Button variant="secondary" href="/biblioteca">Torna alla biblioteca</Button>}
      />
    );
  }

  const marks = doc.highlights.filter((h) => h.page === page);
  const bookmarked = doc.bookmarks.includes(page);
  const pageText = texts.find((t) => t.page === page)?.text ?? "";

  const addHighlight = (color: Color) => {
    if (!selection) return;
    updateDoc(doc.id, { highlights: [...doc.highlights, { id: uid("hl"), page, text: selection, color, createdAt: new Date().toISOString() }] });
    window.getSelection()?.removeAllRanges();
    setSelection("");
    toast("Passaggio evidenziato");
  };

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" href="/biblioteca"><ArrowLeft className="h-4 w-4" /> Biblioteca</Button>
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold text-fg" title={doc.name}>{doc.name}</h1>
        <Button variant="secondary" size="sm" onClick={() => openProfessor({ docId: doc.id })}>
          <Sparkles className="h-4 w-4 text-azure-300" /> Chiedi al Professor
        </Button>
      </div>

      {/* Source link */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-fg-subtle">
        <Link2 className="h-3.5 w-3.5" />
        {srcEdit ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = src.trim();
              if (v && !/^https?:\/\//i.test(v)) return toast("Inserisci un indirizzo che inizi con https://", { tone: "warning" });
              updateDoc(doc.id, { sourceUrl: v || undefined });
              setSrcEdit(false);
            }}
          >
            <Input value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://… (pagina dell’editore, del corso o del docente)" className="h-8 max-w-md text-[12.5px]" autoFocus />
            <Button size="sm" type="submit">Salva</Button>
          </form>
        ) : doc.sourceUrl ? (
          <>
            <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-md items-center gap-1 truncate text-azure-300 hover:underline">{doc.sourceUrl} <ExternalLink className="h-3 w-3 shrink-0" /></a>
            <button onClick={() => setSrcEdit(true)} className="hover:text-fg">Modifica</button>
          </>
        ) : (
          <button onClick={() => setSrcEdit(true)} className="hover:text-fg">Collega alla fonte originale</button>
        )}
      </div>

      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {doc.kind === "audio" ? (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.05] text-fg-muted"><FileAudio className="h-5 w-5" /></span>
                <div className="text-[14px] text-fg">Registrazione</div>
              </div>
              {audioUrl ? <audio controls src={audioUrl} className="mt-4 w-full" /> : <Loader2 className="mt-4 h-5 w-5 animate-spin text-fg-subtle" />}
              <Notice tone="info" className="mt-4">La trascrizione automatica non è disponibile in questa versione: l’audio si può ascoltare ma non cercare o analizzare con l’AI.</Notice>
            </Card>
          ) : (
            <>
              {/* Toolbar */}
              <div className="sticky top-14 z-10 -mx-1 mb-3 flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-ink-900/90 p-1.5 backdrop-blur-xl lg:top-16">
                <Button size="icon" variant="ghost" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Pagina precedente"><ChevronLeft className="h-4 w-4" /></Button>
                <form onSubmit={(e) => { e.preventDefault(); const v = Number(new FormData(e.currentTarget).get("p")); if (v) go(v); }} className="flex items-center gap-1 text-[12.5px] text-fg-subtle">
                  <input key={page} name="p" defaultValue={page} className="h-8 w-12 rounded-lg border border-white/10 bg-white/[0.03] text-center font-mono text-[12.5px] text-fg focus:outline-none" aria-label="Vai alla pagina" />
                  / {numPages}
                </form>
                <Button size="icon" variant="ghost" onClick={() => go(page + 1)} disabled={page >= numPages} aria-label="Pagina successiva"><ChevronRight className="h-4 w-4" /></Button>
                {doc.kind === "pdf" && (
                  <>
                    <span className="mx-1 h-5 w-px bg-white/10" />
                    <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} aria-label="Riduci"><Minus className="h-4 w-4" /></Button>
                    <span className="w-10 text-center font-mono text-[11.5px] text-fg-subtle">{Math.round(zoom * 100)}%</span>
                    <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))} aria-label="Ingrandisci"><Plus className="h-4 w-4" /></Button>
                  </>
                )}
                <span className="mx-1 h-5 w-px bg-white/10" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => updateDoc(doc.id, { bookmarks: bookmarked ? doc.bookmarks.filter((b) => b !== page) : [...doc.bookmarks, page].sort((a, b) => a - b) })}
                  aria-label={bookmarked ? "Rimuovi segnalibro" : "Aggiungi segnalibro"}
                  title={bookmarked ? "Rimuovi segnalibro" : "Segnalibro su questa pagina"}
                >
                  {bookmarked ? <BookmarkCheck className="h-4 w-4 text-gold-300" /> : <Bookmark className="h-4 w-4" />}
                </Button>
                {selection && (
                  <div className="ml-auto flex items-center gap-1 rounded-xl bg-white/[0.05] px-1.5 py-1 animate-fade-in">
                    <Highlighter className="ml-1 h-3.5 w-3.5 text-fg-subtle" />
                    {(["gold", "azure", "rose"] as Color[]).map((c) => (
                      <button key={c} onClick={() => addHighlight(c)} className={cn("h-5 w-5 rounded-full ring-2 ring-transparent transition hover:ring-white/40", COLOR_CLASS[c])} aria-label={`Evidenzia (${c})`} />
                    ))}
                    <button
                      onClick={() => openProfessor({ docId: doc.id, prompt: `Spiegami questo passaggio di «${doc.name}» (p. ${page}): «${selection}»` })}
                      className="ml-1 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[12px] text-azure-200 hover:bg-white/[0.06]"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Spiega
                    </button>
                  </div>
                )}
              </div>

              <div data-reading-area>
                {doc.kind === "pdf" ? (
                  blob === null ? (
                    <Notice tone="warning">Il file non è presente in questo browser.</Notice>
                  ) : pdf ? (
                    <PdfPage pdf={pdf} page={page} zoom={zoom} marks={marks} search={query} />
                  ) : (
                    <div className="grid h-96 place-items-center rounded-2xl bg-white/[0.02]"><Loader2 className="h-6 w-6 animate-spin text-fg-subtle" /></div>
                  )
                ) : (
                  <TextPage text={pageText} marks={marks} search={query} />
                )}
              </div>
              <p className="mt-3 text-center text-[11.5px] text-fg-subtle">Seleziona del testo per evidenziarlo o farlo spiegare. Frecce ← → per cambiare pagina.</p>
            </>
          )}
        </div>

        {/* Side panel */}
        <aside className="min-w-0">
          <div className="xl:sticky xl:top-20">
            <Segmented
              size="sm"
              value={tab}
              onChange={setTab}
              className="w-full"
              options={[
                { value: "ai", label: "AI" },
                { value: "cerca", label: "Cerca" },
                { value: "evidenziazioni", label: `Note (${doc.highlights.length})` },
                { value: "indice", label: "Indice" },
              ]}
            />
            <Card className="mt-3 max-h-[calc(100dvh-180px)] overflow-y-auto p-4">
              {tab === "ai" && <AiTools doc={doc} page={page} />}

              {tab === "cerca" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca nel testo…" className="h-9 pl-9" aria-label="Cerca nel documento" />
                  </div>
                  {!doc.textIndexed && <Notice tone="info">Questo documento non ha testo ricercabile.</Notice>}
                  {query.trim().length >= 3 && (
                    <div className="text-[12px] text-fg-subtle">{results.length ? `${pluralize(results.reduce((a, r) => a + r.count, 0), "risultato", "risultati")} in ${pluralize(results.length, "pagina", "pagine")}` : "Nessun risultato"}</div>
                  )}
                  <ul className="space-y-1.5">
                    {results.slice(0, 60).map((r) => (
                      <li key={r.page}>
                        <button onClick={() => go(r.page)} className={cn("w-full rounded-xl border px-3 py-2 text-left text-[12.5px] transition", r.page === page ? "border-emerald-400/40 bg-emerald-500/[0.06]" : "border-white/[0.06] hover:border-white/15")}>
                          <span className="font-mono text-[11px] text-fg-subtle">p. {r.page}{r.count > 1 ? ` · ${r.count}×` : ""}</span>
                          <span className="mt-0.5 line-clamp-2 block text-fg-muted">…{r.snippet}…</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === "evidenziazioni" && (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-[12px] font-medium text-fg-muted">Segnalibri</div>
                    {doc.bookmarks.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {doc.bookmarks.map((b) => (
                          <button key={b} onClick={() => go(b)} className={cn("rounded-lg border px-2 py-1 font-mono text-[12px] transition", b === page ? "border-gold-400/50 text-gold-200" : "border-white/10 text-fg-subtle hover:text-fg")}>p. {b}</button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12.5px] text-fg-subtle">Nessun segnalibro.</p>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 text-[12px] font-medium text-fg-muted">Evidenziazioni e note</div>
                    {doc.highlights.length ? (
                      <ul className="space-y-2">
                        {[...doc.highlights].sort((a, b) => a.page - b.page).map((h) => (
                          <li key={h.id} className="rounded-xl border border-white/[0.07] p-3">
                            <div className="flex items-center gap-2">
                              <span className={cn("h-2.5 w-2.5 rounded-full", COLOR_CLASS[h.color])} />
                              <button onClick={() => go(h.page)} className="font-mono text-[11px] text-fg-subtle hover:text-fg">p. {h.page}</button>
                              <div className="ml-auto flex gap-1">
                                <button onClick={() => setNoteFor(noteFor === h.id ? null : h.id)} className="rounded p-1 text-fg-subtle hover:text-fg" aria-label="Nota"><StickyNote className="h-3.5 w-3.5" /></button>
                                <button onClick={() => updateDoc(doc.id, { highlights: doc.highlights.filter((x) => x.id !== h.id) })} className="rounded p-1 text-fg-subtle hover:text-fg" aria-label="Elimina evidenziazione"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                            <p className="mt-1.5 line-clamp-4 text-[12.5px] leading-relaxed text-fg-muted">«{h.text}»</p>
                            {noteFor === h.id ? (
                              <Textarea
                                rows={3}
                                autoFocus
                                defaultValue={h.note}
                                placeholder="La tua nota…"
                                className="mt-2 text-[12.5px]"
                                onBlur={(e) => {
                                  updateDoc(doc.id, { highlights: doc.highlights.map((x) => (x.id === h.id ? { ...x, note: e.target.value.trim() || undefined } : x)) });
                                  setNoteFor(null);
                                }}
                              />
                            ) : (
                              h.note && <p className="mt-1.5 rounded-lg bg-white/[0.03] px-2 py-1.5 text-[12.5px] text-fg">{h.note}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12.5px] text-fg-subtle">Seleziona del testo nella pagina e scegli un colore.</p>
                    )}
                  </div>
                </div>
              )}

              {tab === "indice" && (
                <div>
                  {outline.length ? (
                    <ul className="space-y-0.5">
                      {outline.map((o, i) => (
                        <li key={i}>
                          <button
                            disabled={!o.page}
                            onClick={() => o.page && go(o.page)}
                            className={cn("flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition hover:bg-white/[0.04] disabled:opacity-50", o.page === page ? "text-fg" : "text-fg-muted")}
                            style={{ paddingLeft: 8 + o.depth * 14 }}
                          >
                            <span className="line-clamp-2">{o.title}</span>
                            {o.page && <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{o.page}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2 text-[12.5px] text-fg-subtle">
                      <p className="flex items-center gap-2"><ListTree className="h-4 w-4" /> {doc.kind === "pdf" ? "Questo PDF non contiene un indice dei capitoli." : "I documenti di testo non hanno un indice."}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: Math.min(numPages, 60) }, (_, i) => i + 1).map((p) => (
                          <button key={p} onClick={() => go(p)} className={cn("h-8 w-10 rounded-lg border font-mono text-[11.5px] transition", p === page ? "border-azure-400/50 text-azure-200" : "border-white/[0.07] hover:text-fg")}>{p}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {doc.bookmarks.length > 0 && <Badge tone="gold" className="mt-3"><BookmarkCheck className="h-3 w-3" /> {pluralize(doc.bookmarks.length, "segnalibro", "segnalibri")}</Badge>}
                </div>
              )}
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
