// Study paths: which steps each mode uses, in which order. Kept free of React and
// of the exercise components so the start-study dialog (mounted in the app shell)
// can describe the modes without loading every exercise.

import { Zap, Layers, BrainCircuit, type LucideIcon } from "lucide-react";
import type { StudyMode, TopicRef } from "@/lib/types";
import { MODE_INFO } from "@/data/academy";

export type StepKey =
  | "riassunto" | "definizioni" | "schema" | "concetti" | "flashcard" | "quizRapido" | "lezione" | "spiegazione" | "esempi" | "mappa"
  | "recall" | "cornell" | "problemi" | "quizProgressivo" | "lacune" | "attivazione" | "dual" | "elaborazione" | "autospiegazione"
  | "feynman" | "palazzo" | "interleaving" | "orale" | "ripasso" | "risorse";

/** Step titles, kept in sync with buildSteps; used to describe the paths without a lesson at hand. */
export const STEP_LABEL: Record<StepKey, string> = {
  riassunto: "Riassunto essenziale",
  definizioni: "Definizioni essenziali",
  schema: "Schema sintetico",
  concetti: "Concetti chiave e syllabus",
  flashcard: "Flashcard rapide",
  quizRapido: "Quiz rapido",
  lezione: "Lezione introduttiva",
  spiegazione: "Spiegazione approfondita",
  esempi: "Esempi e applicazioni",
  mappa: "Mappa concettuale",
  recall: "Active recall",
  cornell: "Metodo Cornell",
  problemi: "Problemi guidati",
  quizProgressivo: "Quiz progressivo",
  lacune: "Analisi delle lacune",
  attivazione: "Attivazione: cosa sai già?",
  dual: "Dual coding",
  elaborazione: "Elaborazione: perché?",
  autospiegazione: "Auto-spiegazione",
  feynman: "Tecnica di Feynman",
  palazzo: "Palazzo della memoria",
  interleaving: "Interleaving",
  orale: "Simulazione orale",
  ripasso: "Piano di ripasso",
  risorse: "Video e corsi consigliati",
};

/** Short names of the tools, for running text ("riassunto, schema, quiz rapido"). */
export const STEP_TOOL: Record<StepKey, string> = {
  riassunto: "riassunto",
  definizioni: "definizioni",
  schema: "schema",
  concetti: "concetti chiave",
  flashcard: "flashcard",
  quizRapido: "quiz rapido",
  lezione: "lezione introduttiva",
  spiegazione: "spiegazione approfondita",
  esempi: "esempi",
  mappa: "mappa concettuale",
  recall: "active recall",
  cornell: "metodo Cornell",
  problemi: "problemi guidati",
  quizProgressivo: "quiz progressivo",
  lacune: "analisi delle lacune",
  attivazione: "pre-test",
  dual: "dual coding",
  elaborazione: "elaborazione",
  autospiegazione: "auto-spiegazione",
  feynman: "tecnica di Feynman",
  palazzo: "palazzo della memoria",
  interleaving: "pratica mista",
  orale: "simulazione orale",
  ripasso: "piano di ripasso",
  risorse: "video consigliati",
};

export const MODE_SEQUENCE: Record<"fast" | "deep", StepKey[]> = {
  fast: ["riassunto", "definizioni", "schema", "concetti", "flashcard", "quizRapido"],
  deep: ["lezione", "spiegazione", "esempi", "mappa", "recall", "cornell", "problemi", "quizProgressivo", "lacune", "risorse"],
};

export type UltraKind = "meccanistico" | "quantitativo" | "misto";

// Ultra: the path adapts to the nature of the topic.
export const ULTRA_SEQUENCE: Record<UltraKind, StepKey[]> = {
  meccanistico: ["attivazione", "dual", "spiegazione", "elaborazione", "feynman", "palazzo", "interleaving", "orale", "ripasso"],
  quantitativo: ["attivazione", "dual", "spiegazione", "autospiegazione", "problemi", "interleaving", "feynman", "orale", "ripasso"],
  misto: ["attivazione", "spiegazione", "dual", "autospiegazione", "problemi", "elaborazione", "feynman", "interleaving", "ripasso"],
};

export function ultraKind(ref: TopicRef): UltraKind {
  if (ref.subject.id === "fisica") return "quantitativo";
  if (ref.subject.id === "chimica") return "misto";
  return "meccanistico";
}

