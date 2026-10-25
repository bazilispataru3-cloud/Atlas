"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Info, PencilLine, RefreshCw, Telescope, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { EXAM_DATES, EXAM_DATES_SOURCE } from "@/data/exam";
import { Button, EmptyState, Modal, Notice, PageHeader, ProgressBar, Skeleton, TabPanel, Tabs } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import { useHydrated, useNow, useReducedMotion } from "@/lib/hooks";
import { carryOverDone, generatePlan, type PlanConfig, type PlanItem, type PlanResult } from "@/lib/planner";
import { addDays, capFirst, dayKey, fmt, pluralize, startOfDay, startOfWeek } from "@/lib/utils";
import { coverage, defaultConfig, PlannerForm, usePlanInputs } from "./planner-form";
import { isCheckable, useFocusTitle, useMediaQuery } from "./plan-ui";
import { Agenda, DayPanel, Legend, MonthGrid, PlanRoute, WeekGrid, WeekStrip } from "./views";

const cx = clsx;

type View = "agenda" | "settimana" | "mese";
type Confirm =
  | { kind: "clear" }
  | { kind: "replace"; config: PlanConfig; result: PlanResult }
  | { kind: "recalc"; config: PlanConfig; result: PlanResult };

const VIEWS: { value: View; label: string }[] = [
  { value: "agenda", label: "Agenda" },
  { value: "settimana", label: "Settimana" },
  { value: "mese", label: "Mese" },
];
const AGENDA_STEP = 7;

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });

