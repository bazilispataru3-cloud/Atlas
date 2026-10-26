import type { SubjectId } from "@/lib/types";
import type { QuizOutcome, QuizRunnerSnapshot } from "@/components/exercises/quiz-runner";
import { capFirst, fmt } from "@/lib/utils";

/**
 * Human durations for results and history: "meno di 1 min" / "45 s", "6 min",
 * "9 min 10 s", "1 h 5 min". `seconds` keeps the seconds below 10 minutes,
 * where they still mean something (a 10-question quiz).
 */
export function formatDuration(totalSec: number, { seconds = true }: { seconds?: boolean } = {}): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return seconds ? `${s} s` : "meno di 1 min";
  const min = Math.floor(s / 60);
  const rest = s % 60;
  if (min < 10 && seconds && rest) return `${min} min ${rest} s`;
  if (min < 60) return `${Math.round(s / 60)} min`;
  return fmt.minutes(s / 60);
}

/**
 * "domenica 26 ottobre" for a review date, "oggi" / "domani" when closer.
 * Lowercase, for use inside a sentence; wrap in `capFirst` at the start of one.
 */
export function formatDay(d: Date | string, now = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(date) - day(now)) / 86_400_000);
  if (diff <= 0) return "oggi";
  if (diff === 1) return "domani";
  return `${fmt.weekday(date)} ${fmt.date(date)}`;
}

/** "Domenica 26 ottobre", "Oggi": a date at the start of a line. */
export const formatDayStart = (d: Date | string, now = new Date()) => capFirst(formatDay(d, now));

/** Safe sessionStorage access: private windows and blocked storage must never break a quiz. */
export const session = {
  read<T>(key: string): T | null {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  write(key: string, value: unknown) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable: the run simply cannot be resumed */
    }
  },
  remove(key: string) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const STORAGE_KEYS = {
  quiz: "atlas:quiz-in-corso",
  exam: "atlas:simulazione-in-corso",
} as const;

/** A practice quiz in progress on /quiz (sessionStorage): enough to rebuild it after a reload or a pause. */
export interface StoredQuiz {
  ids: string[];
  title: string;
  variant: "practice" | "progressive";
  subject?: SubjectId;
  seed: number;
  snapshot?: QuizRunnerSnapshot;
  /** Last time the run was saved: on resume the pause is not counted as quiz time. */
  savedAt: number;
}

/** An exam simulation in progress (sessionStorage). The exam clock keeps running while away, as on the real day. */
export interface StoredExam {
  format: "singola" | "completa";
  subject: SubjectId;
  seed: number;
  phase: { kind: "exam"; i: number } | { kind: "break"; i: number; until: number };
  outcomes: { subject: SubjectId; o: QuizOutcome }[];
  snapshot?: QuizRunnerSnapshot;
  savedAt: number;
}
