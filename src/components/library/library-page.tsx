"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { BookmarkCheck, FileUp, Highlighter, Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { SUBJECTS } from "@/data/syllabus";
import { Badge, Button, Card, EmptyState, Input, Meridian, Modal, PageHeader, ProgressBar, Segmented, Select, Skeleton } from "@/components/ui/primitives";
import { SUBJECT_TONE } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { deleteDocData, getAllDocMeta, searchLibrary, type DocMeta, type LibraryHit } from "@/lib/library";
import { cn, fmt, pluralize } from "@/lib/utils";
import { fold } from "./doc-text";
import { DocDetailsModal } from "./doc-details-modal";
import { DOC_TYPE, docType, sizeLabel, useLocalPref, type DocType } from "./shared";
import { Uploader, useConsent, useIngest } from "./uploader";

type Sort = "aperti" | "aggiunti" | "titolo";
type TypeFilter = "tutti" | DocType;
type SubjectFilter = "tutte" | "nessuna" | SubjectId;

const SORTS: Sort[] = ["aperti", "aggiunti", "titolo"];

function subjectName(id?: SubjectId) {
  return SUBJECTS.find((s) => s.id === id)?.name;
}

/** "PDF, 5 pagine" / "Sbobina, 3 pagine" / "Audio, 4 MB". */
function describe(doc: LibraryDoc, meta?: DocMeta) {
  const t = DOC_TYPE[docType(doc, meta)].label;
  if (doc.kind === "audio") return `${t}, ${sizeLabel(doc.size)}`;
  return doc.pages ? `${t}, ${pluralize(doc.pages, "pagina", "pagine")}` : t;
}

