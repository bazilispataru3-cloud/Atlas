// Study planner: turns availability + syllabus + measured progress into a
// day-by-day calendar. Pure and deterministic, so it can be unit tested and
// re-run whenever progress changes ("ricalcola dal progresso reale").

import type { SubjectId, TopicRef } from "./types";
import type { TopicStatus } from "./progress";
import { addDays, dayKey, daysBetween, startOfDay } from "./utils";

export type DayKind = "libero" | "lezione" | "lavoro" | "riposo";

export interface PlanConfig {
  startDate: string; // yyyy-mm-dd
  examDate: string; // yyyy-mm-dd
  subjects: SubjectId[];
  /** Monday = 0 … Sunday = 6 */
  week: { kind: DayKind; hours: number }[];
  restDates: string[];
  levels: Record<SubjectId, "base" | "intermedio" | "avanzato">;
  /** Optional: pages of material to cover per subject (overrides the syllabus-based estimate). */
  pages?: Partial<Record<SubjectId, number>>;
}

export type PlanItemKind =
  | "apprendimento"
  | "esercizi"
  | "ripasso"
  | "recupero"
  | "interleaving"
  | "simulazione"
  | "rielaborazione"
  | "pausa"
  | "riposo"
  | "esame";

export interface PlanItem {
  id: string;
  date: string;
  kind: PlanItemKind;
  subject?: SubjectId;
  topicIds: string[];
  minutes: number;
  title: string;
  detail: string;
}

export interface PlanTopicInput {
  ref: TopicRef;
  status: TopicStatus;
  weight: number;
}

export interface PlanResult {
  items: PlanItem[];
  warnings: string[];
  stats: {
    days: number;
    studyMinutes: number;
    topicsToLearn: number;
    topicsToRecover: number;
    topicsUnscheduled: number;
    simulations: number;
  };
}

const LEVEL_FACTOR = { base: 1.25, intermedio: 1, avanzato: 0.8 } as const;
const REVIEW_OFFSETS = [1, 3, 7, 16];
const REVIEW_MINUTES = [10, 8, 8, 10];
const MIN_CHUNK = 25;
const MIN_TAIL = 15;
const STUDY_SHARE = 0.88; // the rest of the available time is reserved for breaks

const SUBJECT_LABEL: Record<SubjectId, string> = {
  biologia: "Biologia",
  chimica: "Chimica",
  fisica: "Fisica",
};

/** Units in which calculation exercises are part of the official objectives. */
function needsExercises(ref: TopicRef): boolean {
  if (ref.subject.id === "fisica") return true;
  if (ref.subject.id === "chimica") return ["chim-u1", "chim-u2", "chim-u3", "chim-u4"].includes(ref.unit.id);
  return ref.unit.id === "bio-u4"; // genetica: esercizi di probabilità e alberi genealogici
}

export function learningMinutes(input: PlanTopicInput, config: PlanConfig, subjectWeightTotal: number): number {
  const level = LEVEL_FACTOR[config.levels[input.ref.subject.id] ?? "intermedio"];
  const pages = config.pages?.[input.ref.subject.id];
  let minutes: number;
  if (pages && pages > 0) {
    // ~6 minutes per page of university material at an intermediate level.
    minutes = ((pages * 6) / subjectWeightTotal) * input.weight;
  } else {
    // ~3 hours of focused study per CFU-share unit of the syllabus.
    minutes = input.weight * 180 * 2.2;
  }
  minutes *= level;
  return Math.round(Math.min(150, Math.max(35, minutes)) / 5) * 5;
}

function interleaveBySubject(inputs: PlanTopicInput[]): PlanTopicInput[] {
  const bySubject = new Map<SubjectId, PlanTopicInput[]>();
  for (const i of inputs) {
    const list = bySubject.get(i.ref.subject.id) ?? [];
    list.push(i);
    bySubject.set(i.ref.subject.id, list);
  }
  const lists = [...bySubject.values()];
  const out: PlanTopicInput[] = [];
  let k = 0;
  while (lists.some((l) => l.length)) {
    const list = lists[k % lists.length];
    const next = list.shift();
    if (next) out.push(next);
    k++;
  }
  return out;
}

