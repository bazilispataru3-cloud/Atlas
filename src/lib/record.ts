"use client";

import { useCallback } from "react";
import type { SubjectId } from "./types";
import { getTopicRef } from "@/data/syllabus";
import { useAtlas, type QuizResult } from "./store";
import type { QuizOutcome } from "@/components/exercises/quiz-runner";

/**
 * Saves a finished quiz and feeds per-topic evidence into the mastery model:
 * each topic gets the share of its own questions answered correctly (blanks count
 * as not known). The time spent is logged as study time, split across topics in
 * proportion to their questions.
 */
export function useRecordQuiz() {
  const saveQuizResult = useAtlas((s) => s.saveQuizResult);
  const recordQuizScore = useAtlas((s) => s.recordQuizScore);
  const logSession = useAtlas((s) => s.logSession);
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

      const perTopic = new Map<string, number>();
      for (const a of o.answers) perTopic.set(a.topicId, (perTopic.get(a.topicId) ?? 0) + 1);
      const start = new Date(Date.now() - o.durationSec * 1000).toISOString();
      for (const [topicId, n] of perTopic) {
        const ref = getTopicRef(topicId);
        if (!ref) continue;
        logSession({ topicId, subject: ref.subject.id, mode: meta.kind === "simulazione" ? "simulazione" : "quiz", start, minutes: (o.durationSec / 60) * (n / o.answers.length) });
      }
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
    [saveQuizResult, recordQuizScore, logSession],
  );
}
