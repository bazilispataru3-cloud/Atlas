"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ExplanationLevel, StudyMode, SubjectId } from "./types";
import { emptyProgress, type TopicProgress } from "./progress";
import { newSrsState, review as srsReview, type Rating, type SrsState } from "./srs";
import type { PlanConfig, PlanItem } from "./planner";
import { uid } from "./utils";

// ── Entities ──────────────────────────────────────────────────

export interface Profile {
  name: string;
  university: string;
  examTarget: "appello-1" | "appello-2";
  dailyGoalMinutes: number;
  levels: Record<SubjectId, "base" | "intermedio" | "avanzato">;
  onboarded: boolean;
}

export interface Settings {
  reduceMotion: boolean;
  explanationLevel: ExplanationLevel;
  showAdvanced: boolean;
}

export interface StudySession {
  id: string;
  topicId: string;
  subject: SubjectId;
  mode: StudyMode | "ripasso" | "quiz" | "flashcard" | "simulazione" | "academy";
  start: string;
  minutes: number;
}

export interface FlashCard {
  id: string;
  front: string;
  back: string;
  subject?: SubjectId;
  topicId?: string;
  deck: string;
  origin: "atlas" | "manuale" | "ai" | "documento";
  createdAt: string;
  srs: SrsState;
  suspended?: boolean;
}

export interface CardReview {
  cardId: string;
  date: string;
  rating: Rating;
  elapsedDays: number;
}

export interface QuizAnswerRecord {
  questionId: string;
  topicId: string;
  given: string | number | null;
  correct: boolean | null;
  timeSec?: number;
}

export interface QuizResult {
  id: string;
  kind: "quiz" | "simulazione" | "sessione";
  date: string;
  subject?: SubjectId;
  title: string;
  correct: number;
  wrong: number;
  blank: number;
  total: number;
  score: number;
  maxScore: number;
  durationSec: number;
  answers: QuizAnswerRecord[];
}

export interface CornellNote {
  cues: string;
  notes: string;
  summary: string;
  updatedAt: string;
}

export interface Palace {
  id: string;
  name: string;
  topicId?: string;
  createdAt: string;
  placements: { locusId: string; concept: string; image: string }[];
  walks: { date: string; recalled: number; total: number }[];
}

export interface FeynmanAttempt {
  id: string;
  topicId: string;
  date: string;
  text: string;
  score: number;
  analysis: "ai" | "locale";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  meta?: { level?: ExplanationLevel; topicId?: string; offline?: boolean; citations?: { doc: string; page: number }[] };
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface LibraryDoc {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: "pdf" | "testo" | "audio" | "altro";
  addedAt: string;
  subject?: SubjectId;
  pages?: number;
  sourceUrl?: string;
  consent: boolean;
  bookmarks: number[];
  highlights: { id: string; page: number; text: string; color: "azure" | "gold" | "rose"; note?: string; createdAt: string }[];
  lastPage?: number;
  textIndexed?: boolean;
}

// ── State ─────────────────────────────────────────────────────

interface AtlasState {
  profile: Profile;
  settings: Settings;
  progress: Record<string, TopicProgress>;
  sessions: StudySession[];
  cards: FlashCard[];
  cardReviews: CardReview[];
  quizResults: QuizResult[];
  favorites: string[];
  plannedResources: { resourceId: string; addedAt: string; title: string; url: string }[];
  plan: { config: PlanConfig; items: PlanItem[]; generatedAt: string } | null;
  planDone: string[];
  cornell: Record<string, CornellNote>;
  palaces: Palace[];
  feynman: FeynmanAttempt[];
  chats: ChatThread[];
  library: LibraryDoc[];
  demo: boolean;

  // profile & settings
  updateProfile: (p: Partial<Profile>) => void;
  updateSettings: (s: Partial<Settings>) => void;

  // study tracking
  logSession: (s: Omit<StudySession, "id">) => void;
  markSectionRead: (topicId: string, sectionId: string) => void;
  addTopicMinutes: (topicId: string, minutes: number) => void;
  recordQuizScore: (topicId: string, score: number) => void;
  recordRecallScore: (topicId: string, score: number) => void;

  // flashcards
  addCards: (cards: Omit<FlashCard, "id" | "createdAt" | "srs">[]) => number;
  updateCard: (id: string, patch: Partial<Pick<FlashCard, "front" | "back" | "deck" | "suspended">>) => void;
  deleteCard: (id: string) => void;
  reviewCard: (id: string, rating: Rating) => void;

  // quiz
  saveQuizResult: (r: Omit<QuizResult, "id">) => string;