export function generatePlan(config: PlanConfig, topics: PlanTopicInput[]): PlanResult {
  const warnings: string[] = [];
  const items: PlanItem[] = [];
  // Ids come from the content (day, kind, topics), so re-planning keeps the same
  // id for the same activity and the student's check marks survive.
  const usedIds = new Set<string>();
  const push = (item: Omit<PlanItem, "id">) => {
    const base = planItemKey(item).replace(/[|]+/g, "-").replace(/-+$/, "");
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    items.push({ ...item, id });
  };

  const start = startOfDay(config.startDate);
  const exam = startOfDay(config.examDate);
  const totalDays = daysBetween(start, exam);
  if (totalDays <= 0) {
    return {
      items: [],
      warnings: ["La data d’esame deve essere successiva alla data di inizio del piano."],
      stats: { days: 0, studyMinutes: 0, topicsToLearn: 0, topicsToRecover: 0, topicsUnscheduled: 0, simulations: 0 },
    };
  }

  const selected = topics.filter((t) => config.subjects.includes(t.ref.subject.id));
  const weightTotals = new Map<SubjectId, number>();
  for (const t of selected) weightTotals.set(t.ref.subject.id, (weightTotals.get(t.ref.subject.id) ?? 0) + t.weight);

  const toLearn = interleaveBySubject(selected.filter((t) => t.status === "nuovo" || t.status === "in-corso"));
  const toRecover = interleaveBySubject(selected.filter((t) => t.status === "da-consolidare"));
  const consolidated = selected.filter((t) => t.status === "consolidato");

  type Task = { input: PlanTopicInput; minutes: number; part: number; kind: "apprendimento" | "recupero" };
  const queue: Task[] = [];
  // Recovery of incomplete topics comes first: it is cheaper and unblocks reviews.
  for (const t of toRecover) queue.push({ input: t, minutes: Math.max(30, Math.round(learningMinutes(t, config, weightTotals.get(t.ref.subject.id) ?? 1) * 0.45 / 5) * 5), part: 1, kind: "recupero" });
  for (const t of toLearn) queue.push({ input: t, minutes: learningMinutes(t, config, weightTotals.get(t.ref.subject.id) ?? 1), part: 1, kind: "apprendimento" });

  const reviewWindow = Math.max(2, Math.min(14, Math.round(totalDays * 0.22)));
  const learningDeadline = addDays(exam, -reviewWindow);
  const simulationDays = new Set<string>();
  // Simulations: one every ~4 days in the final window, plus weekly mini-simulations from mid-plan.
  for (let d = 2; d <= reviewWindow; d += 4) simulationDays.add(dayKey(addDays(exam, -d)));
  const midpoint = Math.floor(totalDays / 2);
  for (let d = midpoint; d < totalDays - reviewWindow; d += 7) simulationDays.add(dayKey(addDays(start, d)));

  const reviews = new Map<string, { subject: SubjectId; topicId: string; minutes: number; round: number }[]>();
  const scheduleReviews = (from: Date, input: PlanTopicInput) => {
    REVIEW_OFFSETS.forEach((offset, i) => {
      const date = addDays(from, offset);
      if (date >= exam) return;
      const key = dayKey(date);
      const list = reviews.get(key) ?? [];
      list.push({ subject: input.ref.subject.id, topicId: input.ref.topic.id, minutes: REVIEW_MINUTES[i], round: i + 1 });
      reviews.set(key, list);
    });
  };
  // Topics already consolidated still get spaced reviews before the exam.
  consolidated.forEach((t, i) => {
    const date = addDays(start, 2 + (i % Math.max(1, totalDays - 3)));
    if (date < exam) {
      const key = dayKey(date);
      const list = reviews.get(key) ?? [];
      list.push({ subject: t.ref.subject.id, topicId: t.ref.topic.id, minutes: 12, round: 0 });
      reviews.set(key, list);
    }
  });

  const exercises = new Map<string, PlanTopicInput[]>();
  const learnedSoFar: PlanTopicInput[] = [];
  let studyMinutes = 0;
  let simulations = 0;
  let simRotation = 0;
  const restDates = new Set(config.restDates);

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(start, i);
    const key = dayKey(date);
    const dow = (date.getDay() + 6) % 7;
    const day = config.week[dow] ?? { kind: "libero", hours: 0 };
    const isRest = restDates.has(key) || day.kind === "riposo" || day.hours <= 0;
    const isLastDay = i === totalDays - 1;

    if (isRest) {
      push({ date: key, kind: "riposo", topicIds: [], minutes: 0, title: "Giorno di recupero", detail: "Nessuna sessione: il riposo consolida la memoria. Le attività previste slittano al giorno seguente." });
      // Carry today's reviews over to tomorrow.
      const due = reviews.get(key);
      if (due?.length) {
        const tomorrow = dayKey(addDays(date, 1));
        reviews.set(tomorrow, [...(reviews.get(tomorrow) ?? []), ...due]);
        reviews.delete(key);
      }
      const ex = exercises.get(key);
      if (ex?.length) {
        const tomorrow = dayKey(addDays(date, 1));
        exercises.set(tomorrow, [...(exercises.get(tomorrow) ?? []), ...ex]);
        exercises.delete(key);
      }
      continue;
    }

    let cap = Math.round(day.hours * 60 * STUDY_SHARE * (isLastDay ? 0.5 : 1));
    const dayStart = cap;

    if (day.kind === "lezione") {
      const m = Math.min(20, cap);
      push({ date: key, kind: "rielaborazione", topicIds: [], minutes: m, title: "Rielaborazione della lezione", detail: "Metodo Cornell: domande guida e sintesi della lezione di oggi, entro 24 ore." });
      cap -= m;
    }

    // 1) Spaced reviews due today (highest priority).
    const due = reviews.get(key) ?? [];
    const bySubject = new Map<SubjectId, typeof due>();
    for (const r of due) bySubject.set(r.subject, [...(bySubject.get(r.subject) ?? []), r]);
    for (const [subject, list] of bySubject) {
      const minutes = Math.min(cap, list.reduce((s, r) => s + r.minutes, 0));
      if (minutes < 8) {
        const tomorrow = dayKey(addDays(date, 1));
        if (addDays(date, 1) < exam) reviews.set(tomorrow, [...(reviews.get(tomorrow) ?? []), ...list]);
        continue;
      }
      push({
        date: key,
        kind: "ripasso",
        subject,
        topicIds: list.map((r) => r.topicId),
        minutes,
        title: `Ripasso dilazionato · ${SUBJECT_LABEL[subject]}`,
        detail: "Active recall: prova a ricordare prima di rileggere, poi flashcard in scadenza.",
      });
      cap -= minutes;
    }

    // 2) Simulations.
    if (simulationDays.has(key) && cap >= 50) {
      const inFinalWindow = date >= learningDeadline;
      if (inFinalWindow && cap >= 210) {
        push({ date: key, kind: "simulazione", topicIds: [], minutes: 210, title: "Simulazione completa (3 prove)", detail: "3 × 50 minuti con 30 minuti di intervallo, come previsto dal D.M. 941/2026. Poi revisione degli errori." });
        cap -= 210;
      } else {
        const subject = config.subjects[simRotation++ % config.subjects.length];
        push({ date: key, kind: "simulazione", subject, topicIds: [], minutes: 50, title: `Simulazione · ${SUBJECT_LABEL[subject]}`, detail: "31 quesiti (21 a risposta multipla + 10 a completamento) in 50 minuti." });
        cap -= 50;
      }
      simulations++;
    }

    // 3) Exercises for topics learned on previous days.
    for (const input of exercises.get(key) ?? []) {
      if (cap < MIN_CHUNK) {
        const tomorrow = dayKey(addDays(date, 1));
        exercises.set(tomorrow, [...(exercises.get(tomorrow) ?? []), input]);
        continue;
      }
      const minutes = Math.min(cap, 30);
      push({ date: key, kind: "esercizi", subject: input.ref.subject.id, topicIds: [input.ref.topic.id], minutes, title: `Esercizi · ${input.ref.topic.title}`, detail: "Problemi guidati e numerici; annota gli errori per tipologia." });
      cap -= minutes;
    }

    // 4) Weekly interleaved practice once there is material to mix.
    if (dow === 5 && learnedSoFar.length >= 4 && cap >= 40) {
      const mix = learnedSoFar.slice(-8).map((t) => t.ref.topic.id);
      push({ date: key, kind: "interleaving", topicIds: mix, minutes: 40, title: "Pratica mista (interleaving)", detail: "Quesiti alternati tra materie e argomenti già studiati: allena a riconoscere il tipo di problema." });
      cap -= 40;
    }

    // 5) New learning / recovery.
    // Learning continues past the ideal deadline if needed; a warning reports it.
    while (cap >= MIN_CHUNK && queue.length) {
      const task = queue[0];
      // Avoid leftover fragments: a remainder under MIN_TAIL is done today (small overrun).
      const minutes = task.minutes - cap < MIN_TAIL ? task.minutes : cap;
      const ref = task.input.ref;
      const partial = minutes < task.minutes;
      push({
        date: key,
        kind: task.kind,
        subject: ref.subject.id,
        topicIds: [ref.topic.id],
        minutes,
        title: `${task.kind === "recupero" ? "Recupero" : "Studio"} · ${ref.topic.title}${partial || task.part > 1 ? ` (parte ${task.part})` : ""}`,
        detail:
          task.kind === "recupero"
            ? "Argomento già affrontato ma non consolidato: riprendi le lacune emerse dai quiz, poi verifica."
            : `Unità ${ref.unit.number} · ${ref.chapter.title}. Chiudi con 5 domande di verifica: la lettura da sola non conta come completamento.`,
      });
      cap = Math.max(0, cap - minutes);
      if (partial) {
        task.minutes -= minutes;
        task.part += 1;
        break;
      }
      queue.shift();
      learnedSoFar.push(task.input);
      scheduleReviews(date, task.input);
      if (needsExercises(ref) && task.kind === "apprendimento") {
        const next = dayKey(addDays(date, 1));
        exercises.set(next, [...(exercises.get(next) ?? []), task.input]);
      }
    }

    const used = dayStart - cap;
    studyMinutes += used;
    const pauses = Math.floor(used / 100);
    if (pauses > 0) {
      push({ date: key, kind: "pausa", topicIds: [], minutes: pauses * 15, title: pauses === 1 ? "1 pausa attiva" : `${pauses} pause attive`, detail: "Ogni 50–100 minuti: alzati, idratati, niente schermi. Le pause sono parte del piano." });
    }
  }

  push({ date: dayKey(exam), kind: "esame", topicIds: [], minutes: 0, title: "Esame", detail: "Tre prove da 50 minuti (31 quesiti ciascuna). Porta un documento valido." });

  const unscheduled = queue.length;
  if (unscheduled > 0) {
    warnings.push(
      `Con le ore indicate restano ${unscheduled} argomenti non pianificati prima dell’esame. Aumenta le ore disponibili, riduci i giorni di riposo o valuta il secondo appello.`,
    );
  }
  const lateLearning = items.filter((it) => (it.kind === "apprendimento" || it.kind === "recupero") && startOfDay(it.date) >= learningDeadline).length;
  if (lateLearning > 0 && unscheduled === 0) {
    warnings.push(`${lateLearning} sessioni di studio cadono nelle ultime ${reviewWindow} giornate, riservate idealmente a ripasso e simulazioni.`);
  }

  return {
    items,
    warnings,
    stats: {
      days: totalDays,
      studyMinutes,
      topicsToLearn: toLearn.length,
      topicsToRecover: toRecover.length,
      topicsUnscheduled: unscheduled,
      simulations,
    },
  };
}

