"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { CalendarPlus, Plus, X } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { SUBJECTS, topicWeight } from "@/data/syllabus";
import { EXAM_DATES } from "@/data/exam";
import { Button, Card, Input, Label, Notice, ProgressBar, Segmented, Select, Stat } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { useTopicStates } from "@/lib/hooks";
import { generatePlan, type DayKind, type PlanConfig, type PlanResult } from "@/lib/planner";
import { capFirst, dayKey, daysBetween, fmt, pluralize } from "@/lib/utils";
import { SUBJECT_NAME } from "./plan-ui";

const cx = clsx;

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const KIND_OPTIONS: { value: DayKind; label: string }[] = [
  { value: "lezione", label: "Lezione" },
  { value: "libero", label: "Libero" },
  { value: "lavoro", label: "Lavoro" },
  { value: "riposo", label: "Riposo" },
];
const LEVEL_LABEL = { base: "Base: più tempo", intermedio: "Intermedio", avanzato: "Avanzato: meno tempo" } as const;

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
  return useMemo(() => states.map((s) => ({ ref: s.ref, status: s.status, weight: topicWeight(s.ref) })), [states]);
}

/** Topics that enter the plan out of those that still need study or recovery. */
export function coverage(r: PlanResult) {
  const total = r.stats.topicsToLearn + r.stats.topicsToRecover;
  return { total, scheduled: Math.max(0, total - r.stats.topicsUnscheduled) };
}

