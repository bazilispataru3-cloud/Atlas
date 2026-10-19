"use client";

import { useCallback } from "react";
import type { SubjectId } from "./types";
import { useAtlas, type QuizResult } from "./store";
import type { QuizOutcome } from "@/components/exercises/quiz-runner";

/**
 * Saves a finished quiz and feeds per-topic evidence into the mastery model:
 * each topic gets the share of its own questions answered correctly (blanks count
 * as not known).
 */
export function useRecordQuiz() {
  const saveQuizResult = useAtlas((s) => s.saveQuizResult);
  const recordQuizScore = useAtlas((s) => s.recordQuizScore);
  return useCallback(
    (o: QuizOutcome, meta: { kind: QuizResult["kind"]; title: string; subject?: SubjectId }) => {
      const byTopic = new Map<string, { ok: number; n: number }>();
      for (const a of o.answers) {
        const blank = a.given === null || a.given === "";
        if (a.correct === null && !blank) continue; // ungraded open answers carry no evidence
        const t = byTopic.get(a.topicId) ?? { ok: 0, n: 0 };
        t.n += 1;
        if (a.correct) t.ok += 1;
        byTopic.set(a.topicId, t);
      }
      for (const [topicId, t] of byTopic) recordQuizScore(topicId, t.ok / t.n);
      return saveQuizResult({
        kind: meta.kind,
        date: new Date().toISOString(),
        subject: meta.subject,
        title: meta.title,
        correct: o.correct,
        wrong: o.wrong,
        blank: o.blank,
        total: o.total,
        score: o.score,
        maxScore: o.maxScore,
        durationSec: o.durationSec,
        answers: o.answers,
      });
    },
    [saveQuizResult, recordQuizScore],
  );
}
