import { allTopicRefs } from "@/data/syllabus";
import type { TopicRef } from "./types";

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["il", "lo", "la", "i", "gli", "le", "di", "del", "della", "dei", "delle", "e", "ed", "a", "in", "un", "una", "per", "con", "da", "the", "of", "and"]);

export function tokens(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Lightweight lexical ranking over the syllabus (title ≫ keywords ≫ official text). */
export function searchTopics(query: string, limit = 8): { ref: TopicRef; score: number }[] {
  const q = tokens(query);
  if (!q.length) return [];
  const results: { ref: TopicRef; score: number }[] = [];
  for (const ref of allTopicRefs()) {
    const title = norm(ref.topic.title);
    const kw = norm((ref.topic.keywords ?? []).join(" "));
    const body = norm(ref.topic.syllabusText + " " + ref.chapter.title + " " + ref.unit.title);
    let score = 0;
    for (const t of q) {
      if (title.includes(t)) score += 6;
      if (kw.includes(t)) score += 4;
      if (body.includes(t)) score += 1.5;
      if (t.length >= 5 && body.includes(t.slice(0, -1))) score += 0.5;
    }
    if (norm(query).length > 3 && title.includes(norm(query))) score += 8;
    if (score > 0) results.push({ ref, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
