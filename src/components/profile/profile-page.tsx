"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { z } from "zod";
import { clsx } from "clsx";
import { CalendarDays, Check, ChevronDown, Download, ExternalLink, FlaskConical, RotateCcw, Upload } from "lucide-react";
import type { ExplanationLevel, SubjectId } from "@/lib/types";
import { SUBJECTS, SYLLABUS_SOURCE } from "@/data/syllabus";
import { EXAM_DATES, EXAM_DATES_SOURCE, EXAM_RULES } from "@/data/exam";
import { Button, Input, Modal, Notice, PageHeader, Segmented, Select, Skeleton, Spinner, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { EXPORT_KEYS, useAtlas, type AtlasState } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { useIntegrations } from "@/lib/ai-client";
import { fmt } from "@/lib/utils";

// `clsx` (not `cn`): tailwind-merge drops the custom `text-ui` size next to a text colour.
const cx = clsx;

const ExportFile = z.object({
  app: z.literal("atlas-study"),
  version: z.number(),
  exportedAt: z.string(),
  data: z
    .object({
      profile: z.object({ name: z.string() }).passthrough(),
      settings: z.object({}).passthrough(),
      progress: z.record(z.string(), z.object({ minutes: z.number(), sectionsRead: z.array(z.string()), quiz: z.array(z.any()), recall: z.array(z.any()) }).passthrough()),
      sessions: z.array(z.object({ topicId: z.string(), minutes: z.number(), start: z.string() }).passthrough()),
      cards: z.array(z.object({ id: z.string(), front: z.string(), back: z.string(), srs: z.object({ due: z.string() }).passthrough() }).passthrough()),
      cardReviews: z.array(z.any()),
      quizResults: z.array(z.object({ id: z.string(), answers: z.array(z.any()) }).passthrough()),
      favorites: z.array(z.string()),
      plannedResources: z.array(z.any()),
      plan: z.any(),
      planDone: z.array(z.string()),
      cornell: z.record(z.string(), z.any()),
      palaces: z.array(z.any()),
      feynman: z.array(z.any()),
      chats: z.array(z.any()),
      library: z.array(z.any()),
    })
    .partial(),
});

/** What each part of an export is, in the student's words. */
const DATA_LABEL: Record<string, string> = {
  profile: "Profilo",
  settings: "Preferenze",
  progress: "Argomenti con progressi",
  sessions: "Sessioni di studio",
  cards: "Flashcard",
  cardReviews: "Ripassi delle flashcard",
  quizResults: "Quiz svolti",
  favorites: "Preferiti",
  plannedResources: "Risorse nel piano",
  plan: "Piano di studio",
  planDone: "Attività del piano svolte",
  cornell: "Note Cornell",
  palaces: "Palazzi della memoria",
  feynman: "Spiegazioni Feynman",
  chats: "Conversazioni con l’AI Professor",
  library: "Biblioteca (note ed evidenziazioni)",
};

function describeValue(key: string, v: unknown): string {
  if (key === "profile" && v && typeof v === "object" && "name" in v) return String((v as { name: string }).name || "senza nome");
  if (key === "plan") return v && typeof v === "object" && "items" in v ? `${(v as { items: unknown[] }).items.length} attività` : "nessuno";
  if (key === "settings") return "incluse";
  if (Array.isArray(v)) return String(v.length);
  if (v && typeof v === "object") return String(Object.keys(v).length);
  return "nessuno";
}

const SECTIONS = [
  { id: "profilo", label: "Profilo" },
  { id: "obiettivi", label: "Obiettivi" },
  { id: "preferenze", label: "Preferenze" },
  { id: "integrazioni", label: "Integrazioni" },
  { id: "dati", label: "I tuoi dati" },
  { id: "fonti", label: "Fonti" },
];

function useOsReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-ui font-medium text-fg-muted">
      {children}
    </label>
  );
}