export function LibraryPage() {
  const hydrated = useHydrated();
  const library = useAtlas((s) => s.library);
  const removeDoc = useAtlas((s) => s.removeDoc);
  const docs = useMemo(() => (hydrated ? library : []), [hydrated, library]);
  const { jobs, ingest, busy, clearFinished } = useIngest();
  const consent = useConsent();

  const [metas, setMetas] = useState<Record<string, DocMeta>>({});
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("tutti");
  const [subject, setSubject] = useState<SubjectFilter>("tutte");
  const [sort, setSort] = useLocalPref<Sort>("atlas-library-sort", "aperti", SORTS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<LibraryDoc | null>(null);
  const [toDelete, setToDelete] = useState<LibraryDoc | null>(null);
  const [contentHits, setContentHits] = useState<{ docId: string; total: number; hits: LibraryHit[] }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const dragDepth = useRef(0);

  const idsKey = docs.map((d) => d.id).join(",");
  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    getAllDocMeta(idsKey.split(",")).then((m) => !cancelled && setMetas(m));
    return () => {
      cancelled = true;
    };
    // Re-read when a document is added or its text becomes ready.
  }, [idsKey, jobs.length, busy]);

  // Search inside the text of every document (debounced).
  const q = query.trim();
  useEffect(() => {
    if (fold(q).replace(/\s/g, "").length < 3 || !idsKey) {
      setContentHits(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = window.setTimeout(() => {
      searchLibrary(idsKey.split(","), q).then((r) => {
        if (cancelled) return;
        setContentHits(r);
        setSearching(false);
      });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, idsKey]);

  const types = useMemo(() => {
    const counts: Record<DocType, number> = { pdf: 0, sbobina: 0, appunti: 0, audio: 0 };
    for (const d of docs) counts[docType(d, metas[d.id])]++;
    return counts;
  }, [docs, metas]);

  const filtered = useMemo(() => {
    const fq = fold(q);
    const list = docs.filter((d) => {
      if (type !== "tutti" && docType(d, metas[d.id]) !== type) return false;
      if (subject === "nessuna" && d.subject) return false;
      if (subject !== "tutte" && subject !== "nessuna" && d.subject !== subject) return false;
      if (fq && !fold(d.name).includes(fq)) return false;
      return true;
    });
    const opened = (d: LibraryDoc) => metas[d.id]?.lastOpenedAt ?? "";
    return [...list].sort((a, b) => {
      if (sort === "titolo") return a.name.localeCompare(b.name, "it", { sensitivity: "base", numeric: true });
      if (sort === "aperti") {
        const c = opened(b).localeCompare(opened(a));
        if (c) return c;
      }
      return b.addedAt.localeCompare(a.addedAt);
    });
  }, [docs, metas, q, type, subject, sort]);

  const resume = useMemo(() => {
    let best: LibraryDoc | null = null;
    let at = "";
    for (const d of docs) {
      const o = metas[d.id]?.lastOpenedAt;
      if (o && o > at && d.kind !== "audio") {
        best = d;
        at = o;
      }
    }
    return best;
  }, [docs, metas]);

  const filtersOn = type !== "tutti" || subject !== "tutte" || !!q;
  const resetFilters = () => {
    setType("tutti");
    setSubject("tutte");
    setQuery("");
  };

  const jobFor = (id: string) => jobs.find((j) => j.id === id && (j.phase === "lettura" || j.phase === "salvataggio"));

  const onDragEnter = (e: DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    dragDepth.current++;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (!dragDepth.current) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    if (consent.consentAt) ingest(files, "");
    else setPending(files);
    setUploadOpen(true);
  };

  const typeOptions = (["tutti", "pdf", "sbobina", "appunti", "audio"] as TypeFilter[])
    .filter((t) => t === "tutti" || t === type || types[t as DocType] > 0)
    .map((t) => ({
      value: t,
      label: t === "tutti" ? `Tutti ${docs.length}` : `${DOC_TYPE[t].plural} ${types[t]}`,
    }));

  const docById = (id: string) => docs.find((d) => d.id === id);

  return (
    <div
      className="relative pb-12"
      onDragEnter={docs.length ? onDragEnter : undefined}
      onDragLeave={docs.length ? onDragLeave : undefined}
      onDragOver={docs.length ? (e) => e.preventDefault() : undefined}
      onDrop={docs.length ? onDrop : undefined}
    >
      <PageHeader
        title="Biblioteca"
        description="Dispense, sbobine e appunti in un solo posto: leggili, cerca, evidenzia e trasforma le pagine in materiale di ripasso."
        actions={
          docs.length > 0 && (
            <Button variant={resume ? "secondary" : "primary"} onClick={() => setUploadOpen(true)}>
              <FileUp className="h-4 w-4" aria-hidden /> Aggiungi materiali
            </Button>
          )
        }
      />

      {!hydrated ? (
        <div className="mt-8 space-y-3" aria-busy="true">
          <Skeleton className="h-11 w-full max-w-xl" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] w-full" />)}
        </div>
      ) : docs.length === 0 ? (
        <Card className="mt-8 max-w-3xl p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-fg">Aggiungi il primo documento</h2>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-fg-muted">
            Carica un PDF, la sbobina di una lezione o i tuoi appunti. Potrai leggerli anche in versione testo, evidenziare passaggi e creare flashcard.
          </p>
          <div className="mt-6">
            <Uploader inline ingest={ingest} jobs={jobs} busy={busy} consent={consent} />
          </div>
        </Card>
      ) : (
        <>
          {resume && (
            <section aria-labelledby="lib-resume" className="card mt-8 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="min-w-0 flex-1">
                <h2 id="lib-resume" className="text-sm text-fg-muted">Continua a leggere</h2>
                <p className="mt-1 truncate font-display text-2xl leading-tight text-fg sm:text-3xl" title={resume.name}>{resume.name}</p>
                <div className="mt-4 flex items-center gap-4">
                  <Meridian value={(resume.lastPage ?? 1) / Math.max(1, resume.pages ?? 1)} className="max-w-md" />
                  <span className="shrink-0 text-sm text-fg-muted">
                    Pagina {resume.lastPage ?? 1} di {resume.pages ?? 1}
                  </span>
                </div>
              </div>
              <Button variant="primary" size="lg" href={`/biblioteca/${resume.id}`} className="w-full sm:w-auto">
                Riprendi
              </Button>
            </section>
          )}

          {/* Search, filters, sort */}
          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca per nome o nel testo"
                aria-label="Cerca nella biblioteca, per nome o nel testo dei documenti"
                className="pl-10"
              />
            </div>
            <Segmented ariaLabel="Tipo di documento" value={type} onChange={setType} options={typeOptions} className="self-start" />
            <div className="flex gap-2 lg:ml-auto">
              <Select aria-label="Materia" value={subject} onChange={(e) => setSubject(e.target.value as SubjectFilter)} className="min-w-0 flex-1 lg:w-44 lg:flex-none">
                <option value="tutte">Tutte le materie</option>
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="nessuna">Senza materia</option>
              </Select>
              <Select aria-label="Ordina" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-w-0 flex-1 lg:w-48 lg:flex-none">
                <option value="aperti">Aperti di recente</option>
                <option value="aggiunti">Aggiunti di recente</option>
                <option value="titolo">Titolo A–Z</option>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex min-h-8 items-center justify-between gap-3">
            <h2 ref={listHeadingRef} tabIndex={-1} className="text-sm font-medium text-fg-muted outline-none" aria-live="polite">
              {filtersOn ? `${filtered.length} di ${pluralize(docs.length, "documento", "documenti")}` : pluralize(docs.length, "documento", "documenti")}
            </h2>
            {filtersOn && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4" aria-hidden /> Azzera filtri
              </Button>
            )}
          </div>

          {filtered.length ? (
            <ul className="card mt-2 divide-y divide-white/[0.06] overflow-hidden p-0">
              {filtered.map((d) => {
                const meta = metas[d.id];
                const t = docType(d, meta);
                const Icon = DOC_TYPE[t].icon;
                const job = jobFor(d.id);
                const preparing = !!job || (d.kind !== "audio" && d.pages === undefined);
                const progress = d.pages && d.lastPage ? d.lastPage / d.pages : 0;
                return (
                  <li
                    key={d.id}
                    className="group relative flex items-start gap-3 px-4 py-4 transition-colors duration-150 hover:bg-white/[0.025] has-[a:focus-visible]:outline has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-azure-400 sm:items-center sm:gap-4 sm:px-5"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle sm:mt-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/biblioteca/${d.id}`}
                        className="block truncate text-base font-medium text-fg outline-none after:absolute after:inset-0 sm:text-[15px]"
                        aria-label={`${d.name}: ${describe(d, meta)}`}
                      >
                        {d.name}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-fg-subtle">
                        <span>{describe(d, meta)}</span>
                        {d.subject && <Badge tone={SUBJECT_TONE[d.subject]} dot>{subjectName(d.subject)}</Badge>}
                        {preparing ? (
                          <span className="inline-flex items-center gap-1.5 text-fg-muted">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-azure-300" aria-hidden />
                            {job ? `Lettura del testo ${Math.round(job.progress * 100)}%` : "Testo da preparare all’apertura"}
                          </span>
                        ) : (
                          d.kind === "pdf" && !d.textIndexed && <Badge tone="warning">Senza testo: niente ricerca né AI</Badge>
                        )}
                        {d.highlights.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-fg-muted" title="Evidenziazioni">
                            <Highlighter className="h-3.5 w-3.5" aria-hidden /> {d.highlights.length}
                            <span className="sr-only">{d.highlights.length === 1 ? "evidenziazione" : "evidenziazioni"}</span>
                          </span>
                        )}
                        {d.bookmarks.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-fg-muted" title="Segnalibri">
                            <BookmarkCheck className="h-3.5 w-3.5" aria-hidden /> {d.bookmarks.length}
                            <span className="sr-only">{d.bookmarks.length === 1 ? "segnalibro" : "segnalibri"}</span>
                          </span>
                        )}
                      </div>
                      {d.kind !== "audio" && d.pages ? (
                        <div className="mt-2.5 flex items-center gap-3 md:hidden">
                          <ProgressBar value={progress} size="sm" className="max-w-40" label={`Letto fino a pagina ${d.lastPage ?? 0} di ${d.pages}`} />
                          <span className="shrink-0 text-xs text-fg-subtle">{d.lastPage ? `p. ${d.lastPage} di ${d.pages}` : "Da iniziare"}</span>
                        </div>
                      ) : null}
                    </div>
                    {d.kind !== "audio" && d.pages ? (
                      <div className="hidden w-36 shrink-0 md:block">
                        <div className="text-right text-xs text-fg-subtle">{d.lastPage ? `Pagina ${d.lastPage} di ${d.pages}` : "Da iniziare"}</div>
                        <ProgressBar value={progress} size="sm" className="mt-1.5" label={`Letto fino a pagina ${d.lastPage ?? 0} di ${d.pages}`} />
                      </div>
                    ) : (
                      <div className="hidden w-36 shrink-0 md:block" />
                    )}
                    <div className="relative z-10 -my-1 flex shrink-0 items-center gap-0.5">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(d)} aria-label={`Modifica i dettagli di ${d.name}`} title="Rinomina, materia, fonte">
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(d)} aria-label={`Elimina ${d.name}`} title="Elimina">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="mt-2"
              icon={<Search />}
              title={contentHits?.length ? "Nessun titolo corrisponde" : "Nessun documento corrisponde"}
              description={contentHits?.length ? "La parola compare però nel testo di alcuni documenti: trovi i passaggi qui sotto." : "Prova un’altra parola o togli i filtri di tipo e materia."}
              action={<Button variant="secondary" onClick={resetFilters}>Azzera filtri</Button>}
            />
          )}

          {/* Matches inside the documents */}
          {contentHits !== null || searching ? (
            <section aria-labelledby="lib-content" className="mt-10">
              <h2 id="lib-content" className="text-base font-semibold text-fg">
                Nel testo dei documenti
              </h2>
              <div aria-live="polite" className="mt-1 text-sm text-fg-muted">
                {searching ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-azure-300" aria-hidden /> Ricerca in corso…</span>
                ) : contentHits && contentHits.length ? (
                  `«${q}» compare in ${pluralize(contentHits.length, "documento", "documenti")}`
                ) : (
                  `«${q}» non compare nel testo dei documenti. Le scansioni senza testo e l’audio non si possono cercare.`
                )}
              </div>
              {!searching && contentHits && contentHits.length > 0 && (
                <ul className="mt-4 space-y-4">
                  {contentHits.slice(0, 12).map((g) => {
                    const d = docById(g.docId);
                    if (!d) return null;
                    return (
                      <li key={g.docId} className="card p-4 sm:p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate font-medium text-fg">{d.name}</span>
                          <span className="text-xs text-fg-subtle">{pluralize(g.total, "occorrenza", "occorrenze")}</span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {g.hits.map((h) => (
                            <li key={h.page}>
                              <Link
                                href={`/biblioteca/${d.id}?p=${h.page}&q=${encodeURIComponent(q)}`}
                                className="-mx-2 flex gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/[0.04]"
                              >
                                <span className="w-12 shrink-0 text-fg-subtle">p. {h.page}</span>
                                <span className="min-w-0 leading-relaxed text-fg-muted">
                                  {h.snippet.mark ? (
                                    <>
                                      {h.snippet.text.slice(0, h.snippet.mark[0])}
                                      <mark className="rounded-[3px] bg-orange-400/25 px-0.5 text-fg">{h.snippet.text.slice(h.snippet.mark[0], h.snippet.mark[1])}</mark>
                                      {h.snippet.text.slice(h.snippet.mark[1])}
                                    </>
                                  ) : (
                                    h.snippet.text
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-ink-950/80 p-6 backdrop-blur-[2px] animate-fade-in" aria-hidden>
          <div className="flex flex-col items-center rounded-panel border-2 border-dashed border-azure-400/70 px-10 py-12 text-center">
            <FileUp className="h-8 w-8 text-azure-300" />
            <p className="mt-3 text-lg font-medium text-fg">Rilascia i file per aggiungerli</p>
            <p className="mt-1 text-sm text-fg-muted">PDF, sbobine e appunti (.txt, .md), audio</p>
          </div>
        </div>
      )}

      <Modal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPending([]);
          if (!busy) clearFinished();
        }}
        title="Aggiungi materiali"
        description="I file vengono letti e salvati in questo browser."
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-fg-subtle">{busy ? "Puoi chiudere: il caricamento continua." : ""}</span>
            <Button
              variant="secondary"
              onClick={() => {
                setUploadOpen(false);
                setPending([]);
                if (!busy) clearFinished();
              }}
            >
              {jobs.some((j) => j.phase === "pronto") && !busy ? "Fatto" : "Chiudi"}
            </Button>
          </div>
        }
      >
        <Uploader ingest={ingest} jobs={jobs} busy={busy} consent={consent} pending={pending} onPendingDone={() => setPending([])} />
      </Modal>

      <DocDetailsModal
        doc={editing}
        meta={editing ? metas[editing.id] : undefined}
        open={!!editing}
        onClose={() => setEditing(null)}
        onMeta={(id, m) => setMetas((x) => ({ ...x, [id]: m }))}
      />

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        size="sm"
        title={toDelete ? `Eliminare «${toDelete.name}»?` : "Eliminare il documento?"}
        description={toDelete ? deleteDescription(toDelete, metas[toDelete.id]) : undefined}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setToDelete(null)} data-autofocus>
              Annulla
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!toDelete) return;
                const d = toDelete;
                await deleteDocData(d.id).catch(() => undefined);
                removeDoc(d.id);
                setToDelete(null);
                toast("Documento eliminato", { description: `«${d.name}» non è più nella biblioteca.` });
                window.setTimeout(() => listHeadingRef.current?.focus(), 60);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Elimina documento
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">Il file viene cancellato da questo browser e non si può recuperare. Le flashcard già create dal documento restano nel mazzo.</p>
      </Modal>
    </div>
  );
}

function deleteDescription(d: LibraryDoc, meta?: DocMeta) {
  const lost = [d.highlights.length ? pluralize(d.highlights.length, "evidenziazione", "evidenziazioni") : "", d.bookmarks.length ? pluralize(d.bookmarks.length, "segnalibro", "segnalibri") : ""].filter(Boolean);
  return `${describe(d, meta)}, aggiunto il ${fmt.dateShort(d.addedAt)}.${lost.length ? ` Perderai anche ${lost.join(" e ")}.` : ""}`;
}

