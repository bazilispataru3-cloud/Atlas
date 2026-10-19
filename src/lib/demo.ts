// Demo dataset: lets a new user see a populated dashboard. Every screen shows
// a "Dati dimostrativi" badge while it is active and it can be removed at any time.

import { LESSONS } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import type { AtlasState, CardReview, FlashCard, QuizResult, StudySession } from "./store";
import type { TopicProgress } from "./progress";
import { newSrsState, review, type Rating } from "./srs";
import { addDays, uid } from "./utils";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const STUDIED: { topicId: string; quiz: number[]; recall: number[] }[] = [
  { topicId: "bio-mitocondri", quiz: [0.6, 0.8, 0.9], recall: [0.7, 0.85] },
  { topicId: "bio-replicazione-dna", quiz: [0.7, 0.75], recall: [0.6] },
  { topicId: "bio-membrane", quiz: [0.9], recall: [0.8] },
  { topicId: "bio-trasporto-membrana", quiz: [0.5], recall: [] },
  { topicId: "bio-traduzione", quiz: [0.6], recall: [0.5] },
  { topicId: "bio-mendel", quiz: [0.85, 0.9], recall: [0.9] },
  { topicId: "chim-tamponi", quiz: [0.55, 0.7], recall: [0.6] },
  { topicId: "chim-osmosi", quiz: [0.8, 0.85], recall: [0.8] },
  { topicId: "chim-acidi-basi", quiz: [0.9], recall: [0.85] },
  { topicId: "chim-legame", quiz: [0.4], recall: [] },
  { topicId: "fis-idrodinamica", quiz: [0.5, 0.65], recall: [0.55] },
  { topicId: "fis-cinematica", quiz: [0.9, 0.95], recall: [0.9] },
  { topicId: "fis-dinamica", quiz: [0.7], recall: [] },
  { topicId: "fis-radioattivita", quiz: [], recall: [] },
];

export function buildDemoData(now = new Date()): Partial<AtlasState> {
  const rand = rng(20261019);
  const progress: Record<string, TopicProgress> = {};
  const sessions: StudySession[] = [];

  STUDIED.forEach((s, i) => {
    const ref = getTopicRef(s.topicId);
    if (!ref) return;
    const first = addDays(now, -12 + Math.floor(i / 2));
    const quiz = s.quiz.map((score, k) => ({ date: addDays(first, k * 2 + 1).toISOString(), score }));
    const recall = s.recall.map((score, k) => ({ date: addDays(first, k * 3 + 1).toISOString(), score }));
    let minutes = 0;
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const start = addDays(first, k * 2);
      start.setHours(9 + Math.floor(rand() * 9), Math.floor(rand() * 60));
      if (start > now) continue;
      const m = 20 + Math.round(rand() * 55);
      minutes += m;
      sessions.push({ id: uid("ses"), topicId: s.topicId, subject: ref.subject.id, mode: (["fast", "deep", "ultra"] as const)[Math.floor(rand() * 3)], start: start.toISOString(), minutes: m });
    }
    progress[s.topicId] = {
      firstStudied: first.toISOString(),
      lastStudied: addDays(first, 3).toISOString(),
      minutes,
      sectionsRead: ["intro", "struttura"],
      quiz,
      recall,
    };
  });

  // Today's and yesterday's sessions so "ore oggi" is not empty.
  const today = new Date(now);
  today.setHours(Math.max(8, now.getHours() - 2), 10, 0, 0);
  sessions.push({ id: uid("ses"), topicId: "bio-mitocondri", subject: "biologia", mode: "deep", start: today.toISOString(), minutes: 48 });
  sessions.push({ id: uid("ses"), topicId: "chim-tamponi", subject: "chimica", mode: "fast", start: addDays(today, -1).toISOString(), minutes: 35 });

  // Flashcards from three lessons, with realistic review histories.
  const cards: FlashCard[] = [];
  const cardReviews: CardReview[] = [];
  for (const lesson of LESSONS.slice(0, 4)) {
    const ref = getTopicRef(lesson.topicId);
    lesson.flashcards.forEach((f, idx) => {
      let srs = newSrsState(addDays(now, -10));
      const id = uid("card");
      const reviewsCount = idx % 4;
      let t = addDays(now, -10 + idx % 3);
      for (let r = 0; r < reviewsCount; r++) {
        const rating = (rand() < 0.2 ? 2 : rand() < 0.8 ? 3 : 4) as Rating;
        srs = review(srs, rating, t);
        cardReviews.push({ cardId: id, date: t.toISOString(), rating, elapsedDays: r === 0 ? 0 : 2 });
        t = new Date(srs.due);
        if (t > now) break;
      }
      // Make a handful due today.
      if (idx % 3 === 0) srs = { ...srs, due: addDays(now, -1).toISOString() };
      cards.push({
        id,
        front: f.front,
        back: f.back,
        subject: ref?.subject.id,
        topicId: lesson.topicId,
        deck: ref?.topic.title ?? "ATLAS",
        origin: "atlas",
        createdAt: addDays(now, -10).toISOString(),
        srs,
      });
    });
  }

  const quizResults: QuizResult[] = [
    mkResult("quiz", "Quiz · Mitocondri e respirazione", "biologia", 8, 2, 0, addDays(now, -6)),
    mkResult("quiz", "Quiz · Tamponi", "chimica", 6, 3, 1, addDays(now, -5)),
    mkResult("quiz", "Quiz · Idrodinamica", "fisica", 5, 4, 1, addDays(now, -3)),
    mkResult("simulazione", "Simulazione · Biologia", "biologia", 22, 6, 3, addDays(now, -4), true),
    mkResult("simulazione", "Simulazione · Chimica", "chimica", 17, 9, 5, addDays(now, -2), true),
    mkResult("simulazione", "Simulazione · Fisica", "fisica", 19, 7, 5, addDays(now, -1), true),
  ];

  return {
    progress,
    sessions,
    cards,
    cardReviews,
    quizResults,
    favorites: ["mit-7016", "openstax-chem2e", "yt-juM2ROSLWfw"],
  };
}

function mkResult(kind: QuizResult["kind"], title: string, subject: QuizResult["subject"], correct: number, wrong: number, blank: number, date: Date, sim = false): QuizResult {
  const total = correct + wrong + blank;
  const score = sim ? Math.round((correct - wrong * 0.1) * 10) / 10 : correct;
  return {
    id: uid("res"),
    kind,
    date: date.toISOString(),
    subject,
    title,
    correct,
    wrong,
    blank,
    total,
    score,
    maxScore: sim ? 31 : total,
    durationSec: sim ? 50 * 60 - 120 : total * 55,
    answers: [],
  };
}