/** One settings group: title and purpose on the left (from lg), controls on the right. */
function Section({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-white/[0.07] py-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <div className="mb-5 lg:mb-0">
        <h2 id={`${id}-title`} tabIndex={-1} className="text-base font-semibold text-fg outline-none">
          {title}
        </h2>
        {description && <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A labelled switch with its description tied to it for screen readers. */
function SwitchRow({ id, label, description, checked, onChange }: { id: string; label: string; description: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  const descId = `${id}-desc`;
  useEffect(() => {
    document.getElementById(id)?.setAttribute("aria-describedby", descId);
  }, [id, descId]);
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        <p id={descId} className="mt-0.5 max-w-[56ch] text-sm leading-relaxed text-fg-muted">
          {description}
        </p>
      </div>
      <div className="pt-0.5">
        <Switch id={id} checked={checked} onChange={onChange} label={label} />
      </div>
    </div>
  );
}

function Capability({ name, on, children }: { name: string; on: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-3.5">
      <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", on ? "bg-success" : "bg-fg-subtle")} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">
          {name}
          <span className={cx("ml-2 text-xs font-normal", on ? "text-green-300" : "text-fg-subtle")}>{on ? "Attiva" : "Modalità base"}</span>
        </p>
        <p className="mt-0.5 max-w-[60ch] text-sm leading-relaxed text-fg-muted">{children}</p>
      </div>
    </li>
  );
}

export function ProfilePage() {
  const hydrated = useHydrated();
  const profile = useAtlas((s) => s.profile);
  const settings = useAtlas((s) => s.settings);
  const demo = useAtlas((s) => s.demo);
  const plan = useAtlas((s) => s.plan);
  const updateProfile = useAtlas((s) => s.updateProfile);
  const updateSettings = useAtlas((s) => s.updateSettings);
  const clearDemo = useAtlas((s) => s.clearDemo);
  const importData = useAtlas((s) => s.importData);
  const resetAll = useAtlas((s) => s.resetAll);
  const integrations = useIntegrations();
  const osReduce = useOsReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const importBtnRef = useRef<HTMLButtonElement>(null);
  const [pendingImport, setPendingImport] = useState<Partial<AtlasState> | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [confirm, setConfirm] = useState<"reset" | "demo" | null>(null);
  const levelsId = useId();

  // Deep links (#dati, #pf-goal, …): the content renders after hydration, so scroll and focus here,
  // and again when only the hash changes while the page is open.
  useEffect(() => {
    if (!hydrated) return;
    let raf = 0;
    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      raf = window.requestAnimationFrame(() => {
        el.scrollIntoView({ block: el.matches("input, select, textarea") ? "center" : "start" });
        const target = el.matches("input, select, textarea, button") ? el : (el.querySelector<HTMLElement>("h2[tabindex]") ?? el);
        target.focus({ preventScroll: true });
      });
    };
    go();
    window.addEventListener("hashchange", go);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", go);
    };
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-10 w-72 max-w-full" />
        <div className="mt-10 max-w-4xl space-y-6">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <span className="sr-only" role="status">
          Caricamento del profilo
        </span>
      </div>
    );
  }

  const exportData = () => {
    const state = useAtlas.getState();
    const data = Object.fromEntries(EXPORT_KEYS.map((k) => [k, state[k]]));
    const blob = new Blob([JSON.stringify({ app: "atlas-study", version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-study-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Dati esportati", { description: `File ${a.download} scaricato.` });
  };

  const readImport = async (file: File) => {
    setImportError(null);
    if (file.size > 20 * 1024 * 1024) {
      setImportError("Il file supera i 20 MB: non sembra un’esportazione di ATLAS STUDY.");
      return;
    }
    setReading(true);
    try {
      const parsed = ExportFile.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) setImportError("Il file non è un’esportazione di ATLAS STUDY. Scegli il file .json creato con «Esporta i dati».");
      else setPendingImport(parsed.data.data as Partial<AtlasState>);
    } catch {
      setImportError("Impossibile leggere il file: non è un JSON valido. Scegli il file .json creato con «Esporta i dati».");
    } finally {
      setReading(false);
    }
  };

  const examPreset = EXAM_DATES.find((d) => d.id === profile.examTarget);

  return (
    <div className="pb-16">
      <PageHeader title="Profilo e impostazioni" description="Le modifiche si salvano da sole, in questo browser." />

      <nav aria-label="Sezioni della pagina" className="no-scrollbar fade-x -mx-1 mt-6 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(s.id);
                  el?.scrollIntoView({ behavior: settings.reduceMotion || osReduce ? "auto" : "smooth", block: "start" });
                  el?.querySelector<HTMLElement>("h2[tabindex]")?.focus({ preventScroll: true });
                  history.replaceState(null, "", `#${s.id}`);
                }}
                className="inline-flex h-9 items-center rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-ui text-fg-muted transition-colors hover:border-white/[0.16] hover:text-fg"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 max-w-4xl">
        <Section id="profilo" title="Profilo" description="Come ti chiama ATLAS. L’ateneo serve solo a te come promemoria.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pf-name">Nome</FieldLabel>
              <Input id="pf-name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="Come vuoi essere chiamato o chiamata" autoComplete="given-name" />
            </div>
            <div>
              <FieldLabel htmlFor="pf-uni">
                Ateneo <span className="font-normal text-fg-subtle">(facoltativo)</span>
              </FieldLabel>
              <Input id="pf-uni" value={profile.university} onChange={(e) => updateProfile({ university: e.target.value })} placeholder="Es. Università di Bologna" autoComplete="organization" />
            </div>
          </div>
        </Section>

        <Section id="obiettivi" title="Obiettivi" description="Appello, ore al giorno e livello di partenza: la dashboard misura il tuo ritmo su questi valori.">
          {plan && (
            <Notice
              tone="info"
              className="mb-5"
              title="Hai un piano attivo nel calendario"
              action={
                <Button size="sm" variant="secondary" href="/calendario">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Apri il calendario
                </Button>
              }
            >
              Appello e livelli del piano si cambiano da «Modifica il piano»: quando lo salvi, aggiorna anche questi valori.
            </Notice>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="pf-exam">Appello obiettivo</FieldLabel>
              <Select id="pf-exam" value={profile.examTarget} onChange={(e) => updateProfile({ examTarget: e.target.value as typeof profile.examTarget })}>
                {EXAM_DATES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}, {fmt.date(d.date)}
                  </option>
                ))}
              </Select>
              {examPreset && <p className="mt-1.5 text-xs text-fg-subtle">{examPreset.note}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="pf-goal">Obiettivo giornaliero</FieldLabel>
              <Select id="pf-goal" value={profile.dailyGoalMinutes} onChange={(e) => updateProfile({ dailyGoalMinutes: Number(e.target.value) })}>
                {[60, 90, 120, 180, 240, 300, 360].map((m) => (
                  <option key={m} value={m}>
                    {fmt.minutes(m)} al giorno
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-xs text-fg-subtle">Tempo di studio individuale, lezioni escluse.</p>
            </div>
          </div>
          <fieldset className="mt-6">
            <legend id={levelsId} className="text-ui font-medium text-fg-muted">
              Livello di partenza per materia
            </legend>
            <p className="mt-0.5 text-xs text-fg-subtle">Base dà più tempo a ogni argomento nel piano, avanzato meno.</p>
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {SUBJECTS.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-fg">{s.name}</span>
                  <Segmented
                    ariaLabel={`Livello di partenza, ${s.name}`}
                    value={profile.levels[s.id]}
                    onChange={(v) => updateProfile({ levels: { ...profile.levels, [s.id as SubjectId]: v } })}
                    options={[
                      { value: "base", label: "Base" },
                      { value: "intermedio", label: "Intermedio" },
                      { value: "avanzato", label: "Avanzato" },
                    ]}
                    className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto [&>button]:h-9 [&>button]:text-ui sm:[&>button]:h-8"
                  />
                </li>
              ))}
            </ul>
          </fieldset>
        </Section>

        <Section id="preferenze" title="Preferenze" description="Come ti spiega le cose l’AI Professor e quanto si muove l’interfaccia.">
          <div>
            <p id="pf-level-label" className="mb-2 text-ui font-medium text-fg-muted">
              Livello predefinito delle spiegazioni
            </p>
            <Segmented
              ariaLabel="Livello predefinito delle spiegazioni dell’AI Professor"
              value={settings.explanationLevel}
              onChange={(v) => updateSettings({ explanationLevel: v as ExplanationLevel })}
              options={[
                { value: "introduttivo", label: "Introduttivo" },
                { value: "universitario", label: "Universitario" },
                { value: "avanzato", label: "Avanzato" },
              ]}
              className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto [&>button]:h-9 [&>button]:text-ui sm:[&>button]:h-8"
            />
            <p className="mt-1.5 text-xs text-fg-subtle">Puoi cambiarlo anche dentro ogni conversazione.</p>
          </div>
          <div className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            <SwitchRow
              id="st-adv"
              label="Mostra gli approfondimenti avanzati"
              description="Contenuti oltre il programma ufficiale, sempre segnalati come tali."
              checked={settings.showAdvanced}
              onChange={(v) => updateSettings({ showAdvanced: v })}
            />
            <SwitchRow
              id="st-motion"
              label="Riduci le animazioni"
              description={
                osReduce
                  ? "Il tuo dispositivo chiede già meno movimento, quindi le animazioni sono ridotte anche con l’interruttore spento."
                  : "Disattiva transizioni e illustrazioni animate."
              }
              checked={settings.reduceMotion}
              onChange={(v) => updateSettings({ reduceMotion: v })}
            />
          </div>
        </Section>

        <Section id="integrazioni" title="Integrazioni" description="Cosa funziona su questo server. Senza integrazioni ATLAS resta completo, con fonti verificate.">
          {integrations === null ? (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <Spinner label="Verifica delle integrazioni" /> Verifica in corso…
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              <Capability name="AI Professor" on={integrations.ai}>
                {integrations.ai
                  ? `Spiegazioni, correzioni e generazione di flashcard, quiz e mappe con l’AI${integrations.model ? ` (modello ${integrations.model})` : ""}.`
                  : "Risponde con le lezioni verificate di ATLAS e con l’analisi dei tuoi risultati, sempre segnalate come tali."}
              </Capability>
              <Capability name="Ricerca web accademica" on={integrations.webSearch}>
                {integrations.webSearch
                  ? "Cerca su siti universitari e open access; mostra solo i link restituiti dalla ricerca."
                  : "Le risorse arrivano dal catalogo verificato di ATLAS."}
              </Capability>
              <Capability name="Ricerca di videolezioni" on={integrations.youtube}>
                {integrations.youtube ? "Videolezioni da YouTube con durata, canale e sottotitoli reali." : "Le videolezioni arrivano dal catalogo verificato di ATLAS."}
              </Capability>
              <Capability name="Sincronizzazione tra dispositivi" on={false}>
                Non ancora disponibile in questa versione: i dati restano in questo browser. Per spostarli usa «Esporta i dati» qui sotto.
              </Capability>
            </ul>
          )}
          <details className="group mt-3 rounded-control border border-white/[0.07] px-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
              Per chi gestisce il server
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <div className="pb-4 text-sm leading-relaxed text-fg-muted">
              <p>Le chiavi si impostano solo come variabili d’ambiente del server e non arrivano mai al browser.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-fg-subtle">
                <li>
                  <code className="font-mono text-xs text-fg">ANTHROPIC_API_KEY</code>: AI Professor e ricerca web.
                </li>
                <li>
                  <code className="font-mono text-xs text-fg">YOUTUBE_API_KEY</code>: ricerca di videolezioni.
                </li>
                <li>
                  <code className="font-mono text-xs text-fg">NEXT_PUBLIC_SUPABASE_URL</code> e <code className="font-mono text-xs text-fg">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>: predisposte per la
                  sincronizzazione (schema in <code className="font-mono text-xs text-fg">supabase/schema.sql</code>){integrations?.supabase ? ", già impostate" : ""}.
                </li>
              </ul>
            </div>
          </details>
        </Section>

        <Section id="dati" title="I tuoi dati" description="Restano su questo dispositivo. Esportali per tenerne una copia o per usarli altrove.">
          {demo && (
            <Notice
              tone="demo"
              className="mb-5"
              title="Stai usando dati dimostrativi"
              action={
                <Button size="sm" variant="secondary" onClick={() => setConfirm("demo")}>
                  <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Rimuovi
                </Button>
              }
            >
              Progressi, sessioni e risultati demo sono inventati per mostrare l’app. Rimuovendoli tieni nome, preferenze e biblioteca.
            </Notice>
          )}
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
            <li>Progressi, flashcard, piani e conversazioni sono salvati solo in questo browser, insieme ai file della biblioteca.</li>
            <li>Nessun tracciamento né statistiche d’uso. Le richieste all’AI inviano solo il testo necessario a quella richiesta.</li>
            <li>L’esportazione include note ed evidenziazioni della biblioteca, non i file: sul nuovo dispositivo ricaricali.</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportData}>
              <Download className="h-4 w-4" aria-hidden /> Esporta i dati
            </Button>
            <Button ref={importBtnRef} variant="secondary" loading={reading} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden /> Importa i dati
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readImport(f);
                e.target.value = "";
              }}
            />
          </div>
          {importError && (
            <Notice tone="danger" live className="mt-4" title="Importazione non riuscita">
              {importError}
            </Notice>
          )}

          <div className="mt-8 rounded-card border border-danger/20 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-fg">Azzera tutto</h3>
            <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-fg-muted">
              Elimina da questo browser profilo, progressi, flashcard, piani e conversazioni. I documenti della biblioteca restano. Non si può annullare: esporta prima una copia se vuoi conservarli.
            </p>
            <Button variant="danger" className="mt-4" onClick={() => setConfirm("reset")}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Azzera tutto
            </Button>
          </div>
        </Section>

        <Section id="fonti" title="Fonti ufficiali" description="I documenti da cui ATLAS prende programma, regole e date dell’esame.">
          <ul className="divide-y divide-white/[0.06]">
            {[
              { label: SYLLABUS_SOURCE.label, url: SYLLABUS_SOURCE.pageUrl, verified: SYLLABUS_SOURCE.verifiedOn },
              ...EXAM_RULES.sources.map((s) => ({ label: s.label, url: s.url, verified: EXAM_RULES.verifiedOn })),
              { label: EXAM_DATES_SOURCE.label, url: EXAM_DATES_SOURCE.url, verified: EXAM_DATES_SOURCE.verifiedOn },
            ].map((s) => (
              <li key={s.url} className="py-3">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-sm leading-relaxed text-azure-300 underline-offset-4 hover:text-azure-200 hover:underline">
                  {s.label}
                  <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">(si apre in una nuova scheda)</span>
                </a>
                <p className="mt-0.5 text-xs text-fg-subtle">Verificato il {fmt.dateYear(s.verified)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-fg-muted">
            ATLAS STUDY è uno strumento indipendente: non è affiliato al Ministero dell’Università e della Ricerca né agli atenei. In caso di dubbio fanno fede i documenti ufficiali.
          </p>
        </Section>
      </div>

      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        size="sm"
        title="Importare i dati?"
        description="I dati del file sostituiscono quelli attuali nelle stesse sezioni. Le altre sezioni restano come sono."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setPendingImport(null)}>
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pendingImport) importData({ ...pendingImport, demo: false });
                setPendingImport(null);
                toast("Dati importati");
              }}
            >
              <Check className="h-4 w-4" aria-hidden /> Importa i dati
            </Button>
          </div>
        }
      >
        <table className="w-full text-sm">
          <caption className="sr-only">Contenuto del file da importare</caption>
          <tbody className="divide-y divide-white/[0.06]">
            {pendingImport &&
              Object.entries(pendingImport).map(([k, v]) => (
                <tr key={k}>
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-fg-muted">
                    {DATA_LABEL[k] ?? k}
                  </th>
                  <td className="py-2 text-right tabular-nums text-fg">{describeValue(k, v)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Modal>

      <Modal
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        size="sm"
        title="Azzerare tutti i dati?"
        description="Profilo, progressi, flashcard, piani e conversazioni verranno eliminati da questo browser. Non si può annullare."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Annulla
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetAll();
                setConfirm(null);
                toast("Dati azzerati", { tone: "info" });
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Azzera tutto
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">
          Se vuoi conservarli,{" "}
          <button type="button" onClick={exportData} className="text-azure-300 underline underline-offset-4 hover:text-azure-200">
            esporta prima una copia
          </button>
          . I documenti della Biblioteca restano: puoi eliminarli uno per uno dalla{" "}
          <Link href="/biblioteca" className="text-azure-300 underline underline-offset-4 hover:text-azure-200">
            Biblioteca
          </Link>
          .
        </p>
      </Modal>

      <Modal
        open={confirm === "demo"}
        onClose={() => setConfirm(null)}
        size="sm"
        title="Rimuovere i dati dimostrativi?"
        description="Progressi, sessioni, flashcard, quiz e piano demo verranno eliminati. Restano nome, preferenze e documenti della biblioteca."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                clearDemo();
                setConfirm(null);
                toast("Dati demo rimossi", { description: "Ora parti da zero con i tuoi dati." });
              }}
            >
              <FlaskConical className="h-4 w-4" aria-hidden /> Rimuovi i dati demo
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">Se nel frattempo hai aggiunto attività tue, anche quelle verranno rimosse.</p>
      </Modal>
    </div>
  );
}