/** Identity of an activity independent of its id: same day, kind, topics and subject. */
export function planItemKey(it: Pick<PlanItem, "date" | "kind" | "topicIds" | "subject">): string {
  return [it.date, it.kind, it.subject ?? "", it.topicIds.join("+")].join("|");
}

/**
 * Check marks to carry over when a plan is replaced from `fromDate` on: the ids
 * of the new activities that match an activity already marked as done.
 */
export function carryOverDone(oldItems: PlanItem[], done: Iterable<string>, newItems: PlanItem[], fromDate: string): string[] {
  const doneSet = new Set(done);
  const doneKeys = new Set(oldItems.filter((i) => i.date >= fromDate && doneSet.has(i.id)).map(planItemKey));
  return newItems.filter((i) => !doneSet.has(i.id) && doneKeys.has(planItemKey(i))).map((i) => i.id);
}

/**
 * Display families: few, clearly different colours (each always shown with its
 * label): study, recovery, review, practice (exercises, mixed practice and
 * simulations), Cornell and rest in neutral grey, the exam in red.
 */
export const KIND_META: Record<PlanItemKind, { label: string; tone: string; family: string }> = {
  apprendimento: { label: "Studio", tone: "azure", family: "Studio" },
  esercizi: { label: "Esercizi", tone: "ultra", family: "Pratica" },
  ripasso: { label: "Ripasso", tone: "fast", family: "Ripasso" },
  recupero: { label: "Recupero", tone: "warning", family: "Recupero" },
  interleaving: { label: "Pratica mista", tone: "ultra", family: "Pratica" },
  simulazione: { label: "Simulazione", tone: "ultra", family: "Pratica" },
  rielaborazione: { label: "Cornell", tone: "muted", family: "Cornell e riposo" },
  pausa: { label: "Pausa", tone: "muted", family: "Cornell e riposo" },
  riposo: { label: "Riposo", tone: "muted", family: "Cornell e riposo" },
  esame: { label: "Esame", tone: "danger", family: "Esame" },
};
