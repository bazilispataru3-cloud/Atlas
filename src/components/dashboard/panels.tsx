"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, ExternalLink, Flame, GraduationCap, Library, Telescope, Timer, XCircle } from "lucide-react";
import { Button, ProgressRing, SectionTitle } from "@/components/ui/primitives";
import { StackedBars, Legend, type Series } from "@/components/ui/charts";
import { STATUS_FILL } from "@/components/ui/status";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { SUBJECT_ICON } from "@/components/study/start-study-modal";
import { SUBJECTS } from "@/data/syllabus";
import { EXAM_DATES, EXAM_DATES_SOURCE, EXAM_RULES } from "@/data/exam";
import { STATUS_LABEL, type TopicStatus } from "@/lib/progress";
import type { TopicState } from "@/lib/hooks";
import type { QuizResult } from "@/lib/store";
import type { SubjectId } from "@/lib/types";
import { suggestionHref, type Suggestion } from "@/lib/insights";
import { capFirst, cn, daysBetween, fmt } from "@/lib/utils";
import { MINUTE_TICKS, shortMinutes, suggestionVisual } from "./format";

const LINK = "inline-flex min-h-10 items-center gap-1 rounded-lg text-sm font-medium text-azure-300 transition-colors hover:text-azure-200";
/** Same link in a section header: pulled up so its text sits on the title's line while keeping a 40px target. */
const HEAD_LINK = `${LINK} -mr-1 -mt-2.5 px-1`;

// ── Subjects: one compact row each ────────────────────────────

const STATUS_ORDER: TopicStatus[] = ["consolidato", "da-consolidare", "in-corso", "nuovo"];

