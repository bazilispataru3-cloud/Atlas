import { describe, expect, it } from "vitest";
import { allTopicRefs, getTopicRef, SUBJECTS, topicWeight } from "@/data/syllabus";
import { QUESTIONS } from "@/data/questions";
import { LESSONS } from "@/data/lessons";
import { getResource, RESOURCES } from "@/data/resources";
import { TECHNIQUES } from "@/data/academy";
import { EXAM_DATES } from "@/data/exam";

describe("official syllabus model", () => {
  it("has unique topic ids and 6 CFU per subject", () => {
    const ids = allTopicRefs().map((r) => r.topic.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SUBJECTS) {
      const cfu = s.units.reduce((a, u) => a + u.cfu, 0);
      expect(cfu).toBeCloseTo(6, 5);
      expect(s.cfu).toBe(6);
    }
  });

  it("splits each unit’s CFU across its topics", () => {
    for (const s of SUBJECTS) {
      const total = allTopicRefs()
        .filter((r) => r.subject.id === s.id)
        .reduce((a, r) => a + topicWeight(r), 0);
      expect(total).toBeCloseTo(6, 5);
    }
  });

  it("keeps the verbatim syllabus text and sub-topics for every topic", () => {
    for (const r of allTopicRefs()) {
      expect(r.topic.syllabusText.length).toBeGreaterThan(5);
      expect(r.topic.subtopics.length).toBeGreaterThan(0);
    }
  });
});

describe("question bank", () => {
  it("links every question to an existing topic and subject", () => {
    for (const q of QUESTIONS) {
      const ref = getTopicRef(q.topicId);
      expect(ref, q.id).toBeDefined();
      expect(ref!.subject.id, q.id).toBe(q.subject);
    }
  });

  it("uses the official format: 5 options with one correct answer, single-concept completions", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      if (q.type === "mcq") {
        expect(q.options, q.id).toHaveLength(5);
        expect(new Set(q.options).size, q.id).toBe(5);
        expect(q.correct, q.id).toBeGreaterThanOrEqual(0);
        expect(q.correct, q.id).toBeLessThan(5);
      } else if (q.type === "cloze") {
        expect(q.answers.length, q.id).toBeGreaterThan(0);
      }
      expect(q.explanation.length, q.id).toBeGreaterThan(5);
    }
  });

  it("has enough items for a full simulation in every subject", () => {
    for (const s of SUBJECTS) {
      expect(QUESTIONS.filter((q) => q.subject === s.id && q.type === "mcq").length).toBeGreaterThanOrEqual(21);
      expect(QUESTIONS.filter((q) => q.subject === s.id && q.type === "cloze").length).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("lessons and resources", () => {
  it("attaches lessons to syllabus topics and only to existing catalog videos", () => {
    for (const l of LESSONS) {
      expect(getTopicRef(l.topicId), l.topicId).toBeDefined();
      for (const v of l.videoIds) expect(getResource(v), `${l.topicId} → ${v}`).toBeDefined();
      expect(l.sources.length).toBeGreaterThan(0);
      const nodes = new Set(l.conceptMap.nodes.map((n) => n.id));
      for (const e of l.conceptMap.edges) {
        expect(nodes.has(e.from) && nodes.has(e.to), `${l.topicId}: ${e.from}→${e.to}`).toBe(true);
      }
    }
  });

  it("only lists https resources with existing topic tags and honest pricing labels", () => {
    const ids = RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RESOURCES) {
      expect(r.url.startsWith("https://"), r.id).toBe(true);
      // "metodo" marks study-method resources (not a syllabus topic).
      for (const t of r.topicTags) if (t !== "metodo") expect(getTopicRef(t), `${r.id} → ${t}`).toBeDefined();
      if (r.access === "free") expect(r.price, r.id).toBeUndefined();
      expect(r.verifiedOn, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("documents every study technique with sources", () => {
    for (const t of TECHNIQUES) {
      expect(t.sources.length, t.id).toBeGreaterThan(0);
      expect(t.steps.length, t.id).toBeGreaterThan(2);
      expect(t.limits.length, t.id).toBeGreaterThan(0);
    }
  });

  it("keeps exam sessions in chronological order", () => {
    expect(new Date(EXAM_DATES[0].date).getTime()).toBeLessThan(new Date(EXAM_DATES[1].date).getTime());
  });
});