  // resources
  toggleFavorite: (resourceId: string) => void;
  addResourceToPlan: (r: { resourceId: string; title: string; url: string }) => void;
  removeResourceFromPlan: (resourceId: string) => void;

  // planner
  setPlan: (config: PlanConfig, items: PlanItem[]) => void;
  togglePlanItem: (id: string) => void;
  clearPlan: () => void;

  // notes & techniques
  saveCornell: (topicId: string, note: Omit<CornellNote, "updatedAt">) => void;
  savePalace: (p: Palace) => void;
  deletePalace: (id: string) => void;
  recordPalaceWalk: (id: string, recalled: number, total: number) => void;
  addFeynman: (a: Omit<FeynmanAttempt, "id" | "date">) => void;

  // chat
  upsertChat: (thread: ChatThread) => void;
  deleteChat: (id: string) => void;

  // library
  addDoc: (d: LibraryDoc) => void;
  updateDoc: (id: string, patch: Partial<LibraryDoc>) => void;
  removeDoc: (id: string) => void;

  // data management
  loadDemo: (data: Partial<AtlasState>) => void;
  clearDemo: () => void;
  importData: (data: Partial<AtlasState>) => void;
  resetAll: () => void;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  university: "",
  examTarget: "appello-1",
  dailyGoalMinutes: 180,
  levels: { biologia: "intermedio", chimica: "intermedio", fisica: "intermedio" },
  onboarded: false,
};

const initialData = () => ({
  profile: DEFAULT_PROFILE,
  settings: { reduceMotion: false, explanationLevel: "universitario" as ExplanationLevel, showAdvanced: true },
  progress: {} as Record<string, TopicProgress>,
  sessions: [] as StudySession[],
  cards: [] as FlashCard[],
  cardReviews: [] as CardReview[],
  quizResults: [] as QuizResult[],
  favorites: [] as string[],
  plannedResources: [] as AtlasState["plannedResources"],
  plan: null as AtlasState["plan"],
  planDone: [] as string[],
  cornell: {} as Record<string, CornellNote>,
  palaces: [] as Palace[],
  feynman: [] as FeynmanAttempt[],
  chats: [] as ChatThread[],
  library: [] as LibraryDoc[],
  demo: false,
});

function touchProgress(state: AtlasState, topicId: string, fn: (p: TopicProgress) => TopicProgress) {
  const now = new Date().toISOString();
  const current = state.progress[topicId] ?? emptyProgress();
  const next = fn({ ...current });
  next.firstStudied = next.firstStudied ?? now;
  next.lastStudied = now;
  return { progress: { ...state.progress, [topicId]: next } };
}

export const useAtlas = create<AtlasState>()(
  persist(
    (set, get) => ({
      ...initialData(),

      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      updateSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      logSession: (session) => {
        if (session.minutes < 0.5) return;
        set((s) => ({
          sessions: [...s.sessions, { ...session, id: uid("ses"), minutes: Math.round(session.minutes * 10) / 10 }],
          ...touchProgress(s, session.topicId, (p) => ({ ...p, minutes: p.minutes + session.minutes })),
        }));
      },
      markSectionRead: (topicId, sectionId) =>
        set((s) =>
          touchProgress(s, topicId, (p) => ({
            ...p,
            sectionsRead: p.sectionsRead.includes(sectionId) ? p.sectionsRead : [...p.sectionsRead, sectionId],
          })),
        ),
      addTopicMinutes: (topicId, minutes) =>
        set((s) => touchProgress(s, topicId, (p) => ({ ...p, minutes: p.minutes + minutes }))),
      recordQuizScore: (topicId, score) =>
        set((s) =>
          touchProgress(s, topicId, (p) => ({ ...p, quiz: [...p.quiz, { date: new Date().toISOString(), score }] })),
        ),
      recordRecallScore: (topicId, score) =>
        set((s) =>
          touchProgress(s, topicId, (p) => ({ ...p, recall: [...p.recall, { date: new Date().toISOString(), score }] })),
        ),

      addCards: (cards) => {
        const existing = new Set(get().cards.map((c) => `${c.topicId ?? ""}|${c.front.trim().toLowerCase()}`));
        const now = new Date();
        const fresh = cards
          .filter((c) => !existing.has(`${c.topicId ?? ""}|${c.front.trim().toLowerCase()}`))
          .map((c) => ({ ...c, id: uid("card"), createdAt: now.toISOString(), srs: newSrsState(now) }));
        if (fresh.length) set((s) => ({ cards: [...s.cards, ...fresh] }));
        return fresh.length;
      },
      updateCard: (id, patch) => set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCard: (id) =>
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id), cardReviews: s.cardReviews.filter((r) => r.cardId !== id) })),
      reviewCard: (id, rating) =>
        set((s) => {
          const now = new Date();
          const card = s.cards.find((c) => c.id === id);
          if (!card) return {};
          const elapsedDays = card.srs.last ? (now.getTime() - new Date(card.srs.last).getTime()) / 86_400_000 : 0;
          return {
            cards: s.cards.map((c) => (c.id === id ? { ...c, srs: srsReview(c.srs, rating, now) } : c)),
            cardReviews: [...s.cardReviews, { cardId: id, date: now.toISOString(), rating, elapsedDays }],
          };
        }),

