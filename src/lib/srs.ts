// Spaced repetition scheduler derived from SuperMemo SM-2 (P. Woźniak, 1990),
// with the four-button grading popularised by Anki. Pure functions — easy to test
// and to replace later with an adaptive model (e.g. FSRS) without touching the UI.

export type Rating = 1 | 2 | 3 | 4;

export const RATING_LABELS: Record<Rating, string> = {
  1: "Di nuovo",
  2: "Difficile",
  3: "Buono",
  4: "Facile",
};

export interface SrsState {
  ease: number;
  /** Interval in days (0 = still in learning step). */
  interval: number;
  reps: number;
  lapses: number;
  /** ISO timestamp of the next review. */
  due: string;
  last?: string;
}

export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 365;
const LEARNING_STEP_MIN = 10;

export function newSrsState(now = new Date()): SrsState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now.toISOString() };
}

function addMinutes(d: Date, min: number) {
  return new Date(d.getTime() + min * 60_000);
}

function addDaysAt(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  // Reviews become due at 04:00 local time, so a card scheduled "tomorrow" is
  // available all day tomorrow regardless of the time it was answered today.
  next.setHours(4, 0, 0, 0);
  return next;
}

export function nextInterval(state: SrsState, rating: Rating): number {
  if (rating === 1) return 0;
  const { reps, interval, ease } = state;
  let days: number;
  if (rating === 2) days = reps === 0 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2));
  else if (rating === 3) days = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(interval + 1, Math.round(interval * ease));
  else days = reps === 0 ? 4 : Math.max(interval + 2, Math.round(interval * ease * 1.3));
  return Math.min(MAX_INTERVAL_DAYS, days);
}

export function review(state: SrsState, rating: Rating, now = new Date()): SrsState {
  const interval = nextInterval(state, rating);
  let ease = state.ease;
  if (rating === 1) ease -= 0.2;
  if (rating === 2) ease -= 0.15;
  if (rating === 4) ease += 0.15;
  ease = Math.max(MIN_EASE, Math.round(ease * 100) / 100);

  if (rating === 1) {
    return {
      ease,
      interval: 0,
      reps: 0,
      lapses: state.lapses + 1,
      due: addMinutes(now, LEARNING_STEP_MIN).toISOString(),
      last: now.toISOString(),
    };
  }
  return {
    ease,
    interval,
    reps: state.reps + 1,
    lapses: state.lapses,
    due: addDaysAt(now, interval).toISOString(),
    last: now.toISOString(),
  };
}

export function isDue(state: SrsState, now = new Date()): boolean {
  return new Date(state.due).getTime() <= now.getTime();
}

export function describeInterval(days: number): string {
  if (days === 0) return "10 min";
  if (days === 1) return "1 giorno";
  if (days < 30) return `${days} giorni`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 mese" : `${months} mesi`;
}

/** Card maturity bucket for statistics. */
export function maturity(state: SrsState): "nuova" | "in apprendimento" | "giovane" | "matura" {
  if (state.reps === 0 && state.lapses === 0 && !state.last) return "nuova";
  if (state.interval === 0) return "in apprendimento";
  if (state.interval < 21) return "giovane";
  return "matura";
}
