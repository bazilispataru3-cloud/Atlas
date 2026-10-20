import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses dates; a bare "yyyy-mm-dd" is read as a local calendar day (the Date
 * constructor would read it as UTC midnight, i.e. the previous day west of UTC).
 */
export function toDate(d: Date | number | string): Date {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

/** Local calendar day key, e.g. "2026-10-19". */
export function dayKey(d: Date | number | string = new Date()): string {
  const date = toDate(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date | number | string = new Date()): Date {
  const date = toDate(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date | number | string, n: number): Date {
  const date = toDate(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function daysBetween(a: Date | number | string, b: Date | number | string): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** Monday-based start of week. */
export function startOfWeek(d: Date | number | string = new Date()): Date {
  const date = startOfDay(d);
  const dow = (date.getDay() + 6) % 7;
  return addDays(date, -dow);
}

const itDate = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" });
const itDateShort = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const itWeekday = new Intl.DateTimeFormat("it-IT", { weekday: "long" });
const itWeekdayShort = new Intl.DateTimeFormat("it-IT", { weekday: "short" });
const itFull = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const itTime = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
const itDateYear = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

export const fmt = {
  date: (d: Date | number | string) => itDate.format(toDate(d)),
  dateShort: (d: Date | number | string) => itDateShort.format(toDate(d)),
  weekday: (d: Date | number | string) => itWeekday.format(toDate(d)),
  weekdayShort: (d: Date | number | string) => itWeekdayShort.format(toDate(d)).replace(".", ""),
  full: (d: Date | number | string) => itFull.format(toDate(d)),
  time: (d: Date | number | string) => itTime.format(toDate(d)),
  dateYear: (d: Date | number | string) => itDateYear.format(toDate(d)),
  minutes: (min: number) => {
    const m = Math.round(min);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  },
  hours: (min: number) => (min / 60).toLocaleString("it-IT", { maximumFractionDigits: 1 }),
  percent: (x: number) => `${Math.round(x * 100)}%`,
  number: (x: number, digits = 1) => x.toLocaleString("it-IT", { maximumFractionDigits: digits }),
  clock: (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  },
};

/** Normalises free-text answers for comparison (accents, case, punctuation). */
const SUPERSCRIPTS: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-", "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4" };

export function normalizeAnswer(s: string): string {
  return s
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻₀₁₂₃₄]/g, (c) => SUPERSCRIPTS[c] ?? c)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "'")
    .replace(/[^a-z0-9+\-,.'/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses an Italian or English formatted number ("1,5", "1.5", "2·10^3"). */
export function parseNumber(s: string): number | null {
  const cleaned = s
    .trim()
    .replace(/\s/g, "")
    .replace(/[·x×]10\^?(-?\d+)/i, "e$1")
    .replace(",", ".");
  const match = cleaned.match(/^-?\d*\.?\d+(e-?\d+)?/i);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Buonanotte";
  if (h < 13) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

/** Capitalises only the first letter, as Italian wants ("giovedì 20 novembre" → "Giovedì 20 novembre"). */
export function capFirst(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase("it-IT") + s.slice(1) : s;
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  let s = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pluralize(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
