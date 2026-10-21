import { GalleryVerticalEnd, Layers, ListChecks, Timer, Zap, BrainCircuit, type LucideIcon } from "lucide-react";
import type { StudyMode } from "@/lib/types";
import type { Suggestion } from "@/lib/insights";
import { MODE_TONE, TONE } from "@/components/ui/tone";

/** Compact durations for chart axes and tooltips: "45 min", "1 h", "1 h 30". */
export function shortMinutes(v: number): string {
  const m = Math.round(v);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

/** Minute steps allowed on the y-axis of study-time charts (round values only). */
export const MINUTE_TICKS = [15, 30, 60, 90, 120, 180, 240, 300, 360];

export const MODE_ICON: Record<StudyMode, LucideIcon> = { fast: Zap, deep: Layers, ultra: BrainCircuit };

const KIND_ICON: Record<Suggestion["kind"], LucideIcon> = {
  flashcard: GalleryVerticalEnd,
  consolida: Layers,
  verifica: ListChecks,
  simulazione: Timer,
  equilibrio: Zap,
  nuovo: BrainCircuit,
};

/** Icon and icon colour for a suggestion: the study mode when it opens a session, otherwise the kind of activity. */
export function suggestionVisual(s: Suggestion): { Icon: LucideIcon; color: string } {
  if (s.action) return { Icon: MODE_ICON[s.action.mode], color: TONE[MODE_TONE[s.action.mode]].text };
  return { Icon: KIND_ICON[s.kind], color: "text-azure-300" };
}
