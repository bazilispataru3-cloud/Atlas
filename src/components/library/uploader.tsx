"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Upload } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { SUBJECTS } from "@/data/syllabus";
import { Button, Label, ProgressBar, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas, type LibraryDoc } from "@/lib/store";
import {
  deleteDocData,
  extractPdfText,
  getLibraryPrefs,
  looksScanned,
  patchDocMeta,
  saveDocFile,
  savePageTexts,
  setLibraryPrefs,
  splitTextIntoPages,
  TEXT_VERSION,
} from "@/lib/library";
import { cn, fmt, uid } from "@/lib/utils";
import { guessCategory } from "./shared";

const MAX_BYTES = 60 * 1024 * 1024;
export const ACCEPT = ".pdf,.txt,.md,.markdown,.mp3,.m4a,.wav,.ogg,.webm,application/pdf,text/plain,text/markdown,audio/*";

function kindOf(file: File): LibraryDoc["kind"] {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|webm)$/i.test(file.name)) return "audio";
  if (file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(file.name)) return "testo";
  return "altro";
}

export interface IngestJob {
  id: string;
  name: string;
  progress: number;
  phase: "salvataggio" | "lettura" | "pronto" | "errore";
  message?: string;
}

/**
 * Saves files in this browser and extracts their text. Jobs report progress
 * per file; the document appears in the list at once and is marked "in
 * preparazione" until its text is ready.
 */
export function useIngest() {
  const addDoc = useAtlas((s) => s.addDoc);
  const updateDoc = useAtlas((s) => s.updateDoc);
  const removeDoc = useAtlas((s) => s.removeDoc);
  const [jobs, setJobs] = useState<IngestJob[]>([]);

  const setJob = (id: string, patch: Partial<IngestJob>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const ingest = async (files: File[], subject: SubjectId | "") => {
    const queue = files.map((file) => ({ file, id: uid("doc"), kind: kindOf(file) }));
    setJobs((js) => [
      ...js.filter((j) => j.phase === "salvataggio" || j.phase === "lettura"),
      ...queue.map(({ file, id, kind }) => {
        const tooBig = file.size > MAX_BYTES;
        const bad = kind === "altro";
        return {
          id,
          name: file.name,
          progress: 0,
          phase: bad || tooBig ? ("errore" as const) : ("salvataggio" as const),
          message: bad ? "Formato non supportato: carica PDF, testo (.txt, .md) o audio." : tooBig ? `Il file supera 60 MB (${fmt.number(file.size / 1024 / 1024)} MB).` : undefined,
        };
      }),
    ]);
    let added = 0;
    for (const { file, id, kind } of queue) {
      if (kind === "altro" || file.size > MAX_BYTES) continue;
      const name = file.name.replace(/\.[^.]+$/, "");
      try {
        await saveDocFile(id, file);
        const doc: LibraryDoc = {
          id,
          name,
          mime: file.type || (kind === "pdf" ? "application/pdf" : /\.(md|markdown)$/i.test(file.name) ? "text/markdown" : "text/plain"),
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
        setJob(id, { phase: kind === "audio" ? "pronto" : "lettura", progress: kind === "audio" ? 1 : 0.02 });
        if (kind === "pdf") {
          const { pages, numPages } = await extractPdfText(await file.arrayBuffer(), (p) => setJob(id, { progress: p }));
          await savePageTexts(id, pages);
          await patchDocMeta(id, (m) => ({ ...m, textVersion: TEXT_VERSION }));
          const scanned = looksScanned(pages);
          updateDoc(id, { pages: numPages, textIndexed: !scanned });
          setJob(id, { phase: "pronto", progress: 1, message: scanned ? "Sembra una scansione: si può leggere, ma ricerca e AI non funzionano (l’OCR non è disponibile)." : undefined });
        } else if (kind === "testo") {
          const pages = splitTextIntoPages(await file.text());
          await savePageTexts(id, pages);
          await patchDocMeta(id, (m) => ({ ...m, textVersion: TEXT_VERSION, category: guessCategory(file.name) }));
          updateDoc(id, { pages: pages.length, textIndexed: pages.length > 0 });
          setJob(id, { phase: "pronto", progress: 1, message: pages.length ? undefined : "Il file è vuoto." });
        }
        added++;
      } catch (e) {
        removeDoc(id);
        await deleteDocData(id).catch(() => undefined);
        const detail = e instanceof Error && /password/i.test(e.message) ? "Il PDF è protetto da password: rimuovi la protezione e riprova." : "Il file sembra danneggiato o non è leggibile da questo browser.";
        setJob(id, { phase: "errore", message: detail });
      }
    }
    if (added) toast(added === 1 ? "Documento aggiunto" : `${added} documenti aggiunti`, { description: "Li trovi nella lista della biblioteca." });
    else if (queue.length) toast("Nessun file aggiunto", { tone: "warning", description: "Controlla i messaggi accanto ai file." });
  };

  const clearFinished = () => setJobs((js) => js.filter((j) => j.phase === "salvataggio" || j.phase === "lettura"));
  return { jobs, ingest, clearFinished, busy: jobs.some((j) => j.phase === "salvataggio" || j.phase === "lettura") };
}

/** Rights confirmation, remembered in this browser with its date. */
export function useConsent() {
  const [consentAt, setConsentAt] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    getLibraryPrefs().then((p) => setConsentAt(p.consentAt ?? null));
  }, []);
  const set = (v: boolean) => {
    const at = v ? new Date().toISOString() : null;
    setConsentAt(at);
    getLibraryPrefs().then((p) => setLibraryPrefs({ ...p, consentAt: at ?? undefined }));
  };
  return { consentAt, setConsent: set };
}

