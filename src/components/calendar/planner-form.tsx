"use client";

import { useState } from "react";
import { AlertTriangle, CalendarPlus, Plus, Sparkles, X } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { SUBJECTS, topicWeight } from "@/data/syllabus";
import { EXAM_DATES } from "@/data/exam";
import { Badge, Button, Card, Input, Label, Notice, Select } from "@/components/ui/primitives";
import { useTopicStates } from "@/lib/hooks";
import { useAtlas } from "@/lib/store";
import { generatePlan, type DayKind, type PlanConfig, type PlanResult } from "@/lib/planner";
import { cn, dayKey, daysBetween, fmt, pluralize } from "@/lib/utils";

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const KIND_LABEL: Record<DayKind, string> = { libero: "Libero", lezione: "Lezione", lavoro: "Lavoro", riposo: "Riposo" };

export function defaultConfig(examTarget: "appello-1" | "appello-2", levels: PlanConfig["levels"], dailyGoalMinutes = 180): PlanConfig {
  const exam = EXAM_DATES.find((d) => d.id === examTarget) ?? EXAM_DATES[0];
  const h = Math.max(1, Math.round((dailyGoalMinutes / 60) * 2) / 2);
  return {
    startDate: dayKey(new Date()),
    examDate: dayKey(exam.date),
    subjects: ["biologia", "chimica", "fisica"],
    week: [
      { kind: "lezione", hours: h },
      { kind: "lezione", hours: h },
      { kind: "lezione", hours: h },
      { kind: "lezione", hours: h },
      { kind: "lezione", hours: h },
      { kind: "libero", hours: h + 2 },
      { kind: "riposo", hours: 0 },
    ],
    restDates: [],
    levels,
  };
}

/** Builds the plan inputs from the student's measured progress. */
export function usePlanInputs() {
  const states = useTopicStates();
  return states.map((s) => ({ ref: s.ref, status: s.status, weight: topicWeight(s.ref) }));
}

