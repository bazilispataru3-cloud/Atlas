"use client";

import { forwardRef } from "react";
import { clsx } from "clsx";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Meridian, ProgressBar } from "@/components/ui/primitives";
import { TONE } from "@/components/ui/tone";
import type { PlanItem } from "@/lib/planner";
import { capFirst, dayKey, daysBetween, fmt, pluralize } from "@/lib/utils";
import { ItemRow, KIND_ICON, LEGEND, WeekItem, dayName, daySummary, isCheckable, kindTone, visibleItems } from "./plan-ui";

// `clsx` rather than `cn`: tailwind-merge would drop the custom `text-ui` size next to a colour.
const cx = clsx;

export type DayMap = Map<string, PlanItem[]>;

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

interface DayProps {
  byDay: DayMap;
  done: Set<string>;
  today: string;
  selected: string;
  examDay: string;
  onSelect: (key: string) => void;
}

/** Screen-reader name of a day cell: "Martedì 20 ottobre 2026, oggi: 4 attività, 2 h 25 min". */
function dayAria(key: string, list: PlanItem[], today: string, done: Set<string>) {
  const work = list.filter(isCheckable);
  const allDone = work.length > 0 && work.every((i) => done.has(i.id));
  return `${capFirst(fmt.full(key))}${key === today ? ", oggi" : ""}: ${daySummary(list)}${allDone ? ", tutto svolto" : ""}`;
}

/** Kinds of the day as tiny dots (decorative: the day's name and the list below carry the meaning). */
function Dots({ list, done, className }: { list: PlanItem[]; done: Set<string>; className?: string }) {
  const work = list.filter(isCheckable);
  if (work.length && work.every((i) => done.has(i.id))) return <Check className={cx("h-3 w-3 text-success", className)} strokeWidth={3} aria-hidden />;
  const shown = list.slice(0, 3);
  if (!shown.length) return <span className={cx("h-1.5", className)} aria-hidden />;
  return (
    <span className={cx("flex items-center gap-[3px]", className)} aria-hidden>
      {shown.map((it) => (
        <span key={it.id} className={cx("h-1.5 w-1.5 rounded-full", TONE[kindTone(it.kind)].dot)} />
      ))}
    </span>
  );
}

/** A thin bar split by kind, proportional to the minutes of each activity. */
function KindBar({ list, className }: { list: PlanItem[]; className?: string }) {
  const total = list.reduce((a, i) => a + Math.max(10, i.minutes), 0);
  return (
    <span className={cx("flex h-1 w-full gap-px overflow-hidden rounded-full", className)} aria-hidden>
      {list.map((it) => (
        <span key={it.id} className="h-full" style={{ width: `${(Math.max(10, it.minutes) / total) * 100}%`, background: TONE[kindTone(it.kind)].hex }} />
      ))}
    </span>
  );
}

// ── Week ──────────────────────────────────────────────────────

