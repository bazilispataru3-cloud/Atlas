// Local (non-AI) analysis of a Feynman explanation against a lesson rubric.
// Deterministic and transparent: it checks concept coverage by keywords,
// misconceptions sentence by sentence, and readability.

import type { FeynmanRubric } from "./types";

export function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[⁺]/g, "+")
    .replace(/[’`]/g, "'")
    .replace(/→/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface LocalFeynmanResult {
  score: number; // 0..100
  covered: { concept: string }[];
  missing: { concept: string; explanation: string }[];
  misconceptions: { sentence: string; correction: string }[];
  avgSentenceWords: number;
  longSentences: number;
  words: number;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Keyword match anchored at a word start ("usa" does not match "causa"); prefixes are allowed. */
export function has(text: string, kw: string) {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(normText(kw))}`).test(text);
}

/** Exclusions: "non" must be a whole word (so "nonostante" does not count). */
function excludedBy(text: string, kw: string) {
  const k = normText(kw);
  return k === "non" ? /(^|[^a-z0-9])non($|[^a-z0-9])/.test(text) : has(text, k);
}

export function analyzeFeynman(text: string, rubric: FeynmanRubric): LocalFeynmanResult {
  const t = normText(text);
  const covered: LocalFeynmanResult["covered"] = [];
  const missing: LocalFeynmanResult["missing"] = [];
  for (const e of rubric.essentials) {
    const ok = e.keywords.every((group) => group.some((kw) => has(t, kw)));
    if (ok) covered.push({ concept: e.concept });
    else missing.push({ concept: e.concept, explanation: e.explanation });
  }

  const sentences = text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const misconceptions: LocalFeynmanResult["misconceptions"] = [];
  for (const s of sentences) {
    const ns = normText(s);
    for (const m of rubric.misconceptions) {
      const triggered = m.triggers.every((group) => group.some((kw) => has(ns, kw)));
      const excluded = (m.excludes ?? []).some((kw) => excludedBy(ns, kw));
      if (triggered && !excluded && !misconceptions.some((x) => x.correction === m.correction)) {
        misconceptions.push({ sentence: s, correction: m.correction });
      }
    }
  }

  const wordsPer = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const words = wordsPer.reduce((a, b) => a + b, 0);
  const avg = sentences.length ? words / sentences.length : 0;
  const longSentences = wordsPer.filter((n) => n > 30).length;

  const coverage = rubric.essentials.length ? covered.length / rubric.essentials.length : 0;
  let score = coverage * 85 + (avg > 0 && avg <= 25 ? 15 : avg <= 32 ? 8 : 0);
  score -= misconceptions.length * 12;
  if (words < 40) score -= 15;
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    covered,
    missing,
    misconceptions,
    avgSentenceWords: Math.round(avg * 10) / 10,
    longSentences,
    words,
  };
}
