"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BookMarked, FileAudio, FileText, FileType2, Highlighter, Library, Loader2, Lock, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { SUBJECTS } from "@/data/syllabus";
import { Badge, Button, Card, EmptyState, Modal, Notice, PageHeader, ProgressBar, Select } from "@/components/ui/primitives";
import { SUBJECT_TONE } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { deleteDocData, extractPdfText, saveDocFile, savePageTexts, splitTextIntoPages } from "@/lib/library";
import { cn, fmt, pluralize, uid } from "@/lib/utils";

const MAX_BYTES = 60 * 1024 * 1024;
const ACCEPT = ".pdf,.txt,.md,.markdown,.mp3,.m4a,.wav,.ogg,.webm,application/pdf,text/plain,text/markdown,audio/*";

function kindOf(file: File): LibraryDoc["kind"] {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|webm)$/i.test(file.name)) return "audio";
  if (file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(file.name)) return "testo";
  return "altro";
}

function sizeLabel(bytes: number) {
  return bytes > 1024 * 1024 ? `${fmt.number(bytes / 1024 / 1024)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const KIND_ICON = { pdf: FileType2, testo: FileText, audio: FileAudio, altro: FileText } as const;

export function LibraryPage() {
  const hydrated = useHydrated();
  const library = useAtlas((s) => s.library);
  const addDoc = useAtlas((s) => s.addDoc);
  const updateDoc = useAtlas((s) => s.updateDoc);
  const removeDoc = useAtlas((s) => s.removeDoc);
  const docs = hydrated ? library : [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [subject, setSubject] = useState<SubjectId | "">("");
  const [busy, setBusy] = useState<{ name: string; progress: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const [toDelete, setToDelete] = useState<LibraryDoc | null>(null);

  const ingest = async (files: FileList | File[]) => {
    if (!consent) {
      toast("Conferma prima i diritti d’uso del materiale", { tone: "warning" });
      return;
    }
    for (const file of Array.from(files)) {
      const kind = kindOf(file);
      if (kind === "altro") {
        toast(`Formato non supportato: ${file.name}`, { tone: "warning", description: "Puoi caricare PDF, testo (.txt, .md) e audio." });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast(`${file.name} supera 60 MB`, { tone: "warning" });
        continue;
      }
      const id = uid("doc");
      setBusy({ name: file.name, progress: 0 });
      try {
        await saveDocFile(id, file);
        const doc: LibraryDoc = {
          id,
          name: file.name.replace(/\.[^.]+$/, ""),
          mime: file.type || (kind === "pdf" ? "application/pdf" : "text/plain"),
          size: file.size,
          kind,
          addedAt: new Date().toISOString(),
          subject: subject || undefined,
          consent: true,
          bookmarks: [],
          highlights: [],
          textIndexed: false,
        };
        addDoc(doc);
        if (kind === "pdf") {
          const { pages, numPages } = await extractPdfText(await file.arrayBuffer(), (p) => setBusy({ name: file.name, progress: p }));
          await savePageTexts(id, pages);
          const chars = pages.reduce((a, p) => a + p.text.length, 0);
          updateDoc(id, { pages: numPages, textIndexed: chars > numPages * 40 });
          if (chars <= numPages * 40) toast("PDF senza testo selezionabile", { tone: "warning", description: "Sembra una scansione: l’OCR non è disponibile in questa versione, quindi ricerca e AI non potranno usarlo." });
        } else if (kind === "testo") {
          const pages = splitTextIntoPages(await file.text());
          await savePageTexts(id, pages);
          updateDoc(id, { pages: pages.length, textIndexed: pages.length > 0 });
        }
        toast(`«${doc.name}» aggiunto alla biblioteca`);
      } catch (e) {
        removeDoc(id);
        await deleteDocData(id);
        toast(`Impossibile leggere ${file.name}`, { tone: "warning", description: e instanceof Error ? e.message : undefined });
      }
    }
    setBusy(null);
  };

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><Library className="h-3.5 w-3.5" /> Biblioteca</span>}
        title={<>I tuoi materiali, <span className="italic text-gradient-azure">studiati meglio</span>.</>}
        description="Carica dispense, appunti, PDF dei libri che possiedi e registrazioni. Leggi con evidenziatore, note e segnalibri; chiedi all’AI riassunti, flashcard, mappe e domande con il numero di pagina della fonte."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) ingest(e.dataTransfer.files); }}
            className={cn("flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition", drag ? "border-azure-400/60 bg-azure-500/[0.06]" : "border-white/10")}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-azure-500/12 text-azure-300"><Upload className="h-6 w-6" /></span>
            <div className="mt-3 text-[15px] font-medium text-fg">Trascina qui i file o sceglili dal dispositivo</div>
            <div className="mt-1 text-[12.5px] text-fg-subtle">PDF, testo (.txt, .md), audio (.mp3, .m4a, .wav) · max 60 MB</div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Select value={subject} onChange={(e) => setSubject(e.target.value as SubjectId | "")} className="h-10 w-auto text-[13px]" aria-label="Materia del documento">
                <option value="">Materia (facoltativa)</option>
                {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Button variant="primary" disabled={!consent || !!busy} onClick={() => inputRef.current?.click()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Scegli file
              </Button>
              <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => { if (e.target.files?.length) ingest(e.target.files); e.target.value = ""; }} />
            </div>
            <label className="mt-5 flex max-w-lg cursor-pointer items-start gap-2.5 text-left text-[12.5px] leading-relaxed text-fg-muted">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#2f8bff]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Confermo di avere il diritto di usare questi materiali per il mio studio personale (miei appunti, dispense fornite dal docente, libri acquistati o con licenza aperta) e che le registrazioni sono state fatte con il consenso di chi parla.
            </label>
            {busy && (
              <div className="mt-5 w-full max-w-sm">
                <div className="mb-1 truncate text-[12px] text-fg-subtle">Estrazione del testo: {busy.name}</div>
                <ProgressBar value={busy.progress} label="Avanzamento estrazione" />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-fg"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Privacy e diritti d’autore</div>
          <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-fg-muted">
            <li className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" /> I file restano in questo browser (IndexedDB): non vengono caricati su un server ATLAS.</li>
            <li className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" /> Solo quando usi una funzione AI, gli estratti di testo necessari vengono inviati al servizio AI configurato sul server, per quella richiesta.</li>
            <li className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" /> Non condividere né ridistribuire materiali protetti da copyright; l’uso è personale.</li>
            <li className="flex gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" /> Puoi eliminare un documento in qualsiasi momento: file e testo estratto vengono cancellati.</li>
          </ul>
          <Notice tone="info" className="mt-4">
            OCR delle scansioni e trascrizione dell’audio non sono disponibili in questa versione: i PDF scansionati e le registrazioni si possono consultare, ma non cercare o analizzare con l’AI.
          </Notice>
        </Card>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-fg">I tuoi documenti {docs.length > 0 && <span className="font-mono text-[12px] text-fg-subtle">{docs.length}</span>}</h2>
        </div>
        {docs.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((d) => {
              const Icon = KIND_ICON[d.kind];
              return (
                <Card key={d.id} hover className="group flex flex-col p-5">
                  <Link href={`/biblioteca/${d.id}`} className="absolute inset-0 rounded-[inherit]" aria-label={`Apri ${d.name}`} />
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.05] text-fg-muted"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[14.5px] font-medium text-fg">{d.name}</div>
                      <div className="mt-0.5 text-[12px] text-fg-subtle">
                        {d.kind.toUpperCase()} · {sizeLabel(d.size)}{d.pages ? ` · ${pluralize(d.pages, "pagina", "pagine")}` : ""} · {fmt.dateShort(d.addedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {d.subject && <Badge tone={SUBJECT_TONE[d.subject]}>{SUBJECTS.find((s) => s.id === d.subject)?.name}</Badge>}
                    {d.kind !== "audio" && (d.textIndexed ? <Badge tone="success">Testo indicizzato</Badge> : <Badge tone="warning">Senza testo</Badge>)}
                    {d.highlights.length > 0 && <Badge tone="gold"><Highlighter className="h-3 w-3" /> {d.highlights.length}</Badge>}
                    {d.bookmarks.length > 0 && <Badge tone="muted"><BookMarked className="h-3 w-3" /> {d.bookmarks.length}</Badge>}
                  </div>
                  <div className="relative z-10 mt-auto flex items-center justify-between pt-4">
                    <span className="text-[12px] text-fg-subtle">{d.lastPage ? `Riprendi da p. ${d.lastPage}` : "Non ancora aperto"}</span>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(d)} aria-label={`Elimina ${d.name}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Library className="h-6 w-6" />} title="La biblioteca è vuota" description="Carica il primo PDF o i tuoi appunti: potrai leggerli, evidenziarli e generare materiali di studio." />
        )}
      </section>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        size="sm"
        title="Eliminare il documento?"
        description="Il file, il testo estratto, le evidenziazioni e le note verranno cancellati da questo browser."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setToDelete(null)}>Annulla</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!toDelete) return;
                await deleteDocData(toDelete.id);
                removeDoc(toDelete.id);
                setToDelete(null);
                toast("Documento eliminato", { tone: "info" });
              }}
            >
              <Trash2 className="h-4 w-4" /> Elimina
            </Button>
          </div>
        }
      >
        <p className="text-[13.5px] text-fg-muted">«{toDelete?.name}»</p>
      </Modal>
    </div>
  );
}