function weekRange(days: Date[]) {
  const a = days[0];
  const b = days[6];
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${fmt.dateShort(b)}` : `${fmt.dateShort(a)} – ${fmt.dateShort(b)}`;
}

function examLabelFor(examKey: string) {
  const preset = EXAM_DATES.find((d) => dayKey(d.date) === examKey);
  const when = capFirst(`${fmt.weekday(examKey)} ${fmt.date(examKey)}`);
  return preset ? `${preset.label}, ${when.charAt(0).toLowerCase()}${when.slice(1)}, ore 11:00` : `Esame ${when.charAt(0).toLowerCase()}${when.slice(1)}`;
}

export function CalendarPage() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  const reduceMotion = useReducedMotion();
  const plan = useAtlas((s) => s.plan);
  const planDone = useAtlas((s) => s.planDone);
  const profile = useAtlas((s) => s.profile);
  const progress = useAtlas((s) => s.progress);
  const planned = useAtlas((s) => s.plannedResources);
  const setPlan = useAtlas((s) => s.setPlan);
  const togglePlanItem = useAtlas((s) => s.togglePlanItem);
  const clearPlan = useAtlas((s) => s.clearPlan);
  const updateProfile = useAtlas((s) => s.updateProfile);
  const removeFromPlan = useAtlas((s) => s.removeResourceFromPlan);
  const inputs = usePlanInputs();
  const isMd = useMediaQuery("(min-width: 768px)");
  const isXl = useMediaQuery("(min-width: 1280px)");
  const is2xl = useMediaQuery("(min-width: 1536px)");

  const [editing, setEditing] = useState(false);
  const [viewChoice, setViewChoice] = useState<View | null>(null);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<string>(() => dayKey(new Date()));
  const [agendaCount, setAgendaCount] = useState(AGENDA_STEP);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const dayRef = useRef<HTMLElement>(null);
  useFocusTitle(focusTick, reduceMotion);

  // Phones open on the agenda (readable list); larger screens on the week.
  const view: View = viewChoice ?? (isMd ? "settimana" : "agenda");
  // The week needs the full width up to 2xl; month and agenda leave room for the day detail from xl.
  const sideBySide = view === "settimana" ? is2xl : isXl;
  const today = dayKey(now);
  const tomorrow = dayKey(addDays(now, 1));
  const items = useMemo(() => (hydrated ? plan?.items ?? [] : []), [hydrated, plan]);
  const done = useMemo(() => new Set(hydrated ? planDone : []), [hydrated, planDone]);
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
        toast("Segnata come svolta", { tone: "info", description: "Per considerare l’argomento appreso serve una verifica: fai il quiz o il richiamo attivo." });
      }
    }
  };

  /** Writes the plan: past activities and check marks are kept, matching activities keep their check. */
  const commit = (config: PlanConfig, result: PlanResult, message: string) => {
    const past = plan ? plan.items.filter((i) => i.date < config.startDate) : [];
    const carried = plan ? carryOverDone(plan.items, planDone, result.items, config.startDate) : [];
    setPlan(config, [...past, ...result.items]);
    carried.forEach((id) => togglePlanItem(id));
    // The profile follows the plan, so there is one source of truth for exam and levels.
    const preset = EXAM_DATES.find((d) => dayKey(d.date) === config.examDate);
    updateProfile({ levels: config.levels, ...(preset ? { examTarget: preset.id } : {}) });
    setEditing(false);
    setConfirm(null);
    setSelected(today);
    setAnchor(startOfDay(new Date()));
    setAgendaCount(AGENDA_STEP);
    setFocusTick((n) => n + 1);
    const out = result.stats.topicsUnscheduled;
    toast(message, {
      description: out > 0 ? `${pluralize(out, "argomento resta", "argomenti restano")} fuori: puoi aggiungere ore o scegliere un appello successivo.` : undefined,
    });
  };

  const onFormSave = (config: PlanConfig, result: PlanResult) => {
    if (plan) setConfirm({ kind: "replace", config, result });
    else commit(config, result, "Piano salvato");
  };

  const askRecalc = () => {
    if (!plan) return;
    const config = { ...plan.config, startDate: today };
    setConfirm({ kind: "recalc", config, result: generatePlan(config, inputs) });
  };

  const select = (k: string, reveal = true) => {
    setSelected(k);
    // Below xl the day detail sits under the grid: bring it into view so the tap has a visible answer.
    if (reveal && !sideBySide && view !== "agenda") {
      window.requestAnimationFrame(() => dayRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: view === "settimana" && !isXl ? "nearest" : "start" }));
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (!hydrated) {
    return (
      <div className="pb-16" aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-10 w-80 max-w-full" />
        <Skeleton className="mt-8 h-40 w-full rounded-card" />
        <Skeleton className="mt-6 h-80 w-full rounded-card" />
        <span className="sr-only" role="status">
          Caricamento del calendario
        </span>
      </div>
    );
  }

  // ── No plan yet, or editing ─────────────────────────────────
  if (!plan || editing) {
    return (
      <div className="pb-16">
        <PageHeader
          eyebrow="Calendario"
          title={plan ? "Modifica il piano" : "Crea il tuo piano di studio"}
          description={
            plan
              ? "Il nuovo piano parte da oggi. Le attività già passate e le spunte restano; l’anteprima mostra subito l’effetto di ogni modifica."
              : "Non hai ancora un piano. Indica appello e ore disponibili: ATLAS distribuisce studio, esercizi, ripassi e simulazioni fino all’esame, partendo da ciò che hai già consolidato."
          }
        />
        <div className="mt-8">
          <PlannerForm
            initial={plan?.config ? { ...plan.config, startDate: today } : defaultConfig(profile.examTarget, profile.levels, profile.dailyGoalMinutes)}
            onSave={onFormSave}
            onCancel={
              plan
                ? () => {
                    setEditing(false);
                    setFocusTick((n) => n + 1);
                  }
                : undefined
            }
          />
        </div>
        <ConfirmModals confirm={confirm} onClose={() => setConfirm(null)} plan={plan} done={done} today={today} onCommit={commit} onClear={() => {}} />
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────
  const examDay = plan.config.examDate;
  const startKey = items.reduce((min, i) => (i.date < min ? i.date : min), plan.config.startDate);
  const checkable = items.filter(isCheckable);
  const late = checkable.filter((i) => i.date < today && !done.has(i.id));
  const doneCount = checkable.filter((i) => done.has(i.id)).length;
  const plannedMinutes = checkable.reduce((a, i) => a + i.minutes, 0);
  const examPassed = today > examDay;

  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const monthLabel = capFirst(monthFmt.format(anchor));
  const futureDays = [...byDay.keys()].filter((d) => d >= today).sort();
  const agendaDays = futureDays.slice(0, agendaCount);

  const shift = (dir: -1 | 1) => {
    const next = view === "mese" ? new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1) : addDays(anchor, 7 * dir);
    setAnchor(next);
    // The detail follows the period on screen: today when it is in it, else its first day.
    const first = view === "mese" ? next : startOfWeek(next);
    const last = view === "mese" ? new Date(next.getFullYear(), next.getMonth() + 1, 0) : addDays(first, 6);
    setSelected(today >= dayKey(first) && today <= dayKey(last) ? today : dayKey(first));
  };
  const goToday = () => {
    setAnchor(startOfDay(new Date()));
    setSelected(today);
  };
  const stepDay = (dir: -1 | 1) => {
    const next = addDays(selected, dir);
    setSelected(dayKey(next));
    setAnchor(startOfDay(next));
  };
  const inPeriod = view === "mese" ? now.getMonth() === anchor.getMonth() && now.getFullYear() === anchor.getFullYear() : weekDays.some((d) => dayKey(d) === today);

  const dayPanel = (
    <DayPanel ref={dayRef} day={selected} today={today} tomorrow={tomorrow} list={byDay.get(selected) ?? []} done={done} onToggle={toggle} onStep={stepDay} />
  );

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow="Calendario"
        title="Il tuo piano fino all’esame"
        description="Segna le attività svolte. Se resti indietro o i risultati cambiano, ricalcola: il piano si adatta allo stato reale di ogni argomento."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <PencilLine className="h-4 w-4" aria-hidden /> Modifica il piano
            </Button>
            <Button variant="secondary" onClick={askRecalc} disabled={examPassed}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Ricalcola
            </Button>
          </>
        }
      />

      <PlanRoute
        startKey={startKey}
        examKey={examDay}
        today={today}
        examLabel={examLabelFor(examDay)}
        doneCount={doneCount}
        total={checkable.length}
        late={late.length}
        plannedMinutes={plannedMinutes}
      />

      {examPassed ? (
        <Notice
          tone="info"
          className="mt-4"
          title="La data d’esame di questo piano è passata"
          action={
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Crea un nuovo piano
            </Button>
          }
        >
          Scegli il prossimo appello: le attività svolte restano registrate.
        </Notice>
      ) : (
        late.length >= 3 && (
          <Notice
            tone="warning"
            className="mt-4"
            title={`${pluralize(late.length, "attività arretrata", "attività arretrate")}`}
            action={
              <Button size="sm" variant="secondary" onClick={askRecalc}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Ricalcola
              </Button>
            }
          >
            Ricalcolare ridistribuisce il lavoro rimasto sui giorni che mancano, in base allo stato attuale degli argomenti.
          </Notice>
        )
      )}

      <div className={cx("mt-8 grid items-start gap-6", view === "settimana" ? "2xl:grid-cols-[minmax(0,1fr)_340px]" : "xl:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <Tabs base="cal-view" ariaLabel="Vista del calendario" value={view} onChange={setViewChoice} items={VIEWS} className="min-w-0 flex-1" />
          </div>

          <TabPanel base="cal-view" value={view} className="pt-4">
            {view !== "agenda" && (
              <div className="mb-3 flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label={view === "mese" ? "Mese precedente" : "Settimana precedente"}>
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Button>
                <p className="min-w-0 flex-1 text-center text-sm font-medium text-fg sm:flex-none sm:px-2" aria-live="polite">
                  {view === "mese" ? monthLabel : weekRange(weekDays)}
                </p>
                <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label={view === "mese" ? "Mese successivo" : "Settimana successiva"}>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
                <Button size="sm" variant="secondary" onClick={goToday} disabled={inPeriod && selected === today} className="ml-1 sm:ml-auto">
                  Oggi
                </Button>
              </div>
            )}

            {view === "settimana" &&
              (isXl ? (
                <WeekGrid days={weekDays} byDay={byDay} done={done} today={today} selected={selected} examDay={examDay} onSelect={select} onToggle={toggle} />
              ) : (
                <WeekStrip days={weekDays} byDay={byDay} done={done} today={today} selected={selected} examDay={examDay} onSelect={select} />
              ))}

            {view === "mese" && (
              <MonthGrid days={monthDays} month={anchor.getMonth()} label={monthLabel} byDay={byDay} done={done} today={today} selected={selected} examDay={examDay} onSelect={select} />
            )}

            {view === "agenda" &&
              (agendaDays.length ? (
                <>
                  <Agenda days={agendaDays} byDay={byDay} done={done} today={today} tomorrow={tomorrow} onToggle={toggle} />
                  {futureDays.length > agendaDays.length && (
                    <Button variant="secondary" className="mt-5 w-full sm:w-auto" onClick={() => setAgendaCount((n) => n + AGENDA_STEP)}>
                      Mostra i 7 giorni successivi
                    </Button>
                  )}
                </>
              ) : (
                <EmptyState
                  title="Nessuna attività da oggi in poi"
                  description="Il piano non ha attività future. Crea un nuovo piano per il prossimo appello o ricalcolalo con le tue disponibilità."
                  action={
                    <Button variant="primary" onClick={() => setEditing(true)}>
                      Modifica il piano
                    </Button>
                  }
                />
              ))}

            {(view === "mese" || (view === "settimana" && isXl)) && <Legend className="mt-4" />}
          </TabPanel>
        </div>

        <aside
          className={cx(
            "grid content-start items-start gap-4 md:grid-cols-2",
            view === "settimana" ? "2xl:sticky 2xl:top-20 2xl:grid-cols-1" : "xl:sticky xl:top-20 xl:grid-cols-1",
          )}
          aria-label="Dettagli del piano"
        >
          {view !== "agenda" && <div className={cx("md:col-span-2", view === "settimana" ? "2xl:col-span-1" : "xl:col-span-1")}>{dayPanel}</div>}

          <section aria-labelledby="cal-exams" className="card p-4 sm:p-5">
            <h2 id="cal-exams" className="text-base font-semibold text-fg">
              Appelli ufficiali
            </h2>
            <dl className="mt-3 space-y-2.5">
              {EXAM_DATES.map((d) => (
                <div key={d.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <dt className={cx(dayKey(d.date) === examDay ? "font-medium text-fg" : "text-fg-muted")}>
                    {d.label}
                    {dayKey(d.date) === examDay && <span className="sr-only">, il tuo appello</span>}
                  </dt>
                  <dd className="text-right text-fg">
                    {capFirst(`${fmt.weekdayShort(d.date)} ${fmt.date(d.date)}`)}, ore 11
                  </dd>
                </div>
              ))}
            </dl>
            <a
              href={EXAM_DATES_SOURCE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-8 items-start gap-1.5 text-xs leading-relaxed text-azure-300 underline-offset-4 hover:text-azure-200 hover:underline"
            >
              Fonte: {EXAM_DATES_SOURCE.label.split(";")[0]}
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span className="sr-only">(si apre in una nuova scheda)</span>
            </a>
          </section>

          <section aria-labelledby="cal-res" className="card p-4 sm:p-5">
            <h2 id="cal-res" className="flex items-center gap-2 text-base font-semibold text-fg">
              <Telescope className="h-4 w-4 text-fg-subtle" aria-hidden /> Risorse nel piano
            </h2>
            {planned.length ? (
              <ul className="mt-2 divide-y divide-white/[0.05]">
                {planned.map((r) => (
                  <li key={r.resourceId} className="flex items-center gap-2 py-1.5">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate py-1.5 text-sm text-fg-muted hover:text-fg">
                      {r.title}
                      <span className="sr-only"> (si apre in una nuova scheda)</span>
                    </a>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        removeFromPlan(r.resourceId);
                        toast("Risorsa rimossa dal piano", { tone: "info" });
                      }}
                      aria-label={`Rimuovi dal piano: ${r.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Aggiungi videolezioni e corsi da{" "}
                <Link href="/risorse" className="text-azure-300 underline-offset-4 hover:underline">
                  Study Resources
                </Link>
                : li ritrovi qui.
              </p>
            )}
          </section>

          <div className={cx("md:col-span-2", view === "settimana" ? "2xl:col-span-1" : "xl:col-span-1")}>
            <p className="flex gap-2 px-1 text-xs leading-relaxed text-fg-subtle">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Le stime di tempo sono indicative. Una sessione svolta non equivale ad argomento appreso: conta la verifica con quiz e richiamo attivo.
            </p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setConfirm({ kind: "clear" })}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Elimina il piano
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmModals
        confirm={confirm}
        onClose={() => setConfirm(null)}
        plan={plan}
        done={done}
        today={today}
        onCommit={commit}
        onClear={() => {
          clearPlan();
          setConfirm(null);
          setFocusTick((n) => n + 1);
          toast("Piano eliminato", { tone: "info" });
        }}
      />
    </div>
  );
}

