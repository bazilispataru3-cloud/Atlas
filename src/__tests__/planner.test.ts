import { describe, expect, it } from "vitest";
import { generatePlan, type PlanConfig, type PlanTopicInput } from "@/lib/planner";
import { allTopicRefs, topicWeight } from "@/data/syllabus";
import { addDays, dayKey } from "@/lib/utils";
import type { TopicStatus } from "@/lib/progress";

const start = "2026-10-19"; // Monday
const config = (patch: Partial<PlanConfig> = {}): PlanConfig => ({
  startDate: start,
  examDate: "2026-12-10",
  subjects: ["biologia", "chimica", "fisica"],
  week: [
    { kind: "lezione", hours: 5 },
    { kind: "lezione", hours: 5 },
    { kind: "lezione", hours: 5 },
    { kind: "lezione", hours: 5 },
    { kind: "lezione", hours: 5 },
    { kind: "libero", hours: 7 },
    { kind: "riposo", hours: 0 },
  ],
  restDates: [],
  levels: { biologia: "intermedio", chimica: "intermedio", fisica: "intermedio" },
  ...patch,
});
const topics = (status: (i: number) => TopicStatus = () => "nuovo"): PlanTopicInput[] =>
  allTopicRefs().map((ref, i) => ({ ref, status: status(i), weight: topicWeight(ref) }));

describe("study planner", () => {
  it("keeps every activity before the exam and ends with the exam day", () => {
    const { items } = generatePlan(config(), topics());
    const exam = items.at(-1)!;
    expect(exam.kind).toBe("esame");
    expect(exam.date).toBe("2026-12-10");
    for (const it of items.slice(0, -1)) expect(it.date < "2026-12-10").toBe(true);
  });

  it("never schedules study on rest days", () => {
    const rest = dayKey(addDays(start, 3));
    const { items } = generatePlan(config({ restDates: [rest] }), topics());
    const onRest = items.filter((i) => i.date === rest);
    expect(onRest.every((i) => i.kind === "riposo")).toBe(true);
    const sundays = items.filter((i) => new Date(`${i.date}T12:00:00`).getDay() === 0);
    expect(sundays.every((i) => i.kind === "riposo")).toBe(true);
  });

  it("schedules spaced reviews after learning a topic", () => {
    const { items } = generatePlan(config(), topics());
    const first = items.find((i) => i.kind === "apprendimento")!;
    const topicId = first.topicIds[0];
    const reviewDays = items.filter((i) => i.kind === "ripasso" && i.topicIds.includes(topicId)).map((i) => i.date);
    expect(reviewDays.length).toBeGreaterThanOrEqual(3);
    expect(reviewDays[0] > first.date).toBe(true);
  });

  it("does not leave tiny fragments of a topic", () => {
    const { items } = generatePlan(config(), topics());
    const learning = items.filter((i) => i.kind === "apprendimento" || i.kind === "recupero");
    for (const it of learning) expect(it.minutes, it.title).toBeGreaterThanOrEqual(15);
  });

  it("puts recovery of weak topics first and only reviews consolidated ones", () => {
    const { items } = generatePlan(config(), topics((i) => (i === 5 ? "da-consolidare" : i === 6 ? "consolidato" : "nuovo")));
    const firstStudy = items.find((i) => i.kind === "apprendimento" || i.kind === "recupero")!;
    expect(firstStudy.kind).toBe("recupero");
    const consolidatedId = allTopicRefs()[6].topic.id;
    expect(items.some((i) => i.kind === "apprendimento" && i.topicIds.includes(consolidatedId))).toBe(false);
  });

  it("warns honestly when the available time cannot cover the programme", () => {
    const tight = config({ week: Array.from({ length: 7 }, () => ({ kind: "libero" as const, hours: 0.5 })) });
    const r = generatePlan(tight, topics());
    expect(r.stats.topicsUnscheduled).toBeGreaterThan(0);
    expect(r.warnings.join(" ")).toMatch(/non pianificati/);
  });

  it("rejects an exam date before the start", () => {
    const r = generatePlan(config({ examDate: "2026-10-01" }), topics());
    expect(r.items).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/successiva/);
  });
});
