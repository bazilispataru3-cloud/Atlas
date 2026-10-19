import type { StudyMode, SubjectId } from "@/lib/types";

export type Tone =
  | "azure"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "fast"
  | "deep"
  | "ultra"
  | "bio"
  | "chem"
  | "phys";

/**
 * Static class lists (Tailwind needs literal class names).
 * Subject hues (bio/chem/phys) are validated with the dataviz CVD checker on the dark surface (#111116).
 */
export const TONE: Record<Tone, { text: string; bg: string; border: string; dot: string; hex: string }> = {
  azure: { text: "text-azure-300", bg: "bg-azure-500/12", border: "border-azure-400/30", dot: "bg-azure-400", hex: "#56a6ff" },
  gold: { text: "text-gold-300", bg: "bg-gold-500/12", border: "border-gold-400/35", dot: "bg-gold-400", hex: "#efc55c" },
  success: { text: "text-emerald-300", bg: "bg-emerald-500/12", border: "border-emerald-400/30", dot: "bg-emerald-400", hex: "#4ade80" },
  warning: { text: "text-amber-300", bg: "bg-amber-500/12", border: "border-amber-400/30", dot: "bg-amber-400", hex: "#fbbf24" },
  danger: { text: "text-red-300", bg: "bg-red-500/12", border: "border-red-400/30", dot: "bg-red-400", hex: "#f87171" },
  muted: { text: "text-fg-muted", bg: "bg-white/[0.05]", border: "border-white/10", dot: "bg-fg-subtle", hex: "#a6a6b3" },
  fast: { text: "text-teal-300", bg: "bg-teal-400/12", border: "border-teal-300/30", dot: "bg-fast", hex: "#2dd4bf" },
  deep: { text: "text-indigo-300", bg: "bg-indigo-400/12", border: "border-indigo-300/30", dot: "bg-deep", hex: "#6b8cff" },
  ultra: { text: "text-fuchsia-300", bg: "bg-fuchsia-400/12", border: "border-fuchsia-300/30", dot: "bg-ultra", hex: "#e879f9" },
  bio: { text: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-300/25", dot: "bg-bio", hex: "#199e70" },
  chem: { text: "text-orange-300", bg: "bg-orange-400/10", border: "border-orange-300/25", dot: "bg-chem", hex: "#d95926" },
  phys: { text: "text-violet-300", bg: "bg-violet-400/10", border: "border-violet-300/25", dot: "bg-phys", hex: "#9085e9" },
};

export const SUBJECT_TONE: Record<SubjectId, Tone> = { biologia: "bio", chimica: "chem", fisica: "phys" };
export const MODE_TONE: Record<StudyMode, Tone> = { fast: "fast", deep: "deep", ultra: "ultra" };