export function SubjectsPanel({ states, mastery }: { states: TopicState[]; mastery: { total: number; bySubject: Record<SubjectId, number> } }) {
  const counts = STATUS_ORDER.map((st) => ({ st, n: states.filter((s) => s.status === st).length }));
  return (
    <section aria-labelledby="materie-titolo" className="card p-5 sm:p-6">
      <SectionTitle
        id="materie-titolo"
        title="Le tue materie"
        description={`Padronanza del programma: ${fmt.percent(mastery.total)}, pesata sui CFU.`}
        action={
          <Link href="/materie" className={HEAD_LINK}>
            Tutte le materie
          </Link>
        }
      />
      <ul className="divide-y divide-white/[0.06]">
        {SUBJECTS.map((s) => {
          const list = states.filter((x) => x.ref.subject.id === s.id);
          const started = list.filter((x) => x.status !== "nuovo").length;
          const next = list.find((x) => x.status === "da-consolidare") ?? list.find((x) => x.status === "in-corso") ?? list.find((x) => x.status === "nuovo");
          const tone = TONE[SUBJECT_TONE[s.id]];
          const Icon = SUBJECT_ICON[s.id];
          const byStatus = STATUS_ORDER.map((st) => ({ st, n: list.filter((x) => x.status === st).length })).filter((x) => x.n > 0);
          return (
            <li key={s.id} className="flex gap-3 py-4 first:pt-1 last:pb-1 sm:gap-4">
              <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg", tone.bg, tone.text)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/materie/${s.id}`} className="min-w-0 rounded text-base font-medium leading-snug text-fg underline-offset-4 hover:underline">
                    {s.name}
                  </Link>
                  <p className="shrink-0 text-sm text-fg-muted">
                    <span className="text-lg font-semibold tracking-[-0.01em] text-fg">{fmt.percent(mastery.bySubject[s.id])}</span>
                    <span className="sr-only sm:not-sr-only"> padronanza</span>
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {s.cfu} CFU, {started} di {list.length} argomenti avviati
                </p>
                <div className="mt-3 flex h-1.5 gap-[2px]" aria-hidden>
                  {list.map((x) => (
                    <span key={x.ref.topic.id} className={cn("h-full min-w-0 flex-1 rounded-full", STATUS_FILL[x.status])} />
                  ))}
                </div>
                <p className="sr-only">Stato degli argomenti: {byStatus.map((x) => `${x.n} ${STATUS_LABEL[x.st].toLowerCase()}`).join(", ")}.</p>
                {next && (
                  <Link
                    href={`/materie/${s.id}/${next.ref.topic.id}`}
                    className="group -mx-2 mt-2 flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.04]"
                  >
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="text-fg-muted">Prossimo argomento: </span>
                      <span className="text-fg">{next.ref.topic.title}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 border-t border-white/[0.06] pt-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-muted" aria-label="Argomenti per stato, in tutto il programma">
          {counts.map(({ st, n }) => (
            <li key={st} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-white/10", STATUS_FILL[st])} aria-hidden />
              {STATUS_LABEL[st]}
              <span className="font-semibold text-fg">{n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 max-w-[65ch] text-xs leading-relaxed text-fg-subtle">Un argomento diventa consolidato solo con quiz almeno all’80% e richiami riusciti: leggere non basta.</p>
      </div>
    </section>
  );
}

// ── Progress: today vs goal, streak, last 7 days ──────────────

const SERIES: Series[] = [
  { key: "biologia", label: "Biologia", color: TONE.bio.hex },
  { key: "chimica", label: "Chimica", color: TONE.chem.hex },
  { key: "fisica", label: "Fisica", color: TONE.phys.hex },
];

export function ProgressPanel({
  today,
  goal,
  streakDays,
  week,
  weekly,
}: {
  today: number;
  goal: number;
  streakDays: number;
  week: number;
  weekly: { day: Date; values: Record<SubjectId, number>; isToday: boolean }[];
}) {
  const reached = goal > 0 && today >= goal;
  return (
    <section aria-labelledby="progressi-titolo" className="card p-5 sm:p-6">
      <h2 id="progressi-titolo" className="text-base font-semibold tracking-[-0.005em] text-fg">
        I tuoi progressi
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <ProgressRing value={goal ? today / goal : 0} size={48} stroke={5} label={`${fmt.minutes(today)} di studio oggi su un obiettivo di ${fmt.minutes(goal)}`} />
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-2xl">{fmt.minutes(today)}</p>
            <p className="flex items-center gap-1 text-sm leading-snug text-fg-muted">
              {reached && <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />}
              {reached ? "obiettivo raggiunto" : `oggi, su ${fmt.minutes(goal)}`}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full border", streakDays > 0 ? "border-azure-400/30 bg-azure-500/[0.08]" : "border-white/[0.08]")} aria-hidden>
            <Flame className={cn("h-5 w-5", streakDays > 0 ? "text-azure-300" : "text-fg-subtle")} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-2xl">{streakDays}</p>
            <p className="text-sm leading-snug text-fg-muted">{streakDays === 1 ? "giorno di fila" : "giorni di fila"}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 max-w-[65ch] text-xs leading-relaxed text-fg-subtle">La serie conta i giorni consecutivi con almeno 10 minuti di studio.</p>

      <div className="mt-5 border-t border-white/[0.06] pt-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h3 className="text-sm text-fg-muted">
            Ultimi 7 giorni: <span className="font-semibold text-fg">{fmt.minutes(week)}</span>
          </h3>
          {week > 0 && <Legend series={SERIES} />}
        </div>
        {week > 0 ? (
          // overflow-x-clip: keeps the chart's screen-reader table (wider than a phone) from widening the page.
          <div className="-mx-2 overflow-x-clip px-2 py-1">
            <StackedBars
              ariaLabel="Minuti di studio per giorno e per materia, ultimi 7 giorni"
              format={shortMinutes}
              tickSteps={MINUTE_TICKS}
              series={SERIES}
              emptyLabel="La tua prima sessione apparirà qui"
              data={weekly.map((d) => ({ label: fmt.weekdayShort(d.day), sublabel: capFirst(`${fmt.weekday(d.day)} ${fmt.date(d.day)}`), values: d.values, highlight: d.isToday }))}
            />
          </div>
        ) : (
          <div className="inset-panel flex items-start gap-3 px-4 py-4">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <p className="max-w-[60ch] text-sm leading-relaxed text-fg-muted">
              Nessuna sessione negli ultimi 7 giorni. Qui vedrai i minuti di studio di ogni giorno, divisi per materia, appena completi una sessione.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Exams: dates and countdown ────────────────────────────────

export function ExamsPanel({ now, target }: { now: Date; target: string }) {
  return (
    <section aria-labelledby="esami-titolo" className="card p-5">
      <SectionTitle id="esami-titolo" title="Date d’esame" icon={<CalendarDays className="h-4 w-4" />} className="mb-3" />
      <ul className="space-y-1.5">
        {EXAM_DATES.map((e) => {
          const d = daysBetween(now, e.date);
          const mine = e.id === target;
          const [day, month] = fmt.dateShort(e.date).split(" ");
          return (
            <li key={e.id} className={cn("flex items-center gap-3 rounded-control px-3 py-3", mine ? "bg-azure-500/[0.07] ring-1 ring-inset ring-azure-400/25" : "bg-white/[0.02]")}>
              <div className="w-10 shrink-0 text-center" aria-hidden>
                <div className="text-xs text-fg-subtle">{month}</div>
                <div className="text-xl font-semibold leading-tight text-fg">{day}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-fg">{e.label}</div>
                <div className="text-xs leading-relaxed text-fg-muted">
                  {capFirst(fmt.weekday(e.date))} {fmt.date(e.date)}, tre prove dalle 11:00
                </div>
                <div className="text-xs leading-relaxed text-fg-subtle">
                  {mine && <span className="font-medium text-azure-300">Il tuo appello. </span>}
                  Esiti il {fmt.date(e.results)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {d > 0 ? (
                  <>
                    <div className="text-xl font-semibold leading-tight text-fg">{d}</div>
                    <div className="text-xs text-fg-subtle">{d === 1 ? "giorno" : "giorni"}</div>
                  </>
                ) : (
                  <div className="text-xs text-fg-subtle">{d === 0 ? "Oggi" : "Svolto"}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <a href={EXAM_DATES_SOURCE.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-xs text-fg-subtle transition-colors hover:text-fg-muted">
        Fonte: D.D. MUR n. 249/2026, verificata il {fmt.date(EXAM_DATES_SOURCE.verifiedOn)}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="sr-only">(si apre in una nuova scheda)</span>
      </a>
    </section>
  );
}

// ── Next steps: the remaining suggestions ─────────────────────

export function NextStepsPanel({ tips, className }: { tips: Suggestion[]; className?: string }) {
  if (!tips.length) return null;
  return (
    <section aria-labelledby="poi-titolo" className={cn("card p-5", className)}>
      <SectionTitle id="poi-titolo" title="Dopo, se hai tempo" description="Calcolati dai tuoi risultati e dalle scadenze." className="mb-2" />
      <ul className="-mx-2">
        {tips.map((t) => {
          const { Icon, color } = suggestionVisual(t);
          return (
            <li key={t.id}>
              <Link href={suggestionHref(t)} className="group flex gap-3 rounded-control px-2 py-3 transition-colors duration-150 hover:bg-white/[0.04]">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04]" aria-hidden>
                  <Icon className={cn("h-4 w-4", color)} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug text-fg">{t.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-fg-muted">{t.reason}</span>
                  <span className="mt-1 block text-xs text-fg-subtle">
                    {t.cta}, circa {fmt.minutes(t.minutes)}
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Last simulations ──────────────────────────────────────────

export function SimulationsPanel({ sims }: { sims: QuizResult[] }) {
  return (
    <section aria-labelledby="simulazioni-titolo" className="card p-5">
      <SectionTitle
        id="simulazioni-titolo"
        title="Ultime simulazioni"
        icon={<Timer className="h-4 w-4" />}
        className="mb-3"
        action={
          sims.length ? (
            <Link href="/quiz/simulazione" className={HEAD_LINK}>
              Nuova simulazione
            </Link>
          ) : undefined
        }
      />
      {sims.length ? (
        <ul className="divide-y divide-white/[0.06]">
          {sims.map((r) => {
            const passed = r.score >= EXAM_RULES.passThreshold;
            const subject = r.subject ? SUBJECTS.find((s) => s.id === r.subject)?.name : undefined;
            return (
              <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-fg">{subject ?? r.title.replace(" · ", ", ")}</div>
                  <div className="text-xs leading-relaxed text-fg-muted">
                    {capFirst(fmt.date(r.date))}: {r.correct} corrette, {r.wrong} errate, {r.blank} omesse
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-base font-semibold text-fg">{fmt.number(r.score)}</div>
                  <div className={cn("flex items-center justify-end gap-1 text-xs", passed ? "text-green-300" : "text-red-300")}>
                    {passed ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <XCircle className="h-3.5 w-3.5" aria-hidden />}
                    {passed ? "superata" : "sotto 18"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div>
          <p className="max-w-[46ch] text-sm leading-relaxed text-fg-muted">
            Non hai ancora fatto simulazioni. Il formato segue il D.M. 941/2026: {EXAM_RULES.questionsPerExam} quesiti in {EXAM_RULES.minutesPerExam} minuti per materia.
          </p>
          <Button variant="secondary" href="/quiz/simulazione" className="mt-4">
            <Timer className="h-4 w-4" aria-hidden />
            Prova una simulazione
          </Button>
        </div>
      )}
    </section>
  );
}

// ── Quick access: a discreet row of links ─────────────────────

const QUICK = [
  { href: "/quiz/simulazione", label: "Simulazione d’esame", Icon: Timer },
  { href: "/biblioteca", label: "Biblioteca", Icon: Library },
  { href: "/risorse", label: "Risorse", Icon: Telescope },
  { href: "/academy", label: "Study Academy", Icon: GraduationCap },
];

export function QuickLinks() {
  return (
    <nav aria-labelledby="accessi-titolo" className="border-t border-white/[0.06] pt-5">
      <h2 id="accessi-titolo" className="text-sm text-fg-subtle">
        Accessi rapidi
      </h2>
      <ul className="mt-1 grid grid-cols-2 gap-x-4 sm:flex sm:flex-wrap sm:gap-x-8">
        {QUICK.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link href={href} className="group inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-fg-muted transition-colors duration-150 hover:text-fg">
              <Icon className="h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-azure-300" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
