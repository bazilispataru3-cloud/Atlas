// Shared domain types for ATLAS STUDY.

export type SubjectId = "biologia" | "chimica" | "fisica";

export type StudyMode = "fast" | "deep" | "ultra";

export type ExplanationLevel = "introduttivo" | "universitario" | "avanzato";

/** Materia → Unità didattica → Capitolo → Argomento → Sottoargomento */
export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string;
  cfu: number;
  tagline: string;
  generalObjective: string;
  units: Unit[];
}

export interface Unit {
  id: string;
  number: number;
  title: string;
  cfu: number;
  /** Minimum share of the unit dedicated to exercises (Physics syllabus only). */
  exerciseShare?: number;
  /** Introductory line of the unit as written in the official syllabus. */
  officialLead: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  title: string;
  /** Verbatim (normalised) text of the official syllabus bullet. */
  syllabusText: string;
  subtopics: string[];
  /** Flag for content that goes beyond the official syllabus. */
  advanced?: boolean;
  /** Id of a fully written lesson, when available. */
  hasLesson?: boolean;
  keywords?: string[];
}

export interface TopicRef {
  subject: Subject;
  unit: Unit;
  chapter: Chapter;
  topic: Topic;
}

// ── Lesson content ────────────────────────────────────────────

export interface Source {
  label: string;
  detail?: string;
  url?: string;
  doi?: string;
  kind: "ufficiale" | "manuale" | "articolo" | "risorsa-aperta";
}

export interface LessonSection {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
  callout?: { tone: "info" | "warning" | "clinical"; text: string };
}

export interface Definition {
  term: string;
  definition: string;
}

export interface ConceptMap {
  nodes: { id: string; label: string; group?: number }[];
  edges: { from: string; to: string; label: string }[];
}

export interface GuidedProblem {
  id: string;
  statement: string;
  steps: { hint: string; result: string }[];
  answer: string;
}

export interface FeynmanRubric {
  /** Each essential concept is satisfied when any keyword group matches. */
  essentials: { concept: string; keywords: string[][]; explanation: string }[];
  /**
   * Common misconceptions, detected sentence by sentence: every trigger group must
   * match (any keyword of the group) and no `excludes` keyword may appear.
   */
  misconceptions: { id: string; triggers: string[][]; excludes?: string[]; correction: string }[];
}

export interface Lesson {
  topicId: string;
  readingMinutes: number;
  intro: string[];
  fastSummary: string[];
  keyConcepts: string[];
  definitions: Definition[];
  schema: { title: string; steps: { label: string; detail: string }[] };
  sections: LessonSection[];
  objectives: string[];
  examples: { title: string; body: string }[];
  conceptMap: ConceptMap;
  activeRecall: { prompt: string; answer: string }[];
  elaborative: { question: string; answer: string }[];
  selfExplanation: { step: string; prompt: string; modelAnswer: string }[];
  guidedProblems: GuidedProblem[];
  feynman: FeynmanRubric;
  palaceSuggestions: { concept: string; image: string }[];
  advanced: { title: string; body: string[] }[];
  sources: Source[];
  videoIds: string[];
  flashcards: { id: string; front: string; back: string }[];
  diagram?: "mitochondrion" | "replication-fork" | "buffer-curve" | "osmosis" | "venturi" | "decay-curve";
}

// ── Assessment ────────────────────────────────────────────────

interface QuestionBase {
  id: string;
  subject: SubjectId;
  topicId: string;
  stem: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
  skill: "concetto" | "calcolo" | "applicazione";
}

export interface McqQuestion extends QuestionBase {
  type: "mcq";
  options: string[];
  correct: number;
}

export interface ClozeQuestion extends QuestionBase {
  type: "cloze";
  /** Accepted answers; compared after normalisation. */
  answers: string[];
  /** Numeric tolerance (relative), when the answer is a number. */
  numericTolerance?: number;
}

export interface OpenQuestion extends QuestionBase {
  type: "open";
  modelAnswer: string;
  keyPoints: string[];
}

export type Question = McqQuestion | ClozeQuestion | OpenQuestion;

// ── Resources ─────────────────────────────────────────────────

export type ResourceKind = "corso" | "videolezione" | "libro" | "piattaforma" | "playlist";

export type CoverMotif =
  | "cell"
  | "mitochondrion"
  | "dna"
  | "molecule"
  | "orbital"
  | "wave"
  | "fluid"
  | "field"
  | "lens"
  | "neuron"
  | "spectrum"
  | "lattice";

export interface Resource {
  id: string;
  title: string;
  /** Italian translation shown when the original title is in another language. */
  titleIt?: string;
  url: string;
  provider: string;
  institution?: string;
  authors?: string[];
  description: string;
  language: "it" | "en" | "fr" | "es" | "de" | "multi";
  level: "introduttivo" | "universitario" | "avanzato";
  kind: ResourceKind;
  duration?: string;
  access: "free" | "premium";
  /** Price exactly as read on the official page on `verifiedOn`. */
  price?: string;
  priceNote?: string;
  subjects: SubjectId[];
  topicTags: string[];
  /** YouTube video id (real thumbnail is used as cover). */
  youtubeId?: string;
  cover?: { motif: CoverMotif; seed: number };
  verifiedOn: string;
  source: "catalogo" | "youtube-api" | "ricerca-web";
}
