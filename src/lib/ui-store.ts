"use client";

import { create } from "zustand";
import type { StudyMode, SubjectId } from "./types";

interface UIState {
  startStudyOpen: boolean;
  startStudyPreset: { subject?: SubjectId; topicId?: string; mode?: StudyMode } | null;
  professorOpen: boolean;
  professorContext: { topicId?: string; prompt?: string; docId?: string } | null;
  moreOpen: boolean;
  /** Exam simulations and review sessions: the shell hides navigation so nothing pulls the student away. */
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  openStartStudy: (preset?: UIState["startStudyPreset"]) => void;
  closeStartStudy: () => void;
  openProfessor: (ctx?: UIState["professorContext"]) => void;
  closeProfessor: () => void;
  setMoreOpen: (v: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  startStudyOpen: false,
  startStudyPreset: null,
  professorOpen: false,
  professorContext: null,
  moreOpen: false,
  focusMode: false,
  setFocusMode: (v) => set({ focusMode: v, moreOpen: false }),
  openStartStudy: (preset = null) => set({ startStudyOpen: true, startStudyPreset: preset, moreOpen: false }),
  closeStartStudy: () => set({ startStudyOpen: false }),
  openProfessor: (ctx = null) => set({ professorOpen: true, professorContext: ctx, moreOpen: false }),
  closeProfessor: () => set({ professorOpen: false }),
  setMoreOpen: (v) => set({ moreOpen: v }),
}));