      saveQuizResult: (r) => {
        const id = uid("res");
        set((s) => ({ quizResults: [...s.quizResults, { ...r, id }] }));
        return id;
      },

      toggleFavorite: (resourceId) =>
        set((s) => ({
          favorites: s.favorites.includes(resourceId)
            ? s.favorites.filter((f) => f !== resourceId)
            : [...s.favorites, resourceId],
        })),
      addResourceToPlan: (r) =>
        set((s) =>
          s.plannedResources.some((p) => p.resourceId === r.resourceId)
            ? {}
            : { plannedResources: [...s.plannedResources, { ...r, addedAt: new Date().toISOString() }] },
        ),
      removeResourceFromPlan: (resourceId) =>
        set((s) => ({ plannedResources: s.plannedResources.filter((p) => p.resourceId !== resourceId) })),

      setPlan: (config, items) => set({ plan: { config, items, generatedAt: new Date().toISOString() } }),
      togglePlanItem: (id) =>
        set((s) => ({ planDone: s.planDone.includes(id) ? s.planDone.filter((x) => x !== id) : [...s.planDone, id] })),
      clearPlan: () => set({ plan: null, planDone: [] }),

      saveCornell: (topicId, note) =>
        set((s) => ({ cornell: { ...s.cornell, [topicId]: { ...note, updatedAt: new Date().toISOString() } } })),
      savePalace: (p) =>
        set((s) => ({ palaces: s.palaces.some((x) => x.id === p.id) ? s.palaces.map((x) => (x.id === p.id ? p : x)) : [...s.palaces, p] })),
      deletePalace: (id) => set((s) => ({ palaces: s.palaces.filter((p) => p.id !== id) })),
      recordPalaceWalk: (id, recalled, total) =>
        set((s) => ({
          palaces: s.palaces.map((p) =>
            p.id === id ? { ...p, walks: [...p.walks, { date: new Date().toISOString(), recalled, total }] } : p,
          ),
        })),
      addFeynman: (a) =>
        set((s) => ({ feynman: [...s.feynman, { ...a, id: uid("fey"), date: new Date().toISOString() }] })),

      upsertChat: (thread) =>
        set((s) => ({
          chats: s.chats.some((c) => c.id === thread.id)
            ? s.chats.map((c) => (c.id === thread.id ? thread : c))
            : [thread, ...s.chats],
        })),
      deleteChat: (id) => set((s) => ({ chats: s.chats.filter((c) => c.id !== id) })),

      addDoc: (d) => set((s) => ({ library: [d, ...s.library] })),
      updateDoc: (id, patch) => set((s) => ({ library: s.library.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDoc: (id) => set((s) => ({ library: s.library.filter((d) => d.id !== id) })),

      loadDemo: (data) => set((s) => ({ ...s, ...data, demo: true })),
      clearDemo: () => set((s) => ({ ...initialData(), profile: { ...s.profile }, settings: s.settings, library: s.library })),
      importData: (data) => set((s) => ({ ...s, ...data })),
      resetAll: () => set({ ...initialData() }),
    }),
    {
      name: "atlas-study-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // Functions are not persisted; everything else is plain data.
        const { profile, settings, progress, sessions, cards, cardReviews, quizResults, favorites, plannedResources, plan, planDone, cornell, palaces, feynman, chats, library, demo } = s;
        return { profile, settings, progress, sessions, cards, cardReviews, quizResults, favorites, plannedResources, plan, planDone, cornell, palaces, feynman, chats, library, demo };
      },
    },
  ),
);

export type { AtlasState };

/** Keys that make up a portable export of the user's data. */
export const EXPORT_KEYS = [
  "profile",
  "settings",
  "progress",
  "sessions",
  "cards",
  "cardReviews",
  "quizResults",
  "favorites",
  "plannedResources",
  "plan",
  "planDone",
  "cornell",
  "palaces",
  "feynman",
  "chats",
  "library",
] as const;