function Fieldset({ legend, aside, hint, children, first }: { legend: string; aside?: ReactNode; hint?: ReactNode; children: ReactNode; first?: boolean }) {
  return (
    <fieldset className={cx("min-w-0", !first && "mt-7 border-t border-white/[0.07] pt-6")}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <legend className="float-left text-base font-semibold text-fg">{legend}</legend>
        {aside}
      </div>
      {hint && <p className="clear-both mb-3 max-w-[62ch] text-ui leading-relaxed text-fg-subtle">{hint}</p>}
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

export function PlannerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: PlanConfig;
  onSave: (config: PlanConfig, result: PlanResult) => void;
  onCancel?: () => void;
}) {
  const inputs = usePlanInputs();
  const [c, setC] = useState<PlanConfig>(initial);
  const [restInput, setRestInput] = useState("");
  const deferred = useDeferredValue(c);
  const preview = useMemo(() => generatePlan(deferred, inputs), [deferred, inputs]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const examPreset = EXAM_DATES.find((d) => dayKey(d.date) === c.examDate)?.id ?? "custom";
  const weeklyHours = c.week.reduce((a, d) => a + (d.kind === "riposo" ? 0 : d.hours), 0);
  const days = Math.max(0, daysBetween(c.startDate, c.examDate));
  const invalidDates = !c.startDate || !c.examDate || days <= 0;
  const cov = coverage(preview);
  const unscheduled = preview.stats.topicsUnscheduled;
  const later = EXAM_DATES.find((d) => dayKey(d.date) > c.examDate);
  const noSubjects = !c.subjects.length;
  const canSave = !invalidDates && !noSubjects && preview.items.length > 0;

  const set = (patch: Partial<PlanConfig>) => setC((prev) => ({ ...prev, ...patch }));
  const setDay = (i: number, patch: Partial<PlanConfig["week"][number]>) => set({ week: c.week.map((d, k) => (k === i ? { ...d, ...patch } : d)) });
  const addHour = () => set({ week: c.week.map((d) => (d.kind === "riposo" ? d : { ...d, hours: Math.min(12, d.hours + 1) })) });

  // The phone bar with the save button hides while the full preview is on screen.
  useEffect(() => {
    const el = previewRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPreviewVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const saveLabel = unscheduled > 0 ? "Salva comunque" : "Salva il piano";
  const save = () => canSave && onSave(c, preview);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-5 sm:p-6">
        <Fieldset legend="Esame" first>
          <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <Label htmlFor="pl-exam">Appello</Label>
              <Select
                id="pl-exam"
                value={examPreset}
                onChange={(e) => {
                  const d = EXAM_DATES.find((x) => x.id === e.target.value);
                  if (d) set({ examDate: dayKey(d.date) });
                }}
              >
                {EXAM_DATES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}, {fmt.date(d.date)}
                  </option>
                ))}
                {examPreset === "custom" && <option value="custom">Data personalizzata</option>}
              </Select>
            </div>
            <div>
              <Label htmlFor="pl-start">Inizio del piano</Label>
              <Input id="pl-start" type="date" value={c.startDate} onChange={(e) => set({ startDate: e.target.value })} aria-invalid={invalidDates || undefined} />
            </div>
            <div>
              <Label htmlFor="pl-end">Data dell’esame</Label>
              <Input id="pl-end" type="date" value={c.examDate} onChange={(e) => set({ examDate: e.target.value })} aria-invalid={invalidDates || undefined} aria-describedby={invalidDates ? "pl-date-error" : undefined} />
            </div>
          </div>
          {invalidDates ? (
            <p id="pl-date-error" className="mt-2 text-ui text-red-300" role="alert">
              La data dell’esame deve venire dopo l’inizio del piano.
            </p>
          ) : (
            <p className="mt-2 text-ui text-fg-subtle">{pluralize(days, "giorno", "giorni")} di preparazione, esame compreso escluso il giorno stesso.</p>
          )}
        </Fieldset>

        <Fieldset
          legend="Settimana tipo"
          aside={<span className="text-ui tabular-nums text-fg-muted">{fmt.number(weeklyHours)} h a settimana</span>}
          hint="Le ore che puoi davvero dedicare allo studio individuale, lezioni escluse. Nei giorni di lezione il piano aggiunge 20 minuti di rielaborazione con il metodo Cornell."
        >
          <ul className="divide-y divide-white/[0.06]">
            {c.week.map((d, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-2.5 sm:grid-cols-[92px_minmax(0,1fr)_auto]">
                <span className="text-sm font-medium text-fg">{DAYS[i]}</span>
                <Segmented
                  ariaLabel={`Tipo di giornata, ${DAYS[i]}`}
                  value={d.kind}
                  onChange={(k) => setDay(i, { kind: k, hours: k === "riposo" ? 0 : d.hours || 2 })}
                  options={KIND_OPTIONS}
                  className="order-3 col-span-2 grid w-full grid-cols-4 sm:order-none sm:col-span-1 [&>button]:h-9 sm:[&>button]:h-8 [&>button]:px-1"
                />
                <div className="relative order-2 w-[5.5rem] sm:order-none">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={12}
                    step={0.5}
                    value={d.kind === "riposo" ? 0 : d.hours}
                    disabled={d.kind === "riposo"}
                    onChange={(e) => setDay(i, { hours: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
                    className="pr-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label={`Ore di studio, ${DAYS[i]}`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle" aria-hidden>
                    h
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Fieldset>

        <Fieldset
          legend="Materie e livello di partenza"
          hint="Il livello cambia il tempo stimato per argomento. Senza pagine indicate, il tempo si calcola dai CFU del syllabus; con le pagine, circa 6 minuti a pagina."
        >
          <ul className="divide-y divide-white/[0.06]">
            {SUBJECTS.map((s) => {
              const on = c.subjects.includes(s.id);
              return (
                <li key={s.id} className="grid gap-x-4 gap-y-3 py-3 sm:grid-cols-[minmax(0,1fr)_200px_150px] sm:items-end">
                  <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium text-fg">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-azure-500"
                      checked={on}
                      onChange={() => set({ subjects: on ? c.subjects.filter((x) => x !== s.id) : [...c.subjects, s.id] })}
                    />
                    <span className={cx("h-2 w-2 shrink-0 rounded-full", TONE[SUBJECT_TONE[s.id]].dot)} aria-hidden />
                    {s.name}
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:contents">
                    <div>
                      <Label htmlFor={`pl-level-${s.id}`}>Livello</Label>
                      <Select
                        id={`pl-level-${s.id}`}
                        value={c.levels[s.id]}
                        disabled={!on}
                        onChange={(e) => set({ levels: { ...c.levels, [s.id]: e.target.value as PlanConfig["levels"][SubjectId] } })}
                      >
                        {(Object.keys(LEVEL_LABEL) as (keyof typeof LEVEL_LABEL)[]).map((l) => (
                          <option key={l} value={l}>
                            {LEVEL_LABEL[l]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`pl-pages-${s.id}`}>
                        Pagine <span className="font-normal text-fg-subtle">(facoltativo)</span>
                      </Label>
                      <Input
                        id={`pl-pages-${s.id}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={3000}
                        disabled={!on}
                        value={c.pages?.[s.id] ?? ""}
                        onChange={(e) => set({ pages: { ...c.pages, [s.id]: e.target.value ? Number(e.target.value) : undefined } })}
                        placeholder="Es. 350"
                        className="tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {noSubjects && (
            <p className="mt-2 text-ui text-red-300" role="alert">
              Scegli almeno una materia.
            </p>
          )}
        </Fieldset>

        <Fieldset legend="Giorni senza studio" hint="Feste, viaggi, impegni: in quei giorni il piano non mette attività e le sposta al giorno seguente.">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 sm:max-w-[220px] sm:flex-none">
              <Label htmlFor="pl-rest">Giorno da aggiungere</Label>
              <Input id="pl-rest" type="date" value={restInput} min={c.startDate} max={c.examDate} onChange={(e) => setRestInput(e.target.value)} />
            </div>
            <Button
              variant="secondary"
              disabled={!restInput || c.restDates.includes(restInput)}
              onClick={() => {
                set({ restDates: [...c.restDates, restInput].sort() });
                setRestInput("");
              }}
            >
              <Plus className="h-4 w-4" aria-hidden /> Aggiungi
            </Button>
          </div>
          {c.restDates.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Giorni senza studio">
              {c.restDates.map((d) => (
                <li key={d} className="inline-flex h-8 items-center gap-1 rounded-chip border border-white/10 bg-white/[0.03] pl-2.5 pr-1 text-ui text-fg-muted">
                  {capFirst(`${fmt.weekdayShort(d)} ${fmt.date(d)}`)}
                  <button
                    type="button"
                    onClick={() => set({ restDates: c.restDates.filter((x) => x !== d) })}
                    aria-label={`Rimuovi ${fmt.full(d)}`}
                    className="grid h-6 w-6 place-items-center rounded-md text-fg-subtle hover:bg-white/[0.08] hover:text-fg"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-ui text-fg-subtle">Nessuno per ora.</p>
          )}
        </Fieldset>

        {onCancel && (
          <div className="mt-7 border-t border-white/[0.07] pt-5">
            <Button variant="ghost" onClick={onCancel}>
              Annulla le modifiche
            </Button>
          </div>
        )}
      </Card>

      {/* Live preview: recalculated on every change, so there is no separate "compute" step. */}
      <div ref={previewRef} className="lg:sticky lg:top-20">
        <Card as="section" aria-labelledby="pl-preview-title" className="p-5 sm:p-6">
          <h2 id="pl-preview-title" className="text-base font-semibold text-fg">
            Anteprima del piano
          </h2>
          {invalidDates || noSubjects ? (
            <p className="mt-3 text-sm text-fg-muted">Completa le date e le materie per vedere l’anteprima.</p>
          ) : (
            <>
              <p className="mt-3 text-sm text-fg-muted" aria-live="polite">
                <span className="font-display text-3xl leading-none text-fg tabular-nums">{cov.scheduled}</span>
                <span className="text-fg-muted"> argomenti su {cov.total} entrano nel piano</span>
              </p>
              <ProgressBar
                value={cov.total ? cov.scheduled / cov.total : 1}
                tone={unscheduled ? "warning" : "success"}
                size="md"
                className="mt-3"
                label={`Argomenti pianificati: ${cov.scheduled} su ${cov.total}`}
              />
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                <PreviewStat label="Ore di studio" value={fmt.hours(preview.stats.studyMinutes)} />
                <PreviewStat label="Giorni" value={preview.stats.days} />
                <PreviewStat label="Da recuperare" value={preview.stats.topicsToRecover} />
                <PreviewStat label="Simulazioni" value={preview.stats.simulations} />
              </dl>

              {preview.warnings.length > 0 ? (
                <Notice tone="warning" className="mt-5" title={unscheduled ? `${pluralize(unscheduled, "argomento resta", "argomenti restano")} fuori` : "Da sapere"}>
                  <p>{preview.warnings.join(" ")}</p>
                  {unscheduled > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={addHour}>
                        <Plus className="h-3.5 w-3.5" aria-hidden /> 1 h in più al giorno
                      </Button>
                      {later && (
                        <Button size="sm" variant="secondary" onClick={() => set({ examDate: dayKey(later.date) })}>
                          Usa il {later.label.toLowerCase()}
                        </Button>
                      )}
                    </div>
                  )}
                </Notice>
              ) : (
                <Notice tone="success" className="mt-5">
                  Tutti gli argomenti selezionati entrano prima dell’esame, con ripassi dilazionati e simulazioni finali.
                </Notice>
              )}
            </>
          )}

          <Button variant={unscheduled > 0 ? "secondary" : "primary"} size="lg" className="mt-5 w-full" disabled={!canSave} onClick={save}>
            <CalendarPlus className="h-4 w-4" aria-hidden /> {saveLabel}
          </Button>

          <details className="group mt-5 border-t border-white/[0.07] pt-4">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-sm font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
              Come costruisce il piano
              <Plus className="h-4 w-4 transition-transform duration-200 group-open:rotate-45" aria-hidden />
            </summary>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-ui leading-relaxed text-fg-muted marker:text-fg-subtle">
              <li>Gli argomenti già consolidati ricevono solo ripassi; quelli da consolidare hanno la precedenza.</li>
              <li>Ogni argomento studiato torna in ripasso dopo 1, 3, 7 e 16 giorni.</li>
              <li>Fisica, chimica generale e genetica hanno esercizi il giorno dopo lo studio.</li>
              <li>Il sabato c’è pratica mista; nelle ultime settimane simulazioni complete.</li>
              <li>Pause e riposo fanno parte del piano. È una stima: ricalcolalo quando cambiano risultati o disponibilità.</li>
            </ul>
          </details>
        </Card>
      </div>

      {/* Phones and tablets: the save action stays reachable above the tab bar while the form scrolls. */}
      <div
        className={cx(
          "sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-1 transition-opacity duration-200 lg:hidden",
          previewVisible ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={previewVisible || undefined}
      >
        <div className="surface-overlay flex items-center gap-3 rounded-card p-2.5 pl-4">
          <p className="min-w-0 flex-1 text-ui text-fg-muted">
            {invalidDates || noSubjects ? (
              "Completa date e materie"
            ) : (
              <>
                <span className="font-semibold tabular-nums text-fg">
                  {cov.scheduled} di {cov.total}
                </span>{" "}
                argomenti nel piano
              </>
            )}
          </p>
          <Button variant={unscheduled > 0 ? "secondary" : "primary"} disabled={!canSave} onClick={save} tabIndex={previewVisible ? -1 : undefined}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-ui text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-[-0.01em] text-fg">{value}</dd>
    </div>
  );
}
