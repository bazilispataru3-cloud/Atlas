"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Sparkles,
  Flame,
  Clock,
  GalleryVerticalEnd,
  Target,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Repeat,
  Trophy,
  ArrowUpRight,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { useAtlas } from "@/lib/store";
import { useDueCards, useHydrated, useNow, useTopicStates } from "@/lib/hooks";
import { useUI } from "@/lib/ui-store";
import { Badge, Button, Card, Notice, ProgressBar, ProgressRing, SectionTitle, Skeleton } from "@/components/ui/primitives";
import { StackedBars, Legend } from "@/components/ui/charts";
import { SUBJECTS } from "@/data/syllabus";
import { EXAM_DATES, EXAM_DATES_SOURCE, EXAM_RULES } from "@/data/exam";
import { getTopicRef } from "@/data/syllabus";
import { minutesOn, minutesLast7Days, programMastery, streak, suggestions, weeklyBreakdown, type Suggestion } from "@/lib/insights";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { SUBJECT_ICON } from "@/components/study/start-study-modal";
import { cn, daysBetween, dayKey, fmt, greeting } from "@/lib/utils";

const SERIES = [
  { key: "biologia", label: "Biologia", color: TONE.bio.hex },
  { key: "chimica", label: "Chimica", color: TONE.chem.hex },
  { key: "fisica", label: "Fisica", color: TONE.phys.hex },
];

