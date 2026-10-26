import { describe, expect, it } from "vitest";
import { describeInterval, isDue, maturity, newSrsState, nextInterval, review } from "@/lib/srs";
import { EXAM_RULES, scoreExam } from "@/data/exam";
import { grade, present, QUESTIONS } from "@/data/questions";
import { analyzeFeynman } from "@/lib/feynman";
import { computeMastery, emptyProgress, statusOf } from "@/lib/progress";
import { addDays, cn, dayKey, normalizeAnswer, parseNumber, shuffle, startOfDay, toDate } from "@/lib/utils";
import type { FeynmanRubric, Question } from "@/lib/types";

describe("spaced repetition (SM-2 derived)", () => {
  const t0 = new Date(2026, 9, 19, 15, 0);

  it("schedules a new card at 1 / 4 days and lapses it to a 10-minute step", () => {
    const s = newSrsState(t0);
    // "Difficile" on a new card keeps it in learning (back in this session), so it never equals "Buono".
    expect(nextInterval(s, 2)).toBe(0);
    const hard = review(s, 2, t0);
    expect(hard.lapses).toBe(0);
    expect(new Date(hard.due).getTime() - t0.getTime()).toBe(10 * 60_000);
    expect(nextInterval(s, 3)).toBe(1);
    expect(nextInterval(s, 4)).toBe(4);
    const again = review(s, 1, t0);
    expect(again.interval).toBe(0);
    expect(again.lapses).toBe(1);
    expect(new Date(again.due).getTime() - t0.getTime()).toBe(10 * 60_000);
  });

  it("grows intervals with ease and never lets ease drop below 1.3", () => {
    let s = newSrsState(t0);
    s = review(s, 3, t0); // 1 day
    s = review(s, 3, addDays(t0, 1)); // 3 days
    expect(s.interval).toBe(3);
    s = review(s, 3, addDays(t0, 4));
    expect(s.interval).toBeGreaterThan(3);
    let hard = newSrsState(t0);
    for (let i = 0; i < 20; i++) hard = review(hard, 1, t0);
    expect(hard.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("makes reviews due at 04:00 local time of the target day", () => {
    const s = review(newSrsState(t0), 3, t0);
    const due = new Date(s.due);
    expect(due.getHours()).toBe(4);
    expect(dayKey(due)).toBe(dayKey(addDays(t0, 1)));
    expect(isDue(s, addDays(t0, 1))).toBe(true);
    expect(isDue(s, t0)).toBe(false);
  });

  it("describes intervals and maturity", () => {
    expect(describeInterval(0)).toBe("10 min");
    expect(describeInterval(1)).toBe("1 giorno");
    expect(describeInterval(45)).toBe("2 mesi");
    expect(maturity(newSrsState(t0))).toBe("nuova");
    expect(maturity({ ...newSrsState(t0), interval: 30, reps: 5, last: t0.toISOString() })).toBe("matura");
  });
});

describe("official exam scoring (D.M. 941/2026)", () => {
  it("uses +1 / 0 / −0.1 and an 18/30 threshold", () => {
    expect(EXAM_RULES.questionsPerExam).toBe(EXAM_RULES.multipleChoice + EXAM_RULES.completion);
    expect(scoreExam(18, 0)).toMatchObject({ raw: 18, passed: true, careerGrade: 18, lode: false });
    expect(scoreExam(18, 5)).toMatchObject({ raw: 17.5, passed: false, careerGrade: null });
    expect(scoreExam(25, 6)).toMatchObject({ raw: 24.4, passed: true, careerGrade: 24 });
  });

  it("awards lode only with every answer correct and caps the grade at 30", () => {
    expect(scoreExam(31, 0)).toMatchObject({ raw: 31, lode: true, careerGrade: 30 });
    expect(scoreExam(30, 1).lode).toBe(false);
  });
});

describe("answer grading", () => {
  const cloze: Question = { id: "t1", type: "cloze", subject: "fisica", topicId: "fis-idrodinamica", stem: "", answers: ["Bernoulli"], explanation: "", difficulty: 1, skill: "concetto" };
  const numeric: Question = { ...cloze, id: "t2", answers: ["0,3"], numericTolerance: 0.05 } as Question;

  it("ignores case, accents and spacing in completion answers", () => {
    expect(grade(cloze, "  BERNOULLI ")).toBe(true);
    expect(grade(cloze, "Torricelli")).toBe(false);
    expect(grade(cloze, "")).toBeNull();
    expect(normalizeAnswer("Pàscal")).toBe("pascal");
    expect(normalizeAnswer("H₂O")).toBe("h2o");
  });

  it("accepts numbers within tolerance in Italian or English format", () => {
    expect(parseNumber("0,3")).toBe(0.3);
    expect(parseNumber("2·10^3")).toBe(2000);
    expect(grade(numeric, "0.30")).toBe(true);
    expect(grade(numeric, "0,31")).toBe(true);
    expect(grade(numeric, "0,4")).toBe(false);
  });

  it("keeps the correct option reachable after shuffling", () => {
    const mcqs = QUESTIONS.filter((q) => q.type === "mcq").slice(0, 20);
    for (const p of present(mcqs, 42)) {
      if (p.q.type !== "mcq") continue;
      const shownIndex = p.order.indexOf(p.q.correct);
      expect(grade(p.q, p.order[shownIndex])).toBe(true);
      expect([...p.order].sort()).toEqual([0, 1, 2, 3, 4]);
    }
  });
});

describe("local Feynman analysis", () => {
  const rubric: FeynmanRubric = {
    essentials: [
      { concept: "Uso dell’ossigeno", keywords: [["usa", "utilizza"], ["ossigeno"]], explanation: "" },
      { concept: "Gradiente protonico", keywords: [["gradiente"], ["protoni", "h+"]], explanation: "" },
    ],
    misconceptions: [{ id: "m1", triggers: [["glicolisi"], ["mitocondri"]], excludes: ["non"], correction: "La glicolisi avviene nel citosol." }],
  };

  it("matches keywords at word starts only", () => {
    // "causa" contains "usa" but must not count as "usa".
    const r = analyzeFeynman("La causa è l’ossigeno.", rubric);
    expect(r.covered.map((c) => c.concept)).not.toContain("Uso dell’ossigeno");
    const ok = analyzeFeynman("La cellula usa l’ossigeno. Si forma un gradiente di protoni.", rubric);
    expect(ok.covered).toHaveLength(2);
  });

  it("flags misconceptions unless negated with a whole-word «non»", () => {
    expect(analyzeFeynman("La glicolisi avviene nei mitocondri.", rubric).misconceptions).toHaveLength(1);
    expect(analyzeFeynman("La glicolisi non avviene nei mitocondri.", rubric).misconceptions).toHaveLength(0);
    expect(analyzeFeynman("Nonostante tutto, la glicolisi avviene nei mitocondri.", rubric).misconceptions).toHaveLength(1);
  });
});

describe("mastery model", () => {
  it("does not count reading as learning", () => {
    const p = { ...emptyProgress(), minutes: 120, sectionsRead: ["a", "b", "c"] };
    expect(computeMastery(p)).toBe(0);
    expect(statusOf(p, 0)).toBe("in-corso");
  });

  it("requires strong quiz evidence to mark a topic as consolidated", () => {
    const now = new Date();
    const d = now.toISOString();
    const strong = { ...emptyProgress(), quiz: [{ date: d, score: 0.9 }], recall: [{ date: d, score: 0.9 }] };
    expect(statusOf(strong, computeMastery(strong, null, now))).toBe("consolidato");
    const recallOnly = { ...emptyProgress(), recall: [{ date: d, score: 1 }] };
    expect(statusOf(recallOnly, computeMastery(recallOnly, null, now))).not.toBe("consolidato");
  });

  it("decays old evidence", () => {
    const old = addDays(new Date(), -80).toISOString();
    const p = { ...emptyProgress(), quiz: [{ date: old, score: 0.9 }], recall: [{ date: old, score: 0.9 }] };
    expect(computeMastery(p)).toBeLessThan(0.9);
  });
});

describe("date and utility helpers", () => {
  it("reads yyyy-mm-dd as a local calendar day", () => {
    const d = toDate("2026-12-10");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 10, 0]);
    expect(dayKey("2026-12-10")).toBe("2026-12-10");
    expect(dayKey(startOfDay("2026-01-01"))).toBe("2026-01-01");
  });

  it("shuffles deterministically with a seed", () => {
    const a = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(a, 7)).toEqual(shuffle(a, 7));
    expect([...shuffle(a, 7)].sort((x, y) => x - y)).toEqual(a);
  });
});

describe("class merging with the design tokens", () => {
  it("keeps custom sizes next to text colours", () => {
    expect(cn("text-ui text-fg-muted")).toBe("text-ui text-fg-muted");
    expect(cn("text-reading", "text-fg")).toBe("text-reading text-fg");
  });
  it("still lets a later size or radius win", () => {
    expect(cn("text-ui", "text-sm")).toBe("text-sm");
    expect(cn("rounded-card", "rounded-lg")).toBe("rounded-lg");
  });
});
