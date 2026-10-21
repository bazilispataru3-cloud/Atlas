import type { Question, SubjectId } from "@/lib/types";
import { normalizeAnswer, parseNumber, shuffle } from "@/lib/utils";
import { BIO_QUESTIONS } from "./biologia";
import { CHEM_QUESTIONS } from "./chimica";
import { PHYS_QUESTIONS } from "./fisica";

export const QUESTIONS: Question[] = [...BIO_QUESTIONS, ...CHEM_QUESTIONS, ...PHYS_QUESTIONS];

export function questionsFor(opts: { subject?: SubjectId; topicIds?: string[]; types?: Question["type"][] } = {}): Question[] {
  return QUESTIONS.filter(
    (q) =>
      (!opts.subject || q.subject === opts.subject) &&
      (!opts.topicIds || opts.topicIds.includes(q.topicId)) &&
      (!opts.types || opts.types.includes(q.type)),
  );
}

/** A question as presented: MCQ options shuffled with a stable mapping. */
export interface PresentedQuestion {
  q: Question;
  order: number[]; // order[i] = index in q.options shown at position i
}

export function present(qs: Question[], seed?: number): PresentedQuestion[] {
  return qs.map((q, i) => ({
    q,
    order: q.type === "mcq" ? shuffle(q.options.map((_, k) => k), (seed ?? Date.now()) + i * 7919) : [],
  }));
}

/** Grades an answer. Returns null for open questions (self- or AI-assessed). */
export function grade(q: Question, given: string | number | null | undefined): boolean | null {
  if (given === null || given === undefined || given === "") return null;
  if (q.type === "mcq") return Number(given) === q.correct;
  if (q.type === "cloze") {
    const g = normalizeAnswer(String(given));
    if (q.numericTolerance !== undefined) {
      const n = parseNumber(String(given));
      const target = parseNumber(q.answers[0]);
      if (n !== null && target !== null) {
        const tol = Math.abs(target) * q.numericTolerance || q.numericTolerance;
        return Math.abs(n - target) <= tol;
      }
    }
    return q.answers.some((a) => normalizeAnswer(a) === g || g.replace(/\s/g, "") === normalizeAnswer(a).replace(/\s/g, ""));
  }
  return null;
}

export function correctAnswerText(q: Question): string {
  if (q.type === "mcq") return q.options[q.correct];
  if (q.type === "cloze") return q.answers[0];
  return q.modelAnswer;
}

export const QUESTION_TYPE_LABEL: Record<Question["type"], string> = {
  mcq: "Risposta multipla",
  cloze: "Completamento",
  open: "Domanda aperta",
};