export function Dashboard() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  const router = useRouter();
  const openStartStudy = useUI((s) => s.openStartStudy);
  const openProfessor = useUI((s) => s.openProfessor);
  const profile = useAtlas((s) => s.profile);
  const sessions = useAtlas((s) => s.sessions);
  const quizResults = useAtlas((s) => s.quizResults);
  const plan = useAtlas((s) => s.plan);
  const planDone = useAtlas((s) => s.planDone);
  const demo = useAtlas((s) => s.demo);
  const states = useTopicStates();
  const due = useDueCards();

  const exam = EXAM_DATES.find((e) => e.id === profile.examTarget) ?? EXAM_DATES[0];
  const daysLeft = daysBetween(now, exam.date);
  const today = minutesOn(sessions, now);
  const week = minutesLast7Days(sessions, now);
  const weekly = weeklyBreakdown(sessions, now);
  const mastery = programMastery(states);
  const consolidated = states.filter((s) => s.status === "consolidato");
  const toStudy = states.filter((s) => s.status === "nuovo");
  const inProgress = states.filter((s) => s.status === "in-corso" || s.status === "da-consolidare");
  const streakDays = streak(sessions, now);
  const sims = quizResults.filter((r) => r.kind === "simulazione").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const lastSession = [...sessions].sort((a, b) => b.start.localeCompare(a.start))[0];
  const lastTopic = lastSession ? getTopicRef(lastSession.topicId) : undefined;
  const todayPlan = (plan?.items ?? []).filter((i) => i.date === dayKey(now) && i.kind !== "pausa" && i.kind !== "riposo");
  const reviewsToday = todayPlan.filter((i) => i.kind === "ripasso").reduce((a, i) => a + i.topicIds.length, 0);

  const tips = useMemo(() => (hydrated ? suggestions({ states, dueCards: due, sessions, quizResults, examDate: exam.date, now }) : []), [hydrated, states, due, sessions, quizResults, exam.date, now]);

  const runSuggestion = (s: Suggestion) => {
    if (s.href) router.push(s.href);
    else if (s.action) router.push(`/studio/${s.action.topicId}?mode=${s.action.mode}`);
  };

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {demo && (
        <Notice tone="demo" title="Stai esplorando con dati dimostrativi" action={<Link href="/profilo#dati" className="text-[13px] text-fuchsia-200 underline-offset-4 hover:underline">Gestisci</Link>}>
          Progressi, sessioni e risultati sono generati per mostrare la dashboard. Rimuovili quando vuoi iniziare con i tuoi dati.
        </Notice>
      )}

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="card relative overflow-hidden p-6 sm:p-8 lg:col-span-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-azure-500/20 blur-3xl animate-float" />
          <div className="pointer-events-none absolute -bottom-32 right-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-subtle">
              <span className="capitalize">{fmt.full(now)}</span>
              <span className="text-white/15">•</span>
              <span>Semestre filtro {EXAM_RULES.academicYear}</span>
            </div>
            <h1 className="mt-4 font-display text-[2.6rem] leading-[1.02] tracking-tight text-fg sm:text-6xl">
              {greeting(now)}
              {profile.name ? (
                <>
                  , <span className="italic text-gradient-azure">{profile.name}</span>
                </>
              ) : null}
              .
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fg-muted">
              {daysLeft > 0 ? (
                <>
                  Mancano <span className="font-mono text-fg">{daysLeft}</span> giorni al {exam.label.toLowerCase()} ({fmt.date(exam.date)}, ore 11:00).{" "}
                </>
              ) : (
                <>Il {exam.label.toLowerCase()} è passato: controlla il calendario per il prossimo. </>
              )}
              {tips[0] ? <>Ti consiglio di partire da qui: <span className="text-fg">{tips[0].title.toLowerCase()}</span>.</> : "Scegli una materia e una modalità per iniziare."}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => openStartStudy()}
                className="group relative flex h-14 items-center gap-3 overflow-hidden rounded-2xl bg-azure-500 pl-5 pr-6 text-[15px] font-semibold tracking-wide text-white shadow-[0_0_0_1px_rgba(196,224,255,0.4)_inset,0_18px_40px_-12px_rgba(47,139,255,0.95)] transition hover:bg-azure-400"
              >
                <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.28)_50%,transparent_70%)] bg-[length:200%_100%] animate-shimmer" />
                <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-white/15">
                  <Play className="h-4 w-4 fill-current" />
                </span>
                <span className="relative">INIZIA A STUDIARE</span>
              </button>
              {lastTopic && (
                <Button variant="secondary" size="lg" href={`/studio/${lastTopic.topic.id}?mode=${lastSession?.mode === "fast" || lastSession?.mode === "ultra" ? lastSession.mode : "deep"}`}>
                  Riprendi: <span className="max-w-[16ch] truncate">{lastTopic.topic.title}</span>
                </Button>
              )}
              <Button variant="ghost" size="lg" onClick={() => openProfessor()}>
                <Sparkles className="h-4 w-4 text-azure-300" /> Chiedi al Professor
              </Button>
            </div>
          </div>
        </div>

        <div className="card flex flex-col p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-medium text-fg">Oggi</div>
            <Badge tone={streakDays > 0 ? "warning" : "muted"}>
              <Flame className="h-3 w-3" /> {streakDays} {streakDays === 1 ? "giorno" : "giorni"} di fila
            </Badge>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <ProgressRing value={today / profile.dailyGoalMinutes} size={118} stroke={10} label={`${Math.round(today)} minuti su ${profile.dailyGoalMinutes}`}>
              <div className="text-center">
                <div className="font-mono text-2xl font-medium text-fg tabular-nums">{fmt.hours(today)}</div>
                <div className="text-[11px] text-fg-subtle">ore oggi</div>
              </div>
            </ProgressRing>
            <div className="space-y-3 text-[13px]">
              <div>
                <div className="text-fg-subtle">Obiettivo</div>
                <div className="font-mono text-fg">{fmt.minutes(profile.dailyGoalMinutes)}</div>
              </div>
              <div>
                <div className="text-fg-subtle">Ultimi 7 giorni</div>
                <div className="font-mono text-fg">{fmt.hours(week)} h</div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-5">
            <div className="mb-2 flex items-center justify-between text-[12px] text-fg-subtle">
              <span>Piano di oggi</span>
              <Link href="/calendario" className="hover:text-fg-muted">
                Calendario →
              </Link>
            </div>
            {todayPlan.length ? (
              <ul className="space-y-1.5">
                {todayPlan.slice(0, 3).map((it) => (
                  <li key={it.id} className="flex items-center gap-2 text-[12.5px]">
                    {planDone.includes(it.id) ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <CircleDashed className="h-3.5 w-3.5 text-fg-subtle" />}
                    <span className={cn("truncate", planDone.includes(it.id) ? "text-fg-subtle line-through" : "text-fg-muted")}>{it.title}</span>
                    <span className="ml-auto font-mono text-[11px] text-fg-subtle">{it.minutes}′</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Link href="/calendario" className="block rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-[12.5px] text-fg-subtle hover:border-white/20 hover:text-fg-muted">
                Nessun piano attivo: genera un calendario realistico fino all’esame →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── KPI tiles ─────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Clock className="h-4 w-4" />} label="Ore oggi" value={fmt.hours(today)} hint={`obiettivo ${fmt.hours(profile.dailyGoalMinutes)} h`} />
        <Kpi icon={<CalendarDays className="h-4 w-4" />} label="Ore settimana" value={fmt.hours(week)} hint="ultimi 7 giorni" />
        <Kpi icon={<Target className="h-4 w-4" />} label="Programma" value={fmt.percent(mastery.total)} hint="pesata per CFU" accent />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Consolidati" value={`${consolidated.length}/${states.length}`} hint={`${toStudy.length} da iniziare`} />
        <Kpi icon={<GalleryVerticalEnd className="h-4 w-4" />} label="Flashcard in scadenza" value={String(due.length)} hint={<Link href="/flashcard/ripasso" className="hover:text-fg-muted">avvia ripasso →</Link>} />
        <Kpi icon={<Repeat className="h-4 w-4" />} label="Ripassi previsti" value={String(reviewsToday)} hint={plan ? "argomenti oggi" : "genera un piano"} />
      </section>

      {/* ── Subjects ─────────────────────────────────────── */}
      <section>
        <SectionTitle title="Le tue materie" action={<Link href="/materie" className="text-[13px] text-fg-subtle hover:text-fg">Tutte le materie →</Link>} />
        <div className="grid gap-4 md:grid-cols-3">
          {SUBJECTS.map((s) => {
            const list = states.filter((x) => x.ref.subject.id === s.id);
            const cons = list.filter((x) => x.status === "consolidato").length;
            const next = list.find((x) => x.status === "da-consolidare") ?? list.find((x) => x.status === "in-corso") ?? list.find((x) => x.status === "nuovo");
            const tone = SUBJECT_TONE[s.id];
            const Icon = SUBJECT_ICON[s.id];
            const studied = list.filter((x) => x.status !== "nuovo").length;
            return (
              <Card key={s.id} hover className="group p-5">
                <Link href={`/materie/${s.id}`} className="absolute inset-0 rounded-[inherit]" aria-label={`Apri ${s.name}`} />
                <div className="flex items-start justify-between">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-xl", TONE[tone].bg, TONE[tone].text)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-fg-subtle transition group-hover:text-fg" />
                </div>
                <div className="mt-4 text-[15px] font-semibold text-fg">{s.name}</div>
                <div className="mt-0.5 text-[12px] text-fg-subtle">
                  {s.cfu} CFU · {studied}/{list.length} argomenti avviati · {cons} consolidati
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-[12px] text-fg-subtle">Padronanza</span>
                  <span className="font-mono text-sm text-fg">{fmt.percent(mastery.bySubject[s.id])}</span>
                </div>
                <ProgressBar value={mastery.bySubject[s.id]} tone={tone} className="mt-1.5" label={`Padronanza ${s.name}`} />
                <div className="mt-3 flex gap-0.5" aria-hidden>
                  {list.map((x) => (
                    <span
                      key={x.ref.topic.id}
                      title={x.ref.topic.title}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        x.status === "consolidato" ? "bg-emerald-400/80" : x.status === "da-consolidare" ? "bg-amber-400/70" : x.status === "in-corso" ? "bg-azure-400/70" : "bg-white/[0.07]",
                      )}
                    />
                  ))}
                </div>
                {next && (
                  <div className="relative z-10 mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-fg-subtle">Prossimo</div>
                      <div className="truncate text-[13px] text-fg">{next.ref.topic.title}</div>
                    </div>
                    <button onClick={() => openStartStudy({ topicId: next.ref.topic.id })} className="shrink-0 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-fg hover:bg-white/10">
                      Studia
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Suggestions + chart / Exams + results ─────────── */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Suggerimenti per la prossima sessione" icon={<Lightbulb className="h-4 w-4" />} />
            {tips.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {tips.map((t) => (
                  <li key={t.id} className="flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[14px] font-medium leading-snug text-fg">{t.title}</div>
                      <Badge tone={t.tone}>{t.minutes}′</Badge>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-subtle">{t.reason}</p>
                    <button onClick={() => runSuggestion(t)} className={cn("mt-3 inline-flex items-center gap-1 self-start text-[13px] font-medium", TONE[t.tone].text)}>
                      {t.cta} <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-subtle">Inizia una sessione: i suggerimenti si basano sui tuoi risultati reali.</p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-fg">Ore di studio — ultimi 7 giorni</h2>
              <Legend series={SERIES} />
            </div>
            <StackedBars
              ariaLabel="Minuti di studio per giorno e per materia, ultimi 7 giorni"
              format={(v) => (v >= 60 ? `${fmt.number(v / 60)} h` : `${Math.round(v)}′`)}
              series={SERIES}
              data={weekly.map((d) => ({ label: fmt.weekdayShort(d.day), sublabel: fmt.full(d.day), values: d.values, highlight: d.isToday }))}
            />
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="p-5">
            <SectionTitle title="Calendario degli esami" icon={<CalendarDays className="h-4 w-4" />} />
            <ul className="space-y-2.5">
              {EXAM_DATES.map((e) => {
                const d = daysBetween(now, e.date);
                return (
                  <li key={e.id} className={cn("flex items-center gap-3 rounded-2xl border px-3 py-3", e.id === profile.examTarget ? "border-azure-400/30 bg-azure-500/[0.06]" : "border-white/[0.06]")}>
                    <div className="grid w-12 shrink-0 place-items-center rounded-xl bg-white/[0.04] py-1.5 text-center">
                      <div className="text-[10px] uppercase text-fg-subtle">{fmt.dateShort(e.date).split(" ")[1]}</div>
                      <div className="font-mono text-lg leading-none text-fg">{new Date(e.date).getDate()}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-fg">{e.label}</div>
                      <div className="truncate text-[11.5px] text-fg-subtle">3 prove · ore 11:00 · esiti {fmt.dateShort(e.results)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-fg">{Math.max(0, d)}</div>
                      <div className="text-[10.5px] text-fg-subtle">giorni</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <a href={EXAM_DATES_SOURCE.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle hover:text-fg-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Fonte: D.D. MUR n. 249/2026 · verificato il {fmt.dateShort(EXAM_DATES_SOURCE.verifiedOn)}
            </a>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Ultime simulazioni" icon={<Trophy className="h-4 w-4" />} action={<Link href="/quiz/simulazione" className="text-[12px] text-fg-subtle hover:text-fg">Nuova →</Link>} />
            {sims.length ? (
              <ul className="space-y-3">
                {sims.map((r) => {
                  const passed = r.score >= EXAM_RULES.passThreshold;
                  return (
                    <li key={r.id} className="flex items-center gap-3">
                      <div className={cn("h-9 w-1 rounded-full", passed ? "bg-emerald-400" : "bg-red-400")} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-fg">{r.title}</div>
                        <div className="text-[11.5px] text-fg-subtle">
                          {fmt.dateShort(r.date)} · {r.correct} corrette · {r.wrong} errate · {r.blank} omesse
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[15px] text-fg">{fmt.number(r.score)}</div>
                        <div className={cn("text-[10.5px]", passed ? "text-emerald-300" : "text-red-300")}>{passed ? "≥ 18 superata" : "< 18"}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-[13px] text-fg-subtle">Nessuna simulazione ancora. Il formato segue il D.M. 941/2026: 31 quesiti in 50 minuti.</p>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle title="Stato del programma" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatusCount label="Consolidati" value={consolidated.length} cls="text-emerald-300" />
              <StatusCount label="In studio" value={inProgress.length} cls="text-azure-300" />
              <StatusCount label="Da iniziare" value={toStudy.length} cls="text-fg-muted" />
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-fg-subtle">
              Un argomento diventa «consolidato» solo con risultati nei quiz ≥ 80% e richiami riusciti: leggere non basta.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("card p-4", accent && "border-azure-400/20")}>
      <div className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
        <span className={accent ? "text-azure-300" : "text-fg-subtle"}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-mono text-[1.65rem] font-medium leading-none tracking-tight text-fg tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 truncate text-[11.5px] text-fg-subtle">{hint}</div>}
    </div>
  );
}

function StatusCount({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] py-3">
      <div className={cn("font-mono text-xl", cls)}>{value}</div>
      <div className="mt-0.5 text-[11px] text-fg-subtle">{label}</div>
    </div>
  );
}
