"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bookmark, Highlighter, ListTree, Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import { Button, Input, Kbd, TabPanel, Tabs, Textarea } from "@/components/ui/primitives";
import type { LibraryDoc } from "@/lib/store";
import type { DocMeta, PageText } from "@/lib/library";
import { cn, pluralize } from "@/lib/utils";
import { AiTools } from "./ai-tools";
import { snippetLoose } from "./doc-text";
import { HL, displayColor } from "./shared";

export type PanelTab = "indice" | "annotazioni" | "cerca" | "ai";
export const PANEL_TABS: PanelTab[] = ["indice", "annotazioni", "cerca", "ai"];

export interface OutlineItem {
  title: string;
  page: number | null;
  depth: number;
}

export interface SearchState {
  query: string;
  setQuery: (q: string) => void;
  /** Pages with matches, in page order. */
  hits: { page: number; count: number }[];
  total: number;
  /** Too short to search (fewer than 2 letters). */
  short: boolean;
  pending: boolean;
  current: { page: number; i: number } | null;
  onPick: (page: number) => void;
}

const BASE = "reader-panel";

export function ReaderPanel({
  doc,
  meta,
  page,
  numPages,
  texts,
  outline,
  outlineKind,
  tab,
  setTab,
  onGo,
  search,
  canSearch,
  onSaveNote,
  onDelete,
  undo,
  onUndo,
  onToggleBookmark,
  className,
}: {
  doc: LibraryDoc;
  meta: DocMeta;
  page: number;
  numPages: number;
  texts: PageText[];
  outline: OutlineItem[];
  outlineKind: "pdf" | "detected" | "markdown" | null;
  tab: PanelTab;
  setTab: (t: PanelTab) => void;
  onGo: (page: number, markId?: string) => void;
  search: SearchState;
  canSearch: boolean;
  onSaveNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  undo: { label: string } | null;
  onUndo: () => void;
  onToggleBookmark: (page: number) => void;
  className?: string;
}) {
  const annotations = doc.highlights.length + doc.bookmarks.length;
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <Tabs
        base={BASE}
        ariaLabel="Strumenti di lettura"
        value={tab}
        onChange={setTab}
        className="shrink-0 px-4"
        items={[
          { value: "indice", label: "Indice" },
          { value: "annotazioni", label: "Annotazioni", count: annotations || undefined },
          { value: "cerca", label: "Cerca", count: search.total || undefined },
          { value: "ai", label: "AI" },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        {tab === "indice" && (
          <TabPanel base={BASE} value="indice">
            <IndexTab page={page} numPages={numPages} texts={texts} outline={outline} outlineKind={outlineKind} onGo={onGo} />
          </TabPanel>
        )}
        {tab === "annotazioni" && (
          <TabPanel base={BASE} value="annotazioni">
            <AnnotationsTab doc={doc} meta={meta} page={page} onGo={onGo} onSaveNote={onSaveNote} onDelete={onDelete} undo={undo} onUndo={onUndo} onToggleBookmark={onToggleBookmark} />
          </TabPanel>
        )}
        {tab === "cerca" && (
          <TabPanel base={BASE} value="cerca">
            <SearchTab search={search} texts={texts} page={page} canSearch={canSearch} />
          </TabPanel>
        )}
        {/* AI stays mounted while hidden so a running generation and its results survive tab switches. */}
        <div hidden={tab !== "ai"}>
          <TabPanel base={BASE} value="ai">
            <AiTools doc={doc} page={page} onGoToPage={onGo} />
          </TabPanel>
        </div>
      </div>
    </div>
  );
}

// ── Indice ────────────────────────────────────────────────────

function IndexTab({
  page,
  numPages,
  texts,
  outline,
  outlineKind,
  onGo,
}: {
  page: number;
  numPages: number;
  texts: PageText[];
  outline: OutlineItem[];
  outlineKind: "pdf" | "detected" | "markdown" | null;
  onGo: (p: number) => void;
}) {
  // The current chapter is the last entry that starts on or before this page.
  let active = -1;
  outline.forEach((o, i) => {
    if (o.page !== null && o.page <= page) active = i;
  });
  const firstLine = (p: number) => {
    const t = texts.find((x) => x.page === p)?.text ?? "";
    return t.replace(/\s+/g, " ").trim().slice(0, 90);
  };

  return (
    <div className="space-y-6">
      {outline.length > 0 && (
        <section aria-labelledby="idx-outline">
          <h2 id="idx-outline" className="mb-2 text-ui font-medium text-fg-muted">
            {outlineKind === "detected" ? "Titoli trovati nel testo" : "Capitoli"}
          </h2>
          <ul className="space-y-px">
            {outline.map((o, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={!o.page}
                  onClick={() => o.page && onGo(o.page)}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "relative flex min-h-10 w-full items-baseline justify-between gap-3 rounded-lg py-2 pr-2 text-left text-sm transition-colors hover:bg-white/[0.05] disabled:opacity-50",
                    i === active ? "bg-azure-500/[0.08] text-fg" : "text-fg-muted",
                  )}
                  style={{ paddingLeft: 12 + o.depth * 14 }}
                >
                  {i === active && <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-azure-400" aria-hidden />}
                  <span className="line-clamp-2">{o.title}</span>
                  {o.page && <span className="shrink-0 text-xs tabular-nums text-fg-subtle">p. {o.page}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outlineKind !== "pdf" && (
        <section aria-labelledby="idx-pages">
          <h2 id="idx-pages" className="mb-2 text-ui font-medium text-fg-muted">
            {pluralize(numPages, "pagina", "pagine")}
          </h2>
          {!outline.length && (
            <p className="mb-3 flex items-start gap-2 text-sm leading-relaxed text-fg-subtle">
              <ListTree className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Il documento non ha un indice dei capitoli: scegli una pagina.
            </p>
          )}
          <ul className="space-y-px">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => {
              const line = firstLine(p);
              return (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => onGo(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-10 w-full gap-3 rounded-lg py-2 pl-3 pr-2 text-left text-sm transition-colors hover:bg-white/[0.05]",
                      p === page ? "bg-azure-500/[0.08] text-fg" : "text-fg-muted",
                    )}
                  >
                    {p === page && <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-azure-400" aria-hidden />}
                    <span className="w-8 shrink-0 tabular-nums text-fg-subtle">{p}</span>
                    <span className="line-clamp-1 min-w-0">{line || <span className="text-fg-subtle">Pagina senza testo</span>}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── Annotazioni ───────────────────────────────────────────────

function AnnotationsTab({
  doc,
  meta,
  page,
  onGo,
  onSaveNote,
  onDelete,
  undo,
  onUndo,
  onToggleBookmark,
}: {
  doc: LibraryDoc;
  meta: DocMeta;
  page: number;
  onGo: (p: number, markId?: string) => void;
  onSaveNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  undo: { label: string } | null;
  onUndo: () => void;
  onToggleBookmark: (page: number) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const highlights = [...doc.highlights].sort((a, b) => a.page - b.page || a.createdAt.localeCompare(b.createdAt));
  const byPage = new Map<number, typeof highlights>();
  for (const h of highlights) byPage.set(h.page, [...(byPage.get(h.page) ?? []), h]);

  return (
    <div className="space-y-6">
      {undo && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-control border border-white/[0.1] bg-white/[0.04] py-1.5 pl-3 pr-1.5 text-sm text-fg-muted animate-fade-in">
          {undo.label}
          <Button
            size="sm"
            variant="ghost"
            autoFocus
            onClick={() => {
              onUndo();
              window.setTimeout(() => headingRef.current?.focus(), 30);
            }}
          >
            <span className="text-azure-200">Annulla</span>
          </Button>
        </div>
      )}

      <section aria-labelledby="ann-bookmarks">
        <h2 id="ann-bookmarks" className="mb-2 text-ui font-medium text-fg-muted">Segnalibri</h2>
        {doc.bookmarks.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {doc.bookmarks.map((b) => (
              <li key={b} className="flex">
                <button
                  type="button"
                  onClick={() => onGo(b)}
                  aria-current={b === page ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-l-lg border border-r-0 pl-2.5 pr-2 text-sm transition-colors",
                    b === page ? "border-azure-400/40 bg-azure-500/[0.08] text-fg" : "border-white/[0.1] text-fg-muted hover:bg-white/[0.04] hover:text-fg",
                  )}
                >
                  <Bookmark className="h-3.5 w-3.5 fill-current text-azure-300" aria-hidden /> Pagina {b}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleBookmark(b)}
                  aria-label={`Togli il segnalibro da pagina ${b}`}
                  className={cn(
                    "grid h-9 w-8 place-items-center rounded-r-lg border text-fg-subtle transition-colors hover:bg-white/[0.04] hover:text-fg",
                    b === page ? "border-azure-400/40" : "border-white/[0.1]",
                  )}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-fg-subtle">Nessun segnalibro. Usa il segnalibro nella barra per ritrovare una pagina.</p>
        )}
      </section>

      <section aria-labelledby="ann-highlights">
        <h2 id="ann-highlights" ref={headingRef} tabIndex={-1} className="mb-2 text-ui font-medium text-fg-muted">
          Evidenziazioni e note
        </h2>
        {highlights.length ? (
          <div className="space-y-5">
            {[...byPage].map(([p, items]) => (
              <div key={p}>
                <h3 className="mb-1.5 text-xs font-medium text-fg-subtle">Pagina {p}</h3>
                <ul className="space-y-2">
                  {items.map((h) => {
                    const c = displayColor(h, meta);
                    return (
                      <li key={h.id} className="relative rounded-control border border-white/[0.07] bg-white/[0.02] pl-3.5">
                        <span className="absolute inset-y-2 left-1.5 w-[3px] rounded-full" style={{ background: HL[c].swatch }} aria-hidden />
                        <button
                          type="button"
                          onClick={() => onGo(h.page, h.id)}
                          className="block w-full rounded-control px-2 pb-1 pt-2.5 text-left text-sm leading-relaxed text-fg-reading transition-colors hover:text-fg"
                        >
                          <span className="sr-only">Vai alla pagina {h.page}, evidenziato in {HL[c].label}: </span>
                          <span className="line-clamp-4">{h.text}</span>
                        </button>
                        {editing === h.id ? (
                          <NoteEditor
                            initial={h.note ?? ""}
                            onSave={(v) => {
                              onSaveNote(h.id, v);
                              setEditing(null);
                            }}
                            onCancel={() => setEditing(null)}
                          />
                        ) : (
                          h.note && <p className="mx-2 mb-1 whitespace-pre-line rounded-lg bg-white/[0.04] px-2.5 py-2 text-sm leading-relaxed text-fg">{h.note}</p>
                        )}
                        {editing !== h.id && (
                          <div className="flex justify-end gap-0.5 px-1 pb-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditing(h.id)}>
                              <Pencil className="h-3.5 w-3.5" aria-hidden /> {h.note ? "Modifica nota" : "Aggiungi nota"}
                            </Button>
                            <Button size="icon-sm" variant="ghost" onClick={() => onDelete(h.id)} aria-label="Elimina evidenziazione" title="Elimina" className="text-fg-subtle">
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-control border border-dashed border-white/[0.1] px-4 py-5 text-sm leading-relaxed text-fg-muted">
            <Highlighter className="mb-2 h-5 w-5 text-azure-300" aria-hidden />
            Seleziona una frase nella pagina: potrai evidenziarla, crearne una flashcard o fartela spiegare.
            <p className="mt-3 hidden flex-wrap items-center gap-1.5 text-xs text-fg-subtle [@media(pointer:fine)]:flex">
              <Kbd>←</Kbd> <Kbd>→</Kbd> cambiano pagina, <Kbd>/</Kbd> apre la ricerca, <Kbd>1</Kbd>–<Kbd>4</Kbd> evidenziano la selezione.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function NoteEditor({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <form
      className="px-2 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
    >
      <label className="sr-only" htmlFor="note-editor">Nota</label>
      <Textarea
        id="note-editor"
        ref={ref}
        rows={3}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Scrivi la tua nota"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSave(v);
          }
        }}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>Annulla</Button>
        <Button size="sm" variant="primary" type="submit">Salva nota</Button>
      </div>
    </form>
  );
}

// ── Cerca ─────────────────────────────────────────────────────

function SearchTab({ search, texts, page, canSearch }: { search: SearchState; texts: PageText[]; page: number; canSearch: boolean }) {
  if (!canSearch) {
    return <p className="text-sm leading-relaxed text-fg-muted">Questo documento non ha testo da cercare: è una scansione o un audio. L’OCR non è disponibile in questa versione.</p>;
  }
  const q = search.query.trim();
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <Input
          type="search"
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          placeholder="Cerca nel documento"
          aria-label="Cerca nel documento"
          className="pl-10"
        />
      </div>
      <Status>
        {!q ? (
          "Scrivi una parola: le occorrenze si colorano nella pagina."
        ) : search.short ? (
          "Scrivi almeno 2 lettere."
        ) : search.pending ? (
          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-azure-300" aria-hidden /> Ricerca…</span>
        ) : search.total ? (
          `${pluralize(search.total, "occorrenza", "occorrenze")} in ${pluralize(search.hits.length, "pagina", "pagine")}`
        ) : (
          `Nessuna occorrenza di «${q}».`
        )}
      </Status>
      {!search.short && !search.pending && search.hits.length > 0 && (
        <ul className="space-y-1.5">
          {search.hits.slice(0, 150).map((h) => {
            const sn = snippetLoose(texts.find((t) => t.page === h.page)?.text ?? "", q, 56);
            return (
              <li key={h.page}>
                <button
                  type="button"
                  onClick={() => search.onPick(h.page)}
                  aria-current={h.page === page ? "page" : undefined}
                  className={cn(
                    "w-full rounded-control border px-3 py-2.5 text-left text-sm transition-colors",
                    h.page === page ? "border-azure-400/35 bg-azure-500/[0.07]" : "border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.03]",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2 text-xs text-fg-subtle">
                    <span className="font-medium text-fg-muted">Pagina {h.page}</span>
                    {h.count > 1 && <span>{h.count} occorrenze</span>}
                  </span>
                  {sn && (
                    <span className="mt-1 line-clamp-3 block leading-relaxed text-fg-muted">
                      {sn.mark ? (
                        <>
                          {sn.text.slice(0, sn.mark[0])}
                          <mark className="rounded-[3px] bg-orange-400/25 px-0.5 text-fg">{sn.text.slice(sn.mark[0], sn.mark[1])}</mark>
                          {sn.text.slice(sn.mark[1])}
                        </>
                      ) : (
                        sn.text
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-fg-muted" aria-live="polite">
      {children}
    </p>
  );
}