export function Uploader({
  ingest,
  jobs,
  busy,
  pending,
  onPendingDone,
  consent,
  inline,
}: {
  ingest: (files: File[], subject: SubjectId | "") => Promise<void>;
  jobs: IngestJob[];
  busy: boolean;
  /** Files dropped on the page before the rights were confirmed. */
  pending?: File[];
  onPendingDone?: () => void;
  consent: ReturnType<typeof useConsent>;
  /** Rendered as the empty state of the page instead of inside a dialog. */
  inline?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const checkRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState<SubjectId | "">("");
  const [drag, setDrag] = useState(false);
  const [needConsent, setNeedConsent] = useState(false);
  const [editConsent, setEditConsent] = useState(false);
  const ids = useId();
  const ok = !!consent.consentAt;

  const start = (files: File[]) => {
    if (!ok) {
      setNeedConsent(true);
      checkRef.current?.focus();
      return;
    }
    ingest(files, subject);
  };

  const choose = () => {
    if (!ok) {
      setNeedConsent(true);
      checkRef.current?.focus();
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div className="space-y-5">
      {/* 1. Rights */}
      {ok && !editConsent ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
          Diritti d’uso confermati il {fmt.dateShort(consent.consentAt!)}.
          <button type="button" onClick={() => setEditConsent(true)} className="inline-flex h-8 items-center rounded-lg px-2 text-sm text-azure-300 hover:bg-white/[0.05] hover:text-azure-200">
            Rivedi
          </button>
        </p>
      ) : (
        <div>
          <label htmlFor={`${ids}-consent`} className={cn("flex cursor-pointer items-start gap-3 rounded-control border p-3.5 text-sm leading-relaxed text-fg-muted transition-colors", needConsent && !ok ? "border-warning/50 bg-warning/[0.05]" : "border-white/[0.1] hover:border-white/[0.16]")}>
            <input
              ref={checkRef}
              id={`${ids}-consent`}
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#1a66ff]"
              checked={ok}
              aria-describedby={needConsent && !ok ? `${ids}-consent-err` : undefined}
              onChange={(e) => {
                consent.setConsent(e.target.checked);
                if (e.target.checked) {
                  setNeedConsent(false);
                  setEditConsent(false);
                }
              }}
            />
            <span>
              <span className="font-medium text-fg">Ho il diritto di usare questi materiali per studiare.</span> Sono miei appunti, dispense del docente, libri acquistati o con licenza aperta; le registrazioni sono fatte con il consenso di chi parla.
            </span>
          </label>
          {needConsent && !ok && (
            <p id={`${ids}-consent-err`} role="alert" className="mt-2 flex items-center gap-2 text-sm text-orange-300">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> Spunta la conferma per caricare i file.
            </p>
          )}
        </div>
      )}

      {/* 2. Files */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDrag(false);
          if (e.dataTransfer.files.length) start(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center rounded-card border border-dashed px-5 text-center transition-colors duration-150",
          inline ? "py-10 sm:py-12" : "py-8",
          drag ? "border-azure-400/70 bg-azure-500/[0.06]" : "border-white/[0.28]",
        )}
      >
        <FileUp className="h-7 w-7 text-azure-300" aria-hidden />
        <p className="mt-3 text-base font-medium text-fg">
          <span className="hidden sm:inline">Trascina qui i file o </span>
          <span className="sm:hidden">Scegli i file </span>
          <span className="hidden sm:inline">sceglili </span>dal dispositivo
        </p>
        <p className="mt-1 text-sm text-fg-subtle">PDF, sbobine e appunti (.txt, .md), audio. Fino a 60 MB per file.</p>
        <div className="mt-5 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <Label htmlFor={`${ids}-subject`} className="sr-only">Materia dei file</Label>
            <Select id={`${ids}-subject`} value={subject} onChange={(e) => setSubject(e.target.value as SubjectId | "")}>
              <option value="">Materia: nessuna</option>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>Materia: {s.name}</option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={choose} loading={busy}>
            {!busy && <Upload className="h-4 w-4" aria-hidden />} {busy ? "Caricamento…" : "Scegli file"}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            if (e.target.files?.length) start(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {pending && pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-azure-400/25 bg-azure-500/[0.06] px-4 py-3 text-sm">
          <span className="min-w-0 text-fg-muted">
            {pending.length === 1 ? <>Pronto da caricare: <span className="text-fg">{pending[0].name}</span></> : <>{pending.length} file pronti da caricare</>}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!ok) {
                setNeedConsent(true);
                checkRef.current?.focus();
                return;
              }
              ingest(pending, subject);
              onPendingDone?.();
            }}
          >
            Carica
          </Button>
        </div>
      )}

      {jobs.length > 0 && (
        <ul className="space-y-3" aria-live="polite" aria-label="File in caricamento">
          {jobs.map((j) => (
            <li key={j.id} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-fg">{j.name}</span>
                <span className={cn("shrink-0 text-xs", j.phase === "errore" ? "text-orange-300" : j.phase === "pronto" ? "text-green-300" : "text-fg-muted")}>
                  {j.phase === "salvataggio" ? "Salvataggio" : j.phase === "lettura" ? `Lettura del testo ${Math.round(j.progress * 100)}%` : j.phase === "pronto" ? "Aggiunto" : "Non aggiunto"}
                </span>
              </div>
              {(j.phase === "salvataggio" || j.phase === "lettura") && <ProgressBar value={j.progress} size="sm" className="mt-1.5" label={`Avanzamento di ${j.name}`} />}
              {j.message && <p className={cn("mt-1 text-xs leading-relaxed", j.phase === "errore" ? "text-orange-300" : "text-fg-muted")}>{j.message}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* 3. Privacy */}
      <div className="text-sm text-fg-muted">
        <p>I file restano in questo browser: non vengono caricati sui server di ATLAS.</p>
        <details className="group mt-1">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg text-azure-300 hover:text-azure-200 [&::-webkit-details-marker]:hidden">
            Come trattiamo i tuoi file
          </summary>
          <ul className="mt-2 max-w-[65ch] list-disc space-y-1.5 pl-5 leading-relaxed marker:text-fg-faint">
            <li>File e testo estratto sono salvati nel database del browser (IndexedDB) di questo dispositivo.</li>
            <li>Solo quando usi una funzione AI, gli estratti di testo necessari vengono inviati al servizio AI configurato sul server, per quella richiesta.</li>
            <li>L’uso è personale: non condividere né ridistribuire materiali protetti da diritto d’autore.</li>
            <li>Puoi eliminare un documento in ogni momento: file, testo e annotazioni vengono cancellati.</li>
            <li>OCR delle scansioni e trascrizione dell’audio non sono disponibili: PDF scansionati e registrazioni si consultano, ma non si cercano né si analizzano con l’AI.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