export function PlannerForm({ initial, onSave, onCancel }: { initial: PlanConfig; onSave: (config: PlanConfig, result: PlanResult) => void; onCancel?: () => void }) {
  const inputs = usePlanInputs();
  const updateProfile = useAtlas((s) => s.updateProfile);
  const [c, setC] = useState<PlanConfig>(initial);
  const [restInput, setRestInput] = useState("");
  const [preview, setPreview] = useState<PlanResult | null>(null);
  const examPreset = EXAM_DATES.find((d) => dayKey(d.date) === c.examDate)?.id ?? "custom";
  const weeklyHours = c.week.reduce((a, d) => a + (d.kind === "riposo" ? 0 : d.hours), 0);

  const set = (patch: Partial<PlanConfig>) => {
    setC((prev) => ({ ...prev, ...patch }));
    setPreview(null);
  };
  const setDay = (i: number, patch: Partial<PlanConfig["week"][number]>) => set({ week: c.week.map((d, k) => (k === i ? { ...d, ...patch } : d)) });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pl-exam">Appello</Label>
            <Select
              id="pl-exam"
              value={examPreset}
              onChange={(e) => {
                const d = EXAM_DATES.find((x) => x.id === e.target.value);
                if (d) {
                  set({ examDate: dayKey(d.date) });
                  updateProfile({ examTarget: d.id });
                }
              }}
            >
              {EXAM_DATES.map((d) => <option key={d.id} value={d.id}>{d.label} · {fmt.date(d.date)}</option>)}
              {examPreset === "custom" && <option value="custom">Data personalizzata</option>}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pl-start">Inizio</Label>
              <Input id="pl-start" type="date" value={c.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pl-end">Esame</Label>
              <Input id="pl-end" type="date" value={c.examDate} onChange={(e) => set({ examDate: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[12px] font-medium text-fg-muted">Materie e livello di partenza</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {SUBJECTS.map((s) => {
              const on = c.subjects.includes(s.id);
              return (
                <div key={s.id} className={cn("rounded-2xl border p-3 transition", on ? "border-azure-400/30 bg-azure-500/[0.05]" : "border-white/[0.07]")}>
                  <label className="flex items-center gap-2 text-[13.5px] text-fg">
                    <input type="checkbox" className="h-4 w-4 accent-[#2f8bff]" checked={on} onChange={() => set({ subjects: on ? c.subjects.filter((x) => x !== s.id) : [...c.subjects, s.id] })} />
                    {s.id === "chimica" ? "Chimica" : s.name}
                  </label>
                  <Select
                    value={c.levels[s.id]}
                    disabled={!on}
                    onChange={(e) => set({ levels: { ...c.levels, [s.id]: e.target.value as PlanConfig["levels"][SubjectId] } })}
                    className="mt-2 h-8 text-[12.5px]"
                    aria-label={`Livello ${s.name}`}
                  >
                    <option value="base">Base (più tempo)</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzato">Avanzato (meno tempo)</option>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    max={3000}
                    disabled={!on}
                    value={c.pages?.[s.id] ?? ""}
                    onChange={(e) => set({ pages: { ...c.pages, [s.id]: e.target.value ? Number(e.target.value) : undefined } })}
                    placeholder="Pagine (facoltativo)"
                    className="mt-2 h-8 text-[12.5px]"
                    aria-label={`Pagine da studiare di ${s.name}`}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-fg-subtle">Senza numero di pagine, il tempo per argomento è stimato dai CFU del syllabus (circa 6 minuti per pagina se le indichi).</p>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-fg-muted">
            <span>Settimana tipo</span>
            <span className="font-mono text-fg-subtle">{weeklyHours} h/settimana</span>
          </div>
          <div className="space-y-1.5">
            {c.week.map((d, i) => (
              <div key={i} className="grid grid-cols-[96px_1fr_88px] items-center gap-2">
                <span className="text-[13px] text-fg-muted">{DAYS[i]}</span>
                <div className="flex gap-1">
                  {(Object.keys(KIND_LABEL) as DayKind[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setDay(i, { kind: k, hours: k === "riposo" ? 0 : d.hours || 2 })}
                      aria-pressed={d.kind === k}
                      className={cn("flex-1 rounded-lg border px-1 py-1 text-[11.5px] transition", d.kind === k ? "border-azure-400/50 bg-azure-500/15 text-azure-100" : "border-white/[0.07] text-fg-subtle hover:text-fg")}
                    >
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Input type="number" min={0} max={12} step={0.5} value={d.hours} disabled={d.kind === "riposo"} onChange={(e) => setDay(i, { hours: Math.max(0, Math.min(12, Number(e.target.value))) })} className="h-8 text-[13px]" aria-label={`Ore di studio ${DAYS[i]}`} />
                  <span className="text-[11px] text-fg-subtle">h</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-fg-subtle">Indica le ore che puoi davvero dedicare allo studio individuale. Nei giorni di lezione il piano aggiunge 20 minuti di rielaborazione (Cornell).</p>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[12px] font-medium text-fg-muted">Giorni liberi da impegni di studio</div>
          <div className="flex gap-2">
            <Input type="date" value={restInput} onChange={(e) => setRestInput(e.target.value)} className="h-9 w-auto" aria-label="Aggiungi un giorno libero" />
            <Button variant="secondary" size="sm" className="h-9" disabled={!restInput || c.restDates.includes(restInput)} onClick={() => { set({ restDates: [...c.restDates, restInput].sort() }); setRestInput(""); }}>
              <Plus className="h-4 w-4" /> Aggiungi
            </Button>
          </div>
          {c.restDates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.restDates.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[12px] text-fg-muted">
                  {fmt.dateShort(d)}
                  <button onClick={() => set({ restDates: c.restDates.filter((x) => x !== d) })} aria-label={`Rimuovi ${d}`} className="text-fg-subtle hover:text-fg"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/[0.06] pt-5">
          <Button variant="primary" disabled={!c.subjects.length} onClick={() => setPreview(generatePlan(c, inputs))}>
            <Sparkles className="h-4 w-4" /> Calcola il piano
          </Button>
          {onCancel && <Button variant="ghost" onClick={onCancel}>Annulla</Button>}
        </div>
      </Card>

      <div className="space-y-4">
        {preview ? (
          <Card className="p-6">
            <div className="text-[15px] font-semibold text-fg">Anteprima del piano</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-2xl bg-white/[0.03] p-3"><div className="text-fg-subtle">Giorni</div><div className="font-mono text-xl text-fg">{preview.stats.days}</div></div>
              <div className="rounded-2xl bg-white/[0.03] p-3"><div className="text-fg-subtle">Ore di studio</div><div className="font-mono text-xl text-fg">{fmt.hours(preview.stats.studyMinutes)}</div></div>
              <div className="rounded-2xl bg-white/[0.03] p-3"><div className="text-fg-subtle">Argomenti da studiare</div><div className="font-mono text-xl text-fg">{preview.stats.topicsToLearn}</div></div>
              <div className="rounded-2xl bg-white/[0.03] p-3"><div className="text-fg-subtle">Da recuperare</div><div className="font-mono text-xl text-fg">{preview.stats.topicsToRecover}</div></div>
              <div className="rounded-2xl bg-white/[0.03] p-3"><div className="text-fg-subtle">Simulazioni</div><div className="font-mono text-xl text-fg">{preview.stats.simulations}</div></div>
              <div className="rounded-2xl bg-white/[0.03] p-3"><div className="text-fg-subtle">Non pianificati</div><div className={cn("font-mono text-xl", preview.stats.topicsUnscheduled ? "text-amber-300" : "text-fg")}>{preview.stats.topicsUnscheduled}</div></div>
            </div>
            {preview.warnings.map((w) => (
              <Notice key={w} tone="warning" className="mt-3">{w}</Notice>
            ))}
            {!preview.warnings.length && <Notice tone="info" className="mt-3">Il piano copre tutti gli argomenti selezionati prima dell’esame, con ripassi dilazionati e simulazioni finali.</Notice>}
            <Button variant="primary" size="lg" className="mt-5 w-full" onClick={() => onSave(c, preview)}>
              <CalendarPlus className="h-4 w-4" /> Salva il piano nel calendario
            </Button>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="text-[15px] font-semibold text-fg">Come funziona</div>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-fg-muted">
              <li>• Gli argomenti già <Badge tone="success">consolidati</Badge> ricevono solo ripassi; quelli <Badge tone="warning">da consolidare</Badge> hanno priorità di recupero.</li>
              <li>• Ogni argomento studiato riceve ripassi dopo 1, 3, 7 e 16 giorni.</li>
              <li>• Gli argomenti con calcoli (fisica, chimica generale, genetica) hanno esercizi il giorno dopo.</li>
              <li>• Il sabato c’è pratica mista; nelle ultime settimane simulazioni complete.</li>
              <li>• Pause e giorni di riposo fanno parte del piano. Le attività di un giorno di riposo slittano al giorno seguente.</li>
            </ul>
            <p className="mt-4 flex gap-2 text-[12px] text-fg-subtle"><AlertTriangle className="h-4 w-4 shrink-0" /> È una stima: ricalcola il piano quando cambiano i tuoi risultati o la tua disponibilità.</p>
            <p className="mt-3 text-[12px] text-fg-subtle">Il piano parte da {fmt.date(c.startDate)} e termina il {fmt.date(c.examDate)} ({pluralize(Math.max(0, daysBetween(c.startDate, c.examDate)), "giorno", "giorni")}).</p>
          </Card>
        )}
      </div>
    </div>
  );
}