export const ULTRA_RATIONALE: Record<UltraKind, string> = {
  meccanistico:
    "Argomento ricco di meccanismi e terminologia: il percorso privilegia dual coding ed elaborazione per la comprensione, Feynman per verificare la spiegazione, il palazzo della memoria per le sequenze e l’interrogazione per il recupero.",
  quantitativo:
    "Argomento quantitativo: il percorso privilegia auto-spiegazione di esempi svolti, problemi guidati e interleaving, che allenano a riconoscere quale legge applicare.",
  misto:
    "Argomento che unisce concetti e calcoli: alterna auto-spiegazione e problemi guidati all’elaborazione dei perché, poi verifica con Feynman e pratica mista.",
};

/** Which subject each Ultra variant belongs to (the variant follows the subject). */
export const ULTRA_KIND_SUBJECT: Record<UltraKind, { subject: string; label: string }> = {
  meccanistico: { subject: "Biologia", label: "meccanismi e sequenze" },
  misto: { subject: "Chimica", label: "concetti e calcoli" },
  quantitativo: { subject: "Fisica", label: "leggi e problemi" },
};

/** The path a mode follows (Ultra depends on the topic; without one it shows the biology variant). */
export function sequenceFor(mode: StudyMode, kind: UltraKind = "meccanistico"): StepKey[] {
  return mode === "ultra" ? ULTRA_SEQUENCE[kind] : MODE_SEQUENCE[mode];
}

/** Steps of a session on a topic that has no ATLAS lesson yet: the same for every mode. */
export const NO_LESSON_STEPS = ["Obiettivi del syllabus", "Video e corsi consigliati", "Spiegazione con l’AI Professor", "Active recall sui sottoargomenti", "Quiz"];

export const MODES: StudyMode[] = ["fast", "deep", "ultra"];

/**
 * What a student needs to choose a mode: how deep it goes (a 3-step scale, not a
 * difficulty), how long it takes, what it is for. Names are the short Italian
 * forms used in the interface.
 */
export const MODE_META: Record<StudyMode, { name: string; icon: LucideIcon; depth: 1 | 2 | 3; goal: string; time: string }> = {
  fast: {
    name: "Fast",
    icon: Zap,
    depth: 1,
    goal: "Fissare i concetti chiave in poco tempo: primo contatto o ripasso veloce.",
    time: MODE_INFO.fast.time,
  },
  deep: {
    name: "Deep",
    icon: Layers,
    depth: 2,
    goal: "Capire meccanismi e cause, verificare la comprensione e trovare le lacune.",
    time: MODE_INFO.deep.time,
  },
  ultra: {
    name: "Ultra",
    icon: BrainCircuit,
    depth: 3,
    goal: "Consolidare per l’esame con le tecniche più adatte all’argomento.",
    time: MODE_INFO.ultra.time,
  },
};

export const DEPTH_LABELS = ["Essenziale", "Approfondita", "Completa"] as const;

/** "Riassunto, definizioni, schema…" from a path (`capital: false` for the middle of a sentence). */
export function toolsSentence(keys: StepKey[], capital = true): string {
  const s = keys.map((k) => STEP_TOOL[k]).join(", ");
  return capital ? s.charAt(0).toLocaleUpperCase("it-IT") + s.slice(1) : s;
}

/**
 * The next topic to study in a list of topic states (same rule as the subjects pages and
 * the dashboard): first what needs consolidating, then what is in progress, then a new one.
 */
export function nextTopic<T extends { ref: TopicRef; status: string }>(states: T[], excludeId?: string): T | undefined {
  const pool = excludeId ? states.filter((x) => x.ref.topic.id !== excludeId) : states;
  return pool.find((x) => x.status === "da-consolidare") ?? pool.find((x) => x.status === "in-corso") ?? pool.find((x) => x.status === "nuovo");
}

/** Elapsed time for a running clock: "12:05", or "1:02:05" past the hour. */
export function clockLabel(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}

/** Minutes in words for summaries: "meno di 1 min", "12 min", "1 h 5 min". */
export function minutesLabel(ms: number): string {
  const min = ms / 60000;
  if (min < 1) return "meno di 1 min";
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