/** From xl: seven columns with the activities of each day (narrower columns would cut the titles). */
export function WeekGrid({ days, byDay, done, today, selected, examDay, onSelect, onToggle }: DayProps & { days: Date[]; onToggle: (it: PlanItem) => void }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="Giorni della settimana">
      {days.map((d) => {
        const k = dayKey(d);
        const list = visibleItems(byDay.get(k) ?? []);
        const isToday = k === today;
        const isSel = k === selected;
        const isExam = k === examDay;
        return (
          <li
            key={k}
            className={cx(
              "flex min-h-[16rem] flex-col rounded-card border p-1.5 transition-colors duration-150",
              isSel ? "border-azure-400/45 bg-azure-500/[0.045]" : isExam ? "border-danger/40 bg-white/[0.015]" : "border-white/[0.06] bg-white/[0.015]",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(k)}
              aria-pressed={isSel}
              aria-current={isToday ? "date" : undefined}
              aria-label={dayAria(k, list, today, done)}
              className="mb-1.5 flex w-full items-center justify-between gap-1 rounded-lg px-1.5 py-1 text-left transition-colors duration-150 hover:bg-white/[0.05]"
            >
              <span className={cx("text-xs", isToday ? "font-medium text-azure-300" : "text-fg-muted")}>{isToday ? "Oggi" : WEEKDAYS[(d.getDay() + 6) % 7]}</span>
              <span className={cx("grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-sm font-semibold tabular-nums", isToday ? "bg-azure-500 text-white" : "text-fg")}>{d.getDate()}</span>
            </button>
            {list.length > 0 && (
              <ul className="space-y-1">
                {list.map((it) => (
                  <WeekItem key={it.id} it={it} done={done.has(it.id)} onToggle={() => onToggle(it)} />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Below xl (phones, tablets, small laptops): a strip of seven days to pick from; the chosen day is listed right below. */
export function WeekStrip({ days, byDay, done, today, selected, onSelect }: DayProps & { days: Date[] }) {
  return (
    <div role="group" aria-label="Giorni della settimana" className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const k = dayKey(d);
        const list = visibleItems(byDay.get(k) ?? []);
        const isToday = k === today;
        const isSel = k === selected;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            aria-pressed={isSel}
            aria-current={isToday ? "date" : undefined}
            aria-label={dayAria(k, list, today, done)}
            className={cx(
              "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-control border transition-colors duration-150",
              isSel ? "border-azure-400/55 bg-azure-500/[0.1]" : "border-white/[0.06] bg-white/[0.02] active:bg-white/[0.06]",
            )}
          >
            <span className={cx("text-xs", isToday ? "font-medium text-azure-300" : "text-fg-muted")}>{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
            <span className={cx("grid h-7 min-w-7 place-items-center rounded-full px-1 text-sm font-semibold tabular-nums", isToday ? "bg-azure-500 text-white" : "text-fg")}>{d.getDate()}</span>
            <Dots list={list} done={done} />
            <StripMinutes list={list} />
          </button>
        );
      })}
    </div>
  );
}

/** From `sm` the strip has room for the day's study time. */
function StripMinutes({ list }: { list: PlanItem[] }) {
  const work = list.filter(isCheckable);
  if (!work.length) return null;
  return <span className="hidden text-xs tabular-nums text-fg-subtle sm:block">{fmt.minutes(work.reduce((a, i) => a + i.minutes, 0))}</span>;
}

// ── Month ─────────────────────────────────────────────────────

export function MonthGrid({ days, month, label, byDay, done, today, selected, examDay, onSelect }: DayProps & { days: Date[]; month: number; label: string }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-1.5" aria-hidden>
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-xs text-fg-subtle">
            {w}
          </span>
        ))}
      </div>
      <div role="group" aria-label={label} className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = dayKey(d);
          const list = visibleItems(byDay.get(k) ?? []);
          const work = list.filter(isCheckable);
          const minutes = work.reduce((a, i) => a + i.minutes, 0);
          const allDone = work.length > 0 && work.every((i) => done.has(i.id));
          const inMonth = d.getMonth() === month;
          const isToday = k === today;
          const isSel = k === selected;
          const isExam = k === examDay;
          const isRest = list.length > 0 && list.every((i) => i.kind === "riposo");
          return (
            <button
              key={k}
              type="button"
              onClick={() => onSelect(k)}
              aria-pressed={isSel}
              aria-current={isToday ? "date" : undefined}
              aria-label={dayAria(k, list, today, done)}
              className={cx(
                "flex min-h-[3.25rem] flex-col items-start gap-1 rounded-control border p-1 text-left transition-colors duration-150 sm:min-h-[5.25rem] sm:p-1.5",
                isSel
                  ? "border-azure-400/55 bg-azure-500/[0.08]"
                  : isExam
                    ? "border-danger/45 bg-danger/[0.06]"
                    : "border-white/[0.05] hover:border-white/[0.14] hover:bg-white/[0.02]",
              )}
            >
              <span
                className={cx(
                  "grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold tabular-nums sm:text-sm",
                  isToday ? "bg-azure-500 text-white" : inMonth ? "text-fg" : "text-fg-subtle",
                )}
              >
                {d.getDate()}
              </span>
              {isExam ? (
                <span className="mt-auto hidden text-xs font-medium text-red-300 sm:block">Esame</span>
              ) : isRest ? (
                <span className="mt-auto hidden text-xs text-fg-subtle sm:block">Riposo</span>
              ) : work.length > 0 ? (
                <>
                  <span className={cx("mt-auto hidden items-center gap-1 text-xs sm:flex", allDone ? "text-green-300" : "text-fg-subtle")}>
                    {allDone && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                    {allDone ? "Svolto" : fmt.minutes(minutes)}
                  </span>
                  <KindBar list={work} className={cx("hidden sm:flex", !inMonth && "opacity-50")} />
                  <Dots list={work} done={done} className="mt-auto sm:hidden" />
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Legend({ className }: { className?: string }) {
  return (
    <ul className={cx("flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg-muted", className)} aria-label="Tipi di attività">
      {LEGEND.map((l) => {
        const Icon = KIND_ICON[l.kind];
        return (
          <li key={l.label} className="inline-flex items-center gap-1.5">
            <span className={cx("h-2 w-2 rounded-full", TONE[kindTone(l.kind)].dot)} aria-hidden />
            <Icon className={cx("h-3.5 w-3.5", TONE[kindTone(l.kind)].text)} aria-hidden />
            {l.label}
          </li>
        );
      })}
    </ul>
  );
}

// ── Day detail ────────────────────────────────────────────────

/** The chosen day: summary, progress and the full list with what to do. */
export const DayPanel = forwardRef<
  HTMLElement,
  { day: string; today: string; tomorrow: string; list: PlanItem[]; done: Set<string>; onToggle: (it: PlanItem) => void; onStep: (dir: -1 | 1) => void }
>(function DayPanel({ day, today, tomorrow, list, done, onToggle, onStep }, ref) {
  const work = list.filter(isCheckable);
  const doneCount = work.filter((i) => done.has(i.id)).length;
  const nextId = day === today ? work.find((i) => !done.has(i.id))?.id : undefined;
  const relative = day === today || day === tomorrow;
  return (
    <section ref={ref} aria-labelledby="cal-day-title" className="card scroll-mt-20 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pt-1">
          <h2 id="cal-day-title" className="text-base font-semibold text-fg">
            {dayName(day, today, tomorrow)}
          </h2>
          <p className="mt-0.5 text-ui text-fg-muted">
            {relative && `${capFirst(`${fmt.weekday(day)} ${fmt.date(day)}`)}, `}
            {relative ? daySummary(list).toLowerCase() : daySummary(list)}
          </p>
        </div>
        <div className="-mr-2 flex shrink-0">
          <Button size="icon" variant="ghost" onClick={() => onStep(-1)} aria-label="Giorno precedente">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onStep(1)} aria-label="Giorno successivo">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
      {work.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={doneCount / work.length} size="sm" tone={doneCount === work.length ? "success" : "azure"} label={`Attività svolte: ${doneCount} su ${work.length}`} />
          <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
            {doneCount} di {work.length}
          </span>
        </div>
      )}
      {list.length ? (
        <ul className="mt-2 divide-y divide-white/[0.05]">
          {list.map((it) => (
            <ItemRow key={it.id} it={it} done={done.has(it.id)} onToggle={() => onToggle(it)} detail primary={it.id === nextId} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-fg-muted">Nessuna attività in questo giorno.</p>
      )}
    </section>
  );
});

// ── Agenda ────────────────────────────────────────────────────

export function Agenda({
  days,
  byDay,
  done,
  today,
  tomorrow,
  onToggle,
}: {
  days: string[];
  byDay: DayMap;
  done: Set<string>;
  today: string;
  tomorrow: string;
  onToggle: (it: PlanItem) => void;
}) {
  return (
    <div className="space-y-4">
      {days.map((k) => {
        const list = visibleItems(byDay.get(k) ?? []);
        const isToday = k === today;
        const nextId = isToday ? list.filter(isCheckable).find((i) => !done.has(i.id))?.id : undefined;
        return (
          <section key={k} aria-labelledby={`ag-${k}`} className={cx(isToday ? "card p-4 sm:p-5" : "px-1")}>
            <div className={cx("flex items-baseline justify-between gap-3", !isToday && "border-b border-white/[0.06] pb-2")}>
              <h3 id={`ag-${k}`} className={cx("text-sm font-semibold", isToday ? "text-azure-200" : "text-fg")}>
                {dayName(k, today, tomorrow)}
                {(isToday || k === tomorrow) && <span className="font-normal text-fg-muted">, {fmt.date(k)}</span>}
              </h3>
              <span className="shrink-0 text-xs text-fg-subtle">{daySummary(list)}</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {list.map((it) => (
                <ItemRow key={it.id} it={it} done={done.has(it.id)} onToggle={() => onToggle(it)} detail={isToday} primary={it.id === nextId} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ── The route to the exam (the page's one luminous element) ───

export function PlanRoute({
  startKey,
  examKey,
  today,
  examLabel,
  doneCount,
  total,
  late,
  plannedMinutes,
}: {
  startKey: string;
  examKey: string;
  today: string;
  examLabel: string;
  doneCount: number;
  total: number;
  late: number;
  plannedMinutes: number;
}) {
  const span = Math.max(1, daysBetween(startKey, examKey));
  const elapsed = Math.max(0, Math.min(span, daysBetween(startKey, today)));
  const daysLeft = Math.max(0, daysBetween(today, examKey));
  const value = elapsed / span;
  return (
    <section aria-labelledby="cal-route-title" className="card mt-8 p-5 sm:p-6">
      <h2 id="cal-route-title" className="sr-only">
        Percorso fino all’esame
      </h2>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2.5">
            <span className="font-display text-5xl leading-none tracking-[-0.02em] text-fg tabular-nums">{daysLeft}</span>
            <span className="text-base text-fg-muted">{daysLeft === 1 ? "giorno all’esame" : "giorni all’esame"}</span>
          </p>
          <p className="mt-2 text-sm text-fg-subtle">{examLabel}</p>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1 sm:gap-x-8">
          <RouteStat label="Svolte" value={`${doneCount} di ${total}`} />
          <RouteStat label="In ritardo" value={String(late)} tone={late > 0 ? "text-orange-300" : undefined} />
          <RouteStat label="Ore nel piano" value={`${fmt.hours(plannedMinutes)} h`} />
        </dl>
      </div>
      <div className="relative mt-6">
        <Meridian value={value} label={`Percorso del piano: ${pluralize(Math.round(elapsed), "giorno trascorso", "giorni trascorsi")} su ${Math.round(span)}`} />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-azure-300 bg-ink-900"
          style={{ left: `${value * 100}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-2.5 flex justify-between gap-4 text-xs text-fg-subtle">
        <span>Inizio, {fmt.date(startKey)}</span>
        <span>Esame, {fmt.date(examKey)}</span>
      </div>
    </section>
  );
}

function RouteStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className={cx("mt-0.5 text-lg font-semibold tabular-nums tracking-[-0.01em] whitespace-nowrap", tone ?? "text-fg")}>{value}</dd>
    </div>
  );
}