// ── Confirmations ─────────────────────────────────────────────

function ConfirmModals({
  confirm,
  onClose,
  plan,
  done,
  today,
  onCommit,
  onClear,
}: {
  confirm: Confirm | null;
  onClose: () => void;
  plan: { items: PlanItem[] } | null;
  done: Set<string>;
  today: string;
  onCommit: (config: PlanConfig, result: PlanResult, message: string) => void;
  onClear: () => void;
}) {
  const replacing = confirm && confirm.kind !== "clear" ? confirm : null;
  const before = (plan?.items ?? []).filter((i) => i.date >= (replacing?.config.startDate ?? today) && isCheckable(i));
  const after = replacing ? replacing.result.items.filter(isCheckable) : [];
  const cov = replacing ? coverage(replacing.result) : null;
  const kept = replacing && plan ? carryOverDone(plan.items, done, replacing.result.items, replacing.config.startDate).length + replacing.result.items.filter((i) => done.has(i.id)).length : 0;
  const pastCount = (plan?.items ?? []).filter((i) => i.date < (replacing?.config.startDate ?? today)).length;
  const all = (plan?.items ?? []).filter(isCheckable);
  const allDone = all.filter((i) => done.has(i.id)).length;
  const empty = replacing ? replacing.result.items.length === 0 : false;

  return (
    <>
      <Modal
        open={confirm?.kind === "clear"}
        onClose={onClose}
        size="sm"
        title="Eliminare il piano?"
        description="Verranno rimosse tutte le attività del calendario e le loro spunte. I progressi sugli argomenti, le flashcard e i quiz restano."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Annulla
            </Button>
            <Button variant="danger" onClick={onClear}>
              <Trash2 className="h-4 w-4" aria-hidden /> Elimina il piano
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">
          Il piano contiene {pluralize(all.length, "attività", "attività")}, di cui {allDone ? pluralize(allDone, "svolta", "svolte") : "nessuna svolta"}.
        </p>
      </Modal>

      <Modal
        open={!!replacing}
        onClose={onClose}
        size="sm"
        title={replacing?.kind === "recalc" ? "Ricalcolare il piano da oggi?" : "Sostituire il piano attuale?"}
        description={
          replacing?.kind === "recalc"
            ? "Le attività da oggi all’esame vengono ridistribuite in base allo stato attuale di ogni argomento."
            : "Le attività da oggi in poi vengono sostituite da quelle del nuovo piano."
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Annulla
            </Button>
            <Button
              variant="primary"
              disabled={empty}
              onClick={() => replacing && onCommit(replacing.config, replacing.result, replacing.kind === "recalc" ? "Piano ricalcolato" : "Piano salvato")}
            >
              {replacing?.kind === "recalc" ? (
                <>
                  <RefreshCw className="h-4 w-4" aria-hidden /> Ricalcola
                </>
              ) : (
                "Salva il nuovo piano"
              )}
            </Button>
          </div>
        }
      >
        {replacing &&
          (empty ? (
            <Notice tone="warning">{replacing.result.warnings[0] ?? "Non ci sono giorni utili prima dell’esame."}</Notice>
          ) : (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <caption className="sr-only">Confronto tra il piano attuale e quello nuovo, da oggi all’esame</caption>
                <thead>
                  <tr className="text-left text-xs text-fg-subtle">
                    <th scope="col" className="pb-2 font-normal">
                      Da oggi all’esame
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      Ora
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      Dopo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-fg-muted">
                      Attività
                    </th>
                    <td className="py-2 text-right tabular-nums text-fg-muted">{before.length}</td>
                    <td className="py-2 text-right font-medium tabular-nums text-fg">{after.length}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-fg-muted">
                      Ore di studio
                    </th>
                    <td className="py-2 text-right tabular-nums text-fg-muted">{fmt.hours(before.reduce((a, i) => a + i.minutes, 0))}</td>
                    <td className="py-2 text-right font-medium tabular-nums text-fg">{fmt.hours(after.reduce((a, i) => a + i.minutes, 0))}</td>
                  </tr>
                </tbody>
              </table>
              {cov && (
                <div>
                  <p className="text-sm text-fg-muted">
                    <span className="font-medium text-fg">
                      {cov.scheduled} argomenti su {cov.total}
                    </span>{" "}
                    da studiare o recuperare entrano nel nuovo piano.
                  </p>
                  <ProgressBar
                    value={cov.total ? cov.scheduled / cov.total : 1}
                    tone={cov.scheduled < cov.total ? "warning" : "success"}
                    className="mt-2"
                    label={`Argomenti pianificati: ${cov.scheduled} su ${cov.total}`}
                  />
                </div>
              )}
              <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted marker:text-fg-subtle">
                {pastCount > 0 && <li>Le {pluralize(pastCount, "attività", "attività")} dei giorni passati restano com’erano.</li>}
                {kept > 0 && <li>{pluralize(kept, "spunta", "spunte")} di attività future {kept === 1 ? "resta" : "restano"} sulle stesse attività.</li>}
              </ul>
              {replacing.result.warnings.length > 0 && <Notice tone="warning">{replacing.result.warnings.join(" ")}</Notice>}
            </div>
          ))}
      </Modal>
    </>
  );
}
