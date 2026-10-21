"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, ExternalLink, RefreshCw, Settings2, Telescope, Trash2 } from "lucide-react";
import { getTopicRef } from "@/data/syllabus";
import { EXAM_DATES, EXAM_DATES_SOURCE } from "@/data/exam";
import { Badge, Button, Card, Modal, Notice, PageHeader, ProgressBar, SectionTitle, Segmented, Stat } from "@/components/ui/primitives";
import { TONE, type Tone } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/hooks";
import { generatePlan, KIND_META, type PlanConfig, type PlanItem, type PlanResult } from "@/lib/planner";
import { addDays, cn, dayKey, daysBetween, fmt, pluralize, startOfDay, startOfWeek } from "@/lib/utils";
import { defaultConfig, PlannerForm, usePlanInputs } from "./planner-form";

type View = "settimana" | "mese" | "agenda";

const tone = (it: PlanItem) => KIND_META[it.kind].tone as Tone;
const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/** Where each kind of plan item leads. */
function actionFor(it: PlanItem): { href: string; label: string } | null {
  const first = it.topicIds[0] ? getTopicRef(it.topicIds[0]) : undefined;
  switch (it.kind) {
    case "apprendimento":
    case "recupero":
      return first ? { href: `/studio/${first.topic.id}?mode=${it.kind === "recupero" ? "ultra" : "deep"}`, label: "Inizia la sessione" } : null;
    case "esercizi":
      return first ? { href: `/materie/${first.subject.id}/${first.topic.id}#esempi`, label: "Apri gli esercizi" } : null;
    case "ripasso":
      return { href: "/flashcard/ripasso", label: "Ripassa le flashcard" };
    case "interleaving":
      return { href: "/quiz", label: "Quiz misto" };
    case "simulazione":
      return { href: it.subject ? `/quiz/simulazione?materia=${it.subject}` : "/quiz/simulazione", label: "Avvia la simulazione" };
    case "rielaborazione":
      return { href: "/academy/cornell", label: "Metodo Cornell" };
    default:
      return null;
  }
}

