"use client";

import { useRef, useState } from "react";
import { z } from "zod";
import { Check, Database, Download, ExternalLink, FlaskConical, KeyRound, Plug, RotateCcw, Settings, ShieldCheck, Upload, User } from "lucide-react";
import type { ExplanationLevel, SubjectId } from "@/lib/types";
import { SUBJECTS, SYLLABUS_SOURCE } from "@/data/syllabus";
import { EXAM_DATES, EXAM_DATES_SOURCE, EXAM_RULES } from "@/data/exam";
import { Badge, Button, Card, Input, Label, Modal, Notice, PageHeader, SectionTitle, Segmented, Select, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { EXPORT_KEYS, useAtlas, type AtlasState } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { useIntegrations } from "@/lib/ai-client";
import { cn, fmt } from "@/lib/utils";

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

function Integration({ name, on, detail, env }: { name: string; on: boolean | undefined; detail: string; env: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", on === undefined ? "bg-white/20" : on ? "bg-emerald-400" : "bg-amber-400")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[13.5px] text-fg">
          {name}
          {on !== undefined && <Badge tone={on ? "success" : "warning"}>{on ? "Attiva" : "Non configurata"}</Badge>}
        </div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-fg-subtle">{detail}</div>
        {!on && <div className="mt-1 font-mono text-[11px] text-fg-subtle">{env}</div>}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const hydrated = useHydrated();
  const profile = useAtlas((s) => s.profile);
  const settings = useAtlas((s) => s.settings);
  const demo = useAtlas((s) => s.demo);
  const updateProfile = useAtlas((s) => s.updateProfile);
  const updateSettings = useAtlas((s) => s.updateSettings);
  const clearDemo = useAtlas((s) => s.clearDemo);
  const importData = useAtlas((s) => s.importData);
  const resetAll = useAtlas((s) => s.resetAll);
  const integrations = useIntegrations();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Partial<AtlasState> | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!hydrated) return <div className="mt-20 h-96 animate-pulse rounded-3xl bg-white/[0.03]" />;

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
    toast("Esportazione scaricata");
  };

  const readImport = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return toast("File troppo grande", { tone: "warning" });
    try {
      const parsed = ExportFile.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) return toast("File non valido", { tone: "warning", description: "Non è un’esportazione di ATLAS STUDY." });
      setPendingImport(parsed.data.data as Partial<AtlasState>);
    } catch {
      toast("Impossibile leggere il file", { tone: "warning" });
    }
  };

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><Settings className="h-3.5 w-3.5" /> Profilo e impostazioni</span>}
        title={<>Il tuo spazio, <span className="italic text-gradient-azure">le tue regole</span>.</>}
        description="Profilo, preferenze di studio, integrazioni e controllo completo sui tuoi dati."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title="Profilo" icon={<User className="h-4 w-4" />} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pf-name">Nome</Label>
              <Input id="pf-name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="Come vuoi essere chiamato/a" />
            </div>
            <div>
              <Label htmlFor="pf-uni">Ateneo (facoltativo)</Label>
              <Input id="pf-uni" value={profile.university} onChange={(e) => updateProfile({ university: e.target.value })} placeholder="Es. Università di Bologna" />
            </div>
            <div>
              <Label htmlFor="pf-exam">Appello obiettivo</Label>
              <Select id="pf-exam" value={profile.examTarget} onChange={(e) => updateProfile({ examTarget: e.target.value as typeof profile.examTarget })}>
                {EXAM_DATES.map((d) => <option key={d.id} value={d.id}>{d.label} · {fmt.date(d.date)}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="pf-goal">Obiettivo giornaliero</Label>
              <Select id="pf-goal" value={profile.dailyGoalMinutes} onChange={(e) => updateProfile({ dailyGoalMinutes: Number(e.target.value) })}>
                {[60, 90, 120, 180, 240, 300, 360].map((m) => <option key={m} value={m}>{fmt.minutes(m)}</option>)}
              </Select>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 text-[12px] font-medium text-fg-muted">Livello di partenza per materia</div>
            <div className="space-y-2">
              {SUBJECTS.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13.5px] text-fg">{s.name}</span>
                  <Segmented
                    size="sm"
                    value={profile.levels[s.id]}
                    onChange={(v) => updateProfile({ levels: { ...profile.levels, [s.id as SubjectId]: v } })}
                    options={[{ value: "base", label: "Base" }, { value: "intermedio", label: "Intermedio" }, { value: "avanzato", label: "Avanzato" }]}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-fg-subtle">Il livello cambia le stime di tempo del pianificatore.</p>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title="Preferenze di studio" icon={<Settings className="h-4 w-4" />} />
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[12px] font-medium text-fg-muted">Livello predefinito delle spiegazioni dell’AI Professor</div>
              <Segmented
                value={settings.explanationLevel}
                onChange={(v) => updateSettings({ explanationLevel: v as ExplanationLevel })}
                options={[{ value: "introduttivo", label: "Introduttivo" }, { value: "universitario", label: "Universitario" }, { value: "avanzato", label: "Avanzato" }]}
              />
            </div>
            <label className="flex items-center justify-between gap-4 text-[13.5px] text-fg">
              <span>
                Mostra gli approfondimenti avanzati
                <span className="block text-[12px] text-fg-subtle">Contenuti oltre il programma ufficiale, sempre segnalati come tali.</span>
              </span>
              <Switch id="st-adv" checked={settings.showAdvanced} onChange={(v) => updateSettings({ showAdvanced: v })} label="Mostra gli approfondimenti avanzati" />
            </label>
            <label className="flex items-center justify-between gap-4 text-[13.5px] text-fg">
              <span>
                Riduci le animazioni
                <span className="block text-[12px] text-fg-subtle">Disattiva transizioni e illustrazioni animate.</span>
              </span>
              <Switch id="st-motion" checked={settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} label="Riduci le animazioni" />
            </label>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title="Integrazioni" icon={<Plug className="h-4 w-4" />} />
          <div className="space-y-2.5">
            <Integration name="AI Professor (Claude)" on={integrations?.ai} detail={integrations?.ai ? `Modello: ${integrations.model}. Spiegazioni, correzioni, generazione di flashcard, quiz e mappe.` : "Senza chiave l’app usa la base di conoscenza ATLAS e l’analisi locale, sempre segnalate come tali."} env="ANTHROPIC_API_KEY" />
            <Integration name="Ricerca web accademica" on={integrations?.webSearch} detail="Ricerca limitata a domini universitari e open access; i link mostrati sono solo quelli restituiti dalla ricerca." env="ANTHROPIC_API_KEY" />
            <Integration name="YouTube Data API v3" on={integrations?.youtube} detail="Ricerca live di videolezioni con metadati reali (durata, canale, sottotitoli dichiarati)." env="YOUTUBE_API_KEY" />
            <Integration name="Sincronizzazione cloud (Supabase)" on={integrations?.supabase} detail="Predisposta (schema e policy in supabase/schema.sql) ma non attiva in questa versione: i dati restano nel browser." env="NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY" />
          </div>
          <p className="mt-3 flex gap-2 text-[11.5px] leading-relaxed text-fg-subtle"><KeyRound className="h-3.5 w-3.5 shrink-0" /> Le chiavi si impostano solo come variabili d’ambiente del server e non vengono mai inviate al browser.</p>
        </Card>

        <Card id="dati" className="scroll-mt-24 p-6">
          <SectionTitle title="I tuoi dati" icon={<Database className="h-4 w-4" />} />
          {demo && (
            <Notice
              tone="demo"
              className="mb-4"
              title="Stai usando dati dimostrativi"
              action={<Button size="sm" variant="secondary" onClick={() => { clearDemo(); toast("Dati demo rimossi: ora parti da zero"); }}><FlaskConical className="h-3.5 w-3.5" /> Rimuovi</Button>}
            >
              Progressi, sessioni e risultati demo sono inventati per mostrare l’app. Rimuovendoli mantieni il tuo profilo.
            </Notice>
          )}
          <ul className="space-y-2 text-[13px] leading-relaxed text-fg-muted">
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Progressi, flashcard, piani e conversazioni sono salvati nel browser (localStorage); i file della biblioteca in IndexedDB.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Nessun tracciamento o analytics. Le richieste AI inviano solo il testo necessario a quella richiesta.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportData}><Download className="h-4 w-4" /> Esporta (JSON)</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Importa</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readImport(f); e.target.value = ""; }} />
            <Button variant="danger" onClick={() => setConfirmReset(true)}><RotateCcw className="h-4 w-4" /> Azzera tutto</Button>
          </div>
          <p className="mt-2 text-[11.5px] text-fg-subtle">L’esportazione include note ed evidenziazioni della biblioteca, non i file: ricaricali sul nuovo dispositivo.</p>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <SectionTitle title="Fonti ufficiali usate da ATLAS" icon={<ShieldCheck className="h-4 w-4" />} />
        <ul className="grid gap-2 text-[13px] md:grid-cols-2">
          <li>
            <a href={SYLLABUS_SOURCE.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-azure-300 hover:underline">{SYLLABUS_SOURCE.label} <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /></a>
            <div className="text-[11.5px] text-fg-subtle">Verificato il {fmt.dateYear(SYLLABUS_SOURCE.verifiedOn)}</div>
          </li>
          {EXAM_RULES.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-azure-300 hover:underline">{s.label} <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /></a>
              <div className="text-[11.5px] text-fg-subtle">Verificato il {fmt.dateYear(EXAM_RULES.verifiedOn)}</div>
            </li>
          ))}
          <li>
            <a href={EXAM_DATES_SOURCE.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-azure-300 hover:underline">{EXAM_DATES_SOURCE.label} <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" /></a>
            <div className="text-[11.5px] text-fg-subtle">Verificato il {fmt.dateYear(EXAM_DATES_SOURCE.verifiedOn)}</div>
          </li>
        </ul>
        <p className="mt-3 text-[12px] text-fg-subtle">ATLAS STUDY è uno strumento indipendente: non è affiliato al Ministero dell’Università e della Ricerca né agli atenei. In caso di dubbio fanno fede i documenti ufficiali.</p>
      </Card>

      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        size="sm"
        title="Importare i dati?"
        description="I dati presenti nel file sostituiranno quelli attuali nelle stesse sezioni."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingImport(null)}>Annulla</Button>
            <Button variant="primary" onClick={() => { if (pendingImport) importData({ ...pendingImport, demo: false }); setPendingImport(null); toast("Dati importati"); }}><Check className="h-4 w-4" /> Importa</Button>
          </div>
        }
      >
        <ul className="space-y-1 text-[13px] text-fg-muted">
          {pendingImport && Object.entries(pendingImport).map(([k, v]) => (
            <li key={k} className="flex justify-between gap-3"><span>{k}</span><span className="font-mono text-fg-subtle">{Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : "—"}</span></li>
          ))}
        </ul>
      </Modal>
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        title="Azzerare tutti i dati?"
        description="Profilo, progressi, flashcard, piani e conversazioni verranno eliminati da questo browser. Esporta prima una copia se vuoi conservarli."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Annulla</Button>
            <Button variant="danger" onClick={() => { resetAll(); setConfirmReset(false); toast("Dati azzerati", { tone: "info" }); }}>Azzera</Button>
          </div>
        }
      >
        <p className="text-[13px] text-fg-muted">I documenti della Biblioteca vengono mantenuti: puoi eliminarli singolarmente dalla Biblioteca.</p>
      </Modal>
    </div>
  );
}
