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
 * Roles: azure = study features and free content; gold = premium only;
 * success / warning / danger = states, always with an icon or a label
 * (warning is orange so it never reads as premium gold); fast / deep / ultra
 * = the three study modes; bio / chem / phys = subjects (fills validated with
 * the dataviz CVD checker on the dark surface, text uses the lighter -300 step).
 */
export const TONE: Record<Tone, { text: string; bg: string; border: string; dot: string; hex: string }> = {
  azure: { text: "text-azure-300", bg: "bg-azure-500/[0.12]", border: "border-azure-400/30", dot: "bg-azure-400", hex: "#3d8bff" },
  gold: { text: "text-gold-300", bg: "bg-gold-500/[0.12]", border: "border-gold-400/35", dot: "bg-gold-400", hex: "#efc14f" },
  success: { text: "text-green-300", bg: "bg-success/[0.1]", border: "border-success/30", dot: "bg-success", hex: "#4ade80" },
  warning: { text: "text-orange-300", bg: "bg-warning/[0.1]", border: "border-warning/30", dot: "bg-warning", hex: "#fb923c" },
  danger: { text: "text-red-300", bg: "bg-danger/[0.1]", border: "border-danger/30", dot: "bg-danger", hex: "#ff8a8a" },
  muted: { text: "text-fg-muted", bg: "bg-white/[0.05]", border: "border-white/10", dot: "bg-fg-subtle", hex: "#a7adbb" },
  fast: { text: "text-teal-300", bg: "bg-fast/[0.1]", border: "border-fast/30", dot: "bg-fast", hex: "#2dd4bf" },
  deep: { text: "text-indigo-300", bg: "bg-deep/[0.12]", border: "border-deep/30", dot: "bg-deep", hex: "#6b8cff" },
  ultra: { text: "text-fuchsia-300", bg: "bg-ultra/[0.1]", border: "border-ultra/30", dot: "bg-ultra", hex: "#e879f9" },
  bio: { text: "text-bio-300", bg: "bg-bio/[0.12]", border: "border-bio/35", dot: "bg-bio", hex: "#199e70" },
  chem: { text: "text-chem-300", bg: "bg-chem/[0.12]", border: "border-chem/35", dot: "bg-chem", hex: "#d95926" },
  phys: { text: "text-phys-300", bg: "bg-phys/[0.12]", border: "border-phys/35", dot: "bg-phys", hex: "#9085e9" },
};

export const SUBJECT_TONE: Record<SubjectId, Tone> = { biologia: "bio", chimica: "chem", fisica: "phys" };
export const MODE_TONE: Record<StudyMode, Tone> = { fast: "fast", deep: "deep", ultra: "ultra" };