function ItemRow({ it, done, onToggle, compact }: { it: PlanItem; done: boolean; onToggle: () => void; compact?: boolean }) {
  const t = TONE[tone(it)];
  const act = actionFor(it);
  const checkable = it.kind !== "riposo" && it.kind !== "esame" && it.kind !== "pausa";
  const check = checkable ? (
    <button onClick={onToggle} aria-label={done ? "Segna come da fare" : "Segna come svolto"} className="mt-0.5 shrink-0">
      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <CircleDashed className="h-4 w-4 text-fg-subtle hover:text-fg" />}
    </button>
  ) : (
    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", t.dot)} />
  );

  if (compact) {
    // Week view: kind on top, then the subject or topic only.
    const short = it.title.includes(" · ") ? it.title.split(" · ").slice(1).join(" · ") : it.title;
    return (
      <div className={cn("rounded-lg border px-2 py-1.5 transition", t.border, t.bg, done && "opacity-55")} title={it.title}>
        <div className="flex items-center justify-between gap-1">
          <span className={cn("text-[10.5px] font-medium uppercase tracking-wide", t.text)}>{KIND_META[it.kind].label}</span>
          {checkable && (
            <button onClick={onToggle} aria-label={done ? "Segna come da fare" : `Segna come svolto: ${it.title}`}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <CircleDashed className="h-3.5 w-3.5 text-fg-subtle hover:text-fg" />}
            </button>
          )}
        </div>
        <div className={cn("mt-0.5 line-clamp-3 text-[11.5px] leading-snug text-fg", done && "line-through")}>{short}</div>
        {it.minutes > 0 && <div className="mt-0.5 font-mono text-[10px] text-fg-subtle">{fmt.minutes(it.minutes)}</div>}
      </div>
    );
  }

  return (
    <div className={cn("group flex gap-2.5 rounded-xl border px-2.5 py-2 transition", t.border, t.bg, done && "opacity-55")}>
      {check}
      <div className="min-w-0 flex-1">
        <div className={cn("text-[12.5px] font-medium leading-snug text-fg", done && "line-through")}>{it.title}</div>
        <div className="mt-0.5 text-[11.5px] leading-relaxed text-fg-subtle">{it.detail}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <span className={t.text}>{KIND_META[it.kind].label}</span>
          {it.minutes > 0 && <span className="text-fg-subtle">{fmt.minutes(it.minutes)}</span>}
          {act && !done && (
            <Link href={act.href} className="inline-flex items-center gap-0.5 text-azure-300 hover:underline">
              {act.label} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  const plan = useAtlas((s) => s.plan);
  const planDone = useAtlas((s) => s.planDone);
  const profile = useAtlas((s) => s.profile);
  const progress = useAtlas((s) => s.progress);
  const planned = useAtlas((s) => s.plannedResources);
  const setPlan = useAtlas((s) => s.setPlan);
  const togglePlanItem = useAtlas((s) => s.togglePlanItem);
  const clearPlan = useAtlas((s) => s.clearPlan);
  const removeFromPlan = useAtlas((s) => s.removeResourceFromPlan);
  const inputs = usePlanInputs();

  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<View>("settimana");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<string>(() => dayKey(new Date()));
  const [confirmClear, setConfirmClear] = useState(false);

  const today = dayKey(now);
  const items = hydrated ? plan?.items ?? [] : [];
  const done = new Set(hydrated ? planDone : []);
  const byDay = useMemo(() => {
    const m = new Map<string, PlanItem[]>();
    for (const it of items) m.set(it.date, [...(m.get(it.date) ?? []), it]);
    return m;
  }, [items]);

  const toggle = (it: PlanItem) => {
    const wasDone = done.has(it.id);
    togglePlanItem(it.id);
    if (!wasDone && (it.kind === "apprendimento" || it.kind === "recupero")) {
      const id = it.topicIds[0];
      const p = id ? progress[id] : undefined;
      if (!p?.quiz.length && !p?.recall.length) {
        toast("Segnato come svolto", { tone: "info", description: "Per considerare l’argomento appreso serve una verifica: fai il quiz o il richiamo attivo." });
      }
    }
  };

  const save = (config: PlanConfig, result: PlanResult, keepPast: boolean) => {
    const past = keepPast && plan ? plan.items.filter((i) => i.date < config.startDate) : [];
    setPlan(config, [...past, ...result.items]);
    setEditing(false);
    toast("Piano salvato nel calendario");
  };

  /** Re-plans from today with the current, measured topic status. */
  const regenerate = () => {
    if (!plan) return;
    const config = { ...plan.config, startDate: today };
    const result = generatePlan(config, inputs);
    save(config, result, true);
    if (result.warnings.length) toast("Piano ricalcolato con avvisi", { tone: "warning", description: result.warnings[0] });
  };

  // ── Empty / editing state ───────────────────────────────────
  if (hydrated && (!plan || editing)) {
    return (
      <div className="pb-16">
        <PageHeader
          eyebrow={<span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Calendario</span>}
          title={<>Un piano realistico, <span className="italic text-gradient-azure">costruito sui tuoi dati</span>.</>}
          description="Indica appello, disponibilità settimanale e livello di partenza. ATLAS distribuisce apprendimento, esercizi, ripassi dilazionati, simulazioni, pause e recupero, partendo dallo stato reale di ogni argomento."
        />
        <div className="mt-8">
          <PlannerForm
            initial={plan?.config ? { ...plan.config, startDate: today } : defaultConfig(profile.examTarget, profile.levels, profile.dailyGoalMinutes)}
            onSave={(c, r) => save(c, r, !!plan)}
            onCancel={plan ? () => setEditing(false) : undefined}
          />
        </div>
      </div>
    );
  }
  if (!hydrated || !plan) return <div className="mt-20 h-64 animate-pulse rounded-3xl bg-white/[0.03]" />;

  // ── Stats ───────────────────────────────────────────────────
  const examDay = plan.config.examDate;
  const daysLeft = Math.max(0, daysBetween(now, examDay));
  const checkable = items.filter((i) => !["riposo", "esame", "pausa"].includes(i.kind));
  const dueSoFar = checkable.filter((i) => i.date < today);
  const late = dueSoFar.filter((i) => !done.has(i.id));
  const doneCount = checkable.filter((i) => done.has(i.id)).length;
  const plannedMinutes = checkable.reduce((a, i) => a + i.minutes, 0);
  const todayItems = byDay.get(selected) ?? [];

  // ── Views ───────────────────────────────────────────────────
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const shift = (dir: number) => setAnchor((a) => (view === "mese" ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : addDays(a, 7 * dir)));
  const agendaDays = [...byDay.keys()].filter((d) => d >= today).sort().slice(0, 21);

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Calendario</span>}
        title={<>Il tuo piano fino all’esame.</>}
        description={`Generato il ${fmt.date(plan.generatedAt)} · esame il ${fmt.full(examDay)}. Segna le attività svolte; se resti indietro o i tuoi risultati cambiano, ricalcola il piano dal progresso reale.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}><Settings2 className="h-4 w-4" /> Disponibilità</Button>
            <Button variant="primary" onClick={regenerate}><RefreshCw className="h-4 w-4" /> Ricalcola dal progresso reale</Button>
          </>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Giorni all’esame" value={daysLeft} hint={fmt.full(examDay)} tone="azure" />
        <Stat label="Attività svolte" value={`${doneCount}/${checkable.length}`} hint={<ProgressBar value={checkable.length ? doneCount / checkable.length : 0} className="mt-1.5" label="Attività svolte" />} />
        <Stat label="In ritardo" value={late.length} hint={late.length ? "Attività passate non segnate" : "Sei in pari"} />
        <Stat label="Ore pianificate" value={fmt.hours(plannedMinutes)} hint={`${pluralize(items.filter((i) => i.kind === "simulazione").length, "simulazione", "simulazioni")}`} />
      </div>

      {late.length >= 3 && (
        <Notice tone="warning" className="mt-4" title={`${pluralize(late.length, "attività arretrata", "attività arretrate")}`} action={<Button size="sm" variant="secondary" onClick={regenerate}><RefreshCw className="h-3.5 w-3.5" /> Ricalcola</Button>}>
          Ricalcolare ridistribuisce il lavoro rimanente sui giorni che restano, in base allo stato attuale degli argomenti.
        </Notice>
      )}

      <div className="mt-6 grid gap-6 2xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Segmented value={view} onChange={setView} options={[{ value: "settimana", label: "Settimana" }, { value: "mese", label: "Mese" }, { value: "agenda", label: "Agenda" }]} />
            {view !== "agenda" && (
              <div className="ml-auto flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Precedente"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="min-w-[150px] text-center text-[13.5px] capitalize text-fg">
                  {view === "mese" ? new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(anchor) : `${fmt.dateShort(weekDays[0])} – ${fmt.dateShort(weekDays[6])}`}
                </span>
                <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Successivo"><ChevronRight className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { setAnchor(startOfDay(new Date())); setSelected(today); }}>Oggi</Button>
              </div>
            )}
          </div>

          {view === "settimana" && (
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="grid min-w-[760px] grid-cols-7 gap-1.5">
                {weekDays.map((d) => {
                  const k = dayKey(d);
                  const list = (byDay.get(k) ?? []).filter((i) => i.kind !== "pausa");
                  const isToday = k === today;
                  return (
                    <div key={k} className={cn("flex min-h-[220px] flex-col rounded-2xl border p-2", isToday ? "border-azure-400/40 bg-azure-500/[0.04]" : "border-white/[0.06] bg-white/[0.015]", k === examDay && "border-red-400/40")}>
                      <button onClick={() => setSelected(k)} className="mb-2 flex items-baseline justify-between px-1 text-left">
                        <span className={cn("text-[11px] uppercase tracking-wider", isToday ? "text-azure-300" : "text-fg-subtle")}>{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
                        <span className={cn("font-mono text-[13px]", isToday ? "text-azure-200" : "text-fg-muted")}>{d.getDate()}</span>
                      </button>
                      <div className="space-y-1.5">
                        {list.map((it) => <ItemRow key={it.id} it={it} done={done.has(it.id)} onToggle={() => toggle(it)} compact />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === "mese" && (
            <div>
              <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] uppercase tracking-wider text-fg-subtle">
                {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((d) => {
                  const k = dayKey(d);
                  const list = (byDay.get(k) ?? []).filter((i) => i.kind !== "pausa");
                  const minutes = list.reduce((a, i) => a + i.minutes, 0);
                  const inMonth = d.getMonth() === anchor.getMonth();
                  const allDone = list.length > 0 && list.filter((i) => !["riposo", "esame"].includes(i.kind)).every((i) => done.has(i.id));
                  return (
                    <button
                      key={k}
                      onClick={() => setSelected(k)}
                      className={cn(
                        "flex aspect-square flex-col rounded-xl border p-1.5 text-left transition sm:aspect-[4/3]",
                        k === selected ? "border-azure-400/60 bg-azure-500/10" : "border-white/[0.05] hover:border-white/15",
                        !inMonth && "opacity-35",
                        k === examDay && "border-red-400/50 bg-red-500/10",
                      )}
                    >
                      <span className={cn("font-mono text-[12px]", k === today ? "text-azure-300" : "text-fg-muted")}>{d.getDate()}</span>
                      <span className="mt-auto flex flex-wrap gap-0.5">
                        {list.slice(0, 6).map((it) => <span key={it.id} className={cn("h-1.5 w-1.5 rounded-full", TONE[tone(it)].dot)} />)}
                      </span>
                      {minutes > 0 && <span className={cn("hidden text-[10px] sm:block", allDone ? "text-emerald-300" : "text-fg-subtle")}>{fmt.minutes(minutes)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "agenda" && (
            <div className="space-y-5">
              {agendaDays.map((k) => (
                <div key={k}>
                  <div className={cn("mb-2 text-[13px] font-medium capitalize", k === today ? "text-azure-300" : "text-fg")}>{k === today ? "Oggi · " : ""}{fmt.full(k)}</div>
                  <div className="space-y-1.5">
                    {(byDay.get(k) ?? []).filter((i) => i.kind !== "pausa").map((it) => <ItemRow key={it.id} it={it} done={done.has(it.id)} onToggle={() => toggle(it)} />)}
                  </div>
                </div>
              ))}
              {!agendaDays.length && <Notice tone="info">Non ci sono attività future nel piano.</Notice>}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-fg-subtle">
            {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).filter((k) => k !== "pausa").map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", TONE[KIND_META[k].tone as Tone].dot)} /> {KIND_META[k].label}</span>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <aside className="grid content-start gap-4 md:grid-cols-2 2xl:grid-cols-1">
          <Card className="p-5">
            <SectionTitle title={<span className="capitalize">{selected === today ? "Oggi" : fmt.full(selected)}</span>} />
            {todayItems.length ? (
              <div className="space-y-2">
                {todayItems.map((it) => <ItemRow key={it.id} it={it} done={done.has(it.id)} onToggle={() => toggle(it)} />)}
              </div>
            ) : (
              <p className="text-[13px] text-fg-subtle">Nessuna attività pianificata.</p>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Appelli ufficiali" />
            <ul className="space-y-2 text-[13px]">
              {EXAM_DATES.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span className="text-fg-muted">{d.label}</span>
                  <span className="text-right text-fg">{fmt.date(d.date)} · 11:00</span>
                </li>
              ))}
            </ul>
            <a href={EXAM_DATES_SOURCE.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-azure-300 hover:underline">
              {EXAM_DATES_SOURCE.label.split(";")[0]} <ExternalLink className="h-3 w-3" />
            </a>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Risorse nel piano" icon={<Telescope className="h-4 w-4" />} />
            {planned.length ? (
              <ul className="space-y-2">
                {planned.map((r) => (
                  <li key={r.resourceId} className="flex items-center gap-2 text-[13px]">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-fg-muted hover:text-fg">{r.title}</a>
                    <button onClick={() => removeFromPlan(r.resourceId)} className="text-fg-subtle hover:text-fg" aria-label={`Rimuovi ${r.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-fg-subtle">Aggiungi videolezioni e corsi dalla sezione <Link href="/risorse" className="text-azure-300 hover:underline">Study Resources</Link>.</p>
            )}
          </Card>

          {plan.config && (
            <p className="flex gap-2 px-1 text-[11.5px] leading-relaxed text-fg-subtle md:col-span-2 2xl:col-span-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Le stime di tempo sono indicative. Una sessione «svolta» non equivale ad argomento appreso: conta la verifica con quiz e richiamo.
            </p>
          )}
          <div>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}><Trash2 className="h-3.5 w-3.5" /> Elimina il piano</Button>
          </div>
        </aside>
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        size="sm"
        title="Eliminare il piano?"
        description="Verranno rimosse tutte le attività e le spunte. I tuoi progressi sugli argomenti restano."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>Annulla</Button>
            <Button variant="danger" onClick={() => { clearPlan(); setConfirmClear(false); }}>Elimina</Button>
          </div>
        }
      >
        <Badge tone="muted">{pluralize(items.length, "attività", "attività")}</Badge>
      </Modal>
    </div>
  );
}
