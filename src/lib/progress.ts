// Mastery model. Reading a lesson never marks a topic as learned: only retrieval
// evidence (quiz, active recall, Feynman, flashcards) moves mastery upward.

export type TopicStatus = "nuovo" | "in-corso" | "da-consolidare" | "consolidato";

export interface ScoreEntry {
  date: string;
  score: number; // 0..1
}

export interface TopicProgress {
  firstStudied?: string;
  lastStudied?: string;
  minutes: number;
  sectionsRead: string[];
  quiz: ScoreEntry[];
  recall: ScoreEntry[];
}

export const STATUS_LABEL: Record<TopicStatus, string> = {
  nuovo: "Da iniziare",
  "in-corso": "In studio",
  "da-consolidare": "Da consolidare",
  consolidato: "Consolidato",
};

export function emptyProgress(): TopicProgress {
  return { minutes: 0, sectionsRead: [], quiz: [], recall: [] };
}

function recentAverage(entries: ScoreEntry[], n = 3): number | null {
  if (!entries.length) return null;
  const recent = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-n);
  return recent.reduce((s, e) => s + e.score, 0) / recent.length;
}

/**
 * Mastery in [0, 1].
 * - quiz evidence weighs 65%, recall/Feynman evidence 35%;
 * - flashcard retention for the topic (if any) nudges the value by up to ±10%;
 * - evidence older than 21 days decays toward 70% of its value (forgetting).
 */
export function computeMastery(p: TopicProgress | undefined, cardRetention?: number | null, now = new Date()): number {
  if (!p) return 0;
  const quiz = recentAverage(p.quiz);
  const recall = recentAverage(p.recall);
  if (quiz === null && recall === null) return 0;
  let m: number;
  if (quiz !== null && recall !== null) m = 0.65 * quiz + 0.35 * recall;
  else m = (quiz ?? recall ?? 0) * 0.85; // single kind of evidence is less conclusive
  if (cardRetention != null) m = m * 0.9 + cardRetention * 0.1;

  const lastEvidence = [...p.quiz, ...p.recall].map((e) => e.date).sort().at(-1);
  if (lastEvidence) {
    const days = (now.getTime() - new Date(lastEvidence).getTime()) / 86_400_000;
    if (days > 21) m *= Math.max(0.7, 1 - (days - 21) / 100);
  }
  return Math.max(0, Math.min(1, m));
}

export function statusOf(p: TopicProgress | undefined, mastery: number): TopicStatus {
  if (!p || (p.minutes === 0 && !p.sectionsRead.length && !p.quiz.length && !p.recall.length)) return "nuovo";
  const assessed = p.quiz.length > 0 || p.recall.length > 0;
  if (!assessed) return "in-corso";
  const bestQuiz = Math.max(0, ...p.quiz.map((q) => q.score));
  if (mastery >= 0.8 && bestQuiz >= 0.8) return "consolidato";
  if (mastery >= 0.45) return "da-consolidare";
  return "in-corso";
}
