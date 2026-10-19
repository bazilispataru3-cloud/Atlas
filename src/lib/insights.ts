// Derived analytics for the dashboard and suggestions. Pure functions over store data.

import type { StudySession, QuizResult, FlashCard } from "./store";
import type { SubjectId } from "./types";
import type { TopicState } from "./hooks";
import { addDays, dayKey, daysBetween, startOfDay, startOfWeek } from "./utils";
import { topicWeight } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";

export function minutesOn(sessions: StudySession[], day: Date): number {
  const key = dayKey(day);
  return sessions.filter((s) => dayKey(s.start) === key).reduce((a, s) => a + s.minutes, 0);
}

/** Minutes over the last 7 days, today included. */
export function minutesLast7Days(sessions: StudySession[], now = new Date()): number {
  const from = addDays(startOfDay(now), -6).getTime();
  return sessions.filter((s) => new Date(s.start).getTime() >= from).reduce((a, s) => a + s.minutes, 0);
}

/** Per-day, per-subject minutes for the last 7 days (oldest first). */
export function weeklyBreakdown(sessions: StudySession[], now = new Date()) {
  const start = addDays(startOfDay(now), -6);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    const key = dayKey(day);
    const values: Record<SubjectId, number> = { biologia: 0, chimica: 0, fisica: 0 };
    for (const s of sessions) if (dayKey(s.start) === key) values[s.subject] += s.minutes;
    return { day, key, values, isToday: key === dayKey(now) };
  });
}

/** Consecutive days (ending today or yesterday) with at least `min` minutes of study. */
export function streak(sessions: StudySession[], now = new Date(), min = 10): number {
  const perDay = new Map<string, number>();
  for (const s of sessions) perDay.set(dayKey(s.start), (perDay.get(dayKey(s.start)) ?? 0) + s.minutes);
  let d = startOfDay(now);
  if ((perDay.get(dayKey(d)) ?? 0) < min) d = addDays(d, -1);
  let n = 0;
  while ((perDay.get(dayKey(d)) ?? 0) >= min) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** CFU-weighted mastery of the whole programme (0..1) and per subject. */
export function programMastery(states: TopicState[]) {
  const per: Record<SubjectId, { w: number; m: number }> = { biologia: { w: 0, m: 0 }, chimica: { w: 0, m: 0 }, fisica: { w: 0, m: 0 } };
  for (const s of states) {
    const w = topicWeight(s.ref);
    per[s.ref.subject.id].w += w;
    per[s.ref.subject.id].m += w * s.mastery;
  }
  const bySubject = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.w ? v.m / v.w : 0])) as Record<SubjectId, number>;
  const total = Object.values(per).reduce((a, v) => a + v.m, 0) / Math.max(1e-9, Object.values(per).reduce((a, v) => a + v.w, 0));
  return { total, bySubject };
}

export interface Suggestion {
  id: string;
  title: string;
  reason: string;
  cta: string;
  href?: string;
  action?: { type: "study"; topicId: string; mode: "fast" | "deep" | "ultra" };
  minutes: number;
  tone: "azure" | "gold" | "fast" | "deep" | "ultra" | "warning";
}

export function suggestions(input: {
  states: TopicState[];
  dueCards: FlashCard[];
  sessions: StudySession[];
  quizResults: QuizResult[];
  examDate: string;
  now?: Date;
}): Suggestion[] {
  const now = input.now ?? new Date();
  const out: Suggestion[] = [];
  const daysLeft = daysBetween(now, input.examDate);

  if (input.dueCards.length) {
    out.push({
      id: "cards",
      title: `Ripassa ${input.dueCards.length} flashcard in scadenza`,
      reason: "La ripetizione dilazionata funziona se rispetti le scadenze: oggi è il momento ottimale.",
      cta: "Avvia ripasso",
      href: "/flashcard/ripasso",
      minutes: Math.max(5, Math.round(input.dueCards.length * 0.4)),
      tone: "fast",
    });
  }

  const weak = input.states.filter((s) => s.status === "da-consolidare").sort((a, b) => a.mastery - b.mastery)[0];
  if (weak) {
    out.push({
      id: `weak-${weak.ref.topic.id}`,
      title: `Consolida «${weak.ref.topic.title}»`,
      reason: `Padronanza stimata ${Math.round(weak.mastery * 100)}%: i quiz mostrano lacune. Una sessione Deep con analisi degli errori è la scelta più efficace.`,
      cta: "Studia in Deep",
      action: { type: "study", topicId: weak.ref.topic.id, mode: "deep" },
      minutes: 50,
      tone: "deep",
    });
  }

  const untested = input.states.find((s) => s.status === "in-corso");
  if (untested) {
    out.push({
      id: `test-${untested.ref.topic.id}`,
      title: `Mettiti alla prova su «${untested.ref.topic.title}»`,
      reason: "Hai studiato l’argomento ma non l’hai ancora verificato: la sola lettura non conta come completamento.",
      cta: "Quiz rapido",
      href: `/quiz?topic=${untested.ref.topic.id}`,
      minutes: 10,
      tone: "azure",
    });
  }

  const lastSim = input.quizResults.filter((r) => r.kind === "simulazione").map((r) => r.date).sort().at(-1);
  if (daysLeft <= 45 && (!lastSim || daysBetween(lastSim, now) > 6)) {
    out.push({
      id: "sim",
      title: "Fai una simulazione cronometrata",
      reason: `Mancano ${daysLeft} giorni: allenati con il formato ufficiale (31 quesiti, 50 minuti) per abituarti ai tempi.`,
      cta: "Apri simulazioni",
      href: "/quiz/simulazione",
      minutes: 50,
      tone: "gold",
    });
  }

  const weekStart = startOfWeek(now).getTime();
  const week: Record<SubjectId, number> = { biologia: 0, chimica: 0, fisica: 0 };
  for (const s of input.sessions) if (new Date(s.start).getTime() >= weekStart) week[s.subject] += s.minutes;
  const total = week.biologia + week.chimica + week.fisica;
  if (total > 60) {
    const [minSubject, minMin] = (Object.entries(week) as [SubjectId, number][]).sort((a, b) => a[1] - b[1])[0];
    if (minMin / total < 0.18) {
      const next = input.states.find((s) => s.ref.subject.id === minSubject && s.status !== "consolidato");
      if (next)
        out.push({
          id: `balance-${minSubject}`,
          title: `Riequilibra: ${next.ref.subject.name}`,
          reason: `Questa settimana solo il ${Math.round((minMin / total) * 100)}% del tempo è andato a ${next.ref.subject.name}. Alternare le materie riduce l’oblio.`,
          cta: "Studia in Fast",
          action: { type: "study", topicId: next.ref.topic.id, mode: "fast" },
          minutes: 25,
          tone: "warning",
        });
    }
  }

  const fresh = input.states.find((s) => s.status === "nuovo" && hasLesson(s.ref.topic.id)) ?? input.states.find((s) => s.status === "nuovo");
  if (fresh) {
    out.push({
      id: `new-${fresh.ref.topic.id}`,
      title: `Inizia «${fresh.ref.topic.title}»`,
      reason: `${fresh.ref.subject.name}, Unità ${fresh.ref.unit.number}. ${hasLesson(fresh.ref.topic.id) ? "Lezione completa disponibile con percorso Ultra guidato." : "Obiettivi ufficiali e risorse verificate disponibili."}`,
      cta: "Inizia in Ultra",
      action: { type: "study", topicId: fresh.ref.topic.id, mode: "ultra" },
      minutes: 60,
      tone: "ultra",
    });
  }

  return out.slice(0, 4);
}
