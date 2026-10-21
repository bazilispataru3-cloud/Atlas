"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAtlas } from "@/lib/store";
import { useDueCards, useHydrated, useNow, useTopicStates } from "@/lib/hooks";
import { Notice, Skeleton } from "@/components/ui/primitives";
import { getTopicRef } from "@/data/syllabus";
import { EXAM_DATES } from "@/data/exam";
import { minutesOn, minutesLast7Days, programMastery, streak, suggestions, weeklyBreakdown } from "@/lib/insights";
import { dayKey } from "@/lib/utils";
import { TodayBlock, type ResumeTarget } from "./today";
import { ExamsPanel, NextStepsPanel, ProgressPanel, QuickLinks, SimulationsPanel, SubjectsPanel } from "./panels";

/**
 * Home: what to study now (one click), today's plan along the meridian,
 * then subjects, progress, exams and the remaining suggestions.
 */
export function Dashboard() {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  const profile = useAtlas((s) => s.profile);
  const sessions = useAtlas((s) => s.sessions);
  const quizResults = useAtlas((s) => s.quizResults);
  const plan = useAtlas((s) => s.plan);
  const planDone = useAtlas((s) => s.planDone);
  const demo = useAtlas((s) => s.demo);
  const states = useTopicStates();
  const due = useDueCards();

  const exam = EXAM_DATES.find((e) => e.id === profile.examTarget) ?? EXAM_DATES[0];
  const tips = useMemo(
    () => (hydrated ? suggestions({ states, dueCards: due, sessions, quizResults, examDate: exam.date, now }) : []),
    [hydrated, states, due, sessions, quizResults, exam.date, now],
  );

  if (!hydrated) return <DashboardSkeleton />;

  const todayKey = dayKey(now);
  const todayAll = (plan?.items ?? []).filter((i) => i.date === todayKey);
  const todayPlan = todayAll.filter((i) => i.kind !== "pausa" && i.kind !== "riposo");
  const restDay = todayAll.some((i) => i.kind === "riposo");

  // "Riprendi": the last topic studied in a FAST / DEEP / ULTRA session, in the same mode.
  const resume = (() => {
    const last = [...sessions]
      .filter((s) => s.mode === "fast" || s.mode === "deep" || s.mode === "ultra")
      .sort((a, b) => b.start.localeCompare(a.start))[0];
    const ref = last ? getTopicRef(last.topicId) : undefined;
    if (!last || !ref) return undefined;
    const tip = tips[0];
    if (tip?.action?.topicId === ref.topic.id) return undefined; // the main button already opens it
    return { ref, mode: last.mode } as ResumeTarget;
  })();

  const sims = quizResults
    .filter((r) => r.kind === "simulazione")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      {demo && (
        <Notice
          tone="demo"
          className="items-center py-2"
          action={
            <Link href="/profilo#dati" className="inline-flex h-9 items-center rounded-control px-3 text-sm font-medium text-fg transition-colors hover:bg-white/[0.06]">
              Gestisci
            </Link>
          }
        >
          Stai usando dati dimostrativi.
        </Notice>
      )}

      <TodayBlock
        now={now}
        name={profile.name}
        tip={tips[0]}
        resume={resume}
        planItems={todayPlan}
        planDone={planDone}
        hasPlan={!!plan}
        restDay={restDay}
        firstTime={sessions.length === 0}
      />

      <div className="grid gap-5 sm:gap-6 xl:grid-cols-12 xl:gap-8">
        <div className="space-y-5 sm:space-y-6 xl:col-span-8 xl:space-y-8">
          <SubjectsPanel states={states} mastery={programMastery(states)} />
          <ProgressPanel
            today={minutesOn(sessions, now)}
            goal={profile.dailyGoalMinutes}
            streakDays={streak(sessions, now)}
            week={minutesLast7Days(sessions, now)}
            weekly={weeklyBreakdown(sessions, now)}
          />
        </div>
        {/* Below xl the two short panels share a row on tablets; the suggestions span it. */}
        <div className="flex flex-col gap-5 sm:gap-6 md:grid md:grid-cols-2 md:items-start xl:col-span-4 xl:flex xl:gap-8">
          <NextStepsPanel tips={tips.slice(1)} className="md:col-span-2" />
          <ExamsPanel now={now} target={profile.examTarget} />
          <SimulationsPanel sims={sims} />
        </div>
      </div>

      <QuickLinks />
    </div>
  );
}

/** Same frame as the real page, so nothing jumps when the saved data arrives. */
function DashboardSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8" role="status" aria-label="Caricamento della dashboard">
      <div className="card grid overflow-hidden rounded-panel xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="space-y-4 px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7 lg:px-10 lg:pb-10 lg:pt-9">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-3/4 max-w-sm lg:h-12" />
          <Skeleton className="mt-6 h-4 w-48" />
          <Skeleton className="h-7 w-full max-w-md" />
          <Skeleton className="h-12 w-full max-w-lg" />
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Skeleton className="h-12 w-full sm:w-52" />
            <Skeleton className="h-12 w-full sm:w-60" />
          </div>
        </div>
        <div className="space-y-4 border-t border-white/[0.07] px-5 py-6 sm:px-8 sm:py-7 xl:border-l xl:border-t-0 xl:py-9">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
      <div className="grid gap-5 sm:gap-6 xl:grid-cols-12 xl:gap-8">
        <div className="space-y-5 sm:space-y-6 xl:col-span-8 xl:space-y-8">
          <Skeleton className="h-[420px] w-full rounded-card" />
          <Skeleton className="h-[360px] w-full rounded-card" />
        </div>
        <div className="space-y-5 sm:space-y-6 xl:col-span-4 xl:space-y-8">
          <Skeleton className="h-[240px] w-full rounded-card" />
          <Skeleton className="h-[280px] w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
