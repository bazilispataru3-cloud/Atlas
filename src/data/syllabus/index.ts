import type { Subject, SubjectId, Topic, TopicRef } from "@/lib/types";
import { biologia } from "./biologia";
import { chimica } from "./chimica";
import { fisica } from "./fisica";

export const SUBJECTS: Subject[] = [biologia, chimica, fisica];

export const SUBJECT_IDS: SubjectId[] = ["biologia", "chimica", "fisica"];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

const topicIndex = new Map<string, TopicRef>();
for (const subject of SUBJECTS) {
  for (const unit of subject.units) {
    for (const chapter of unit.chapters) {
      for (const t of chapter.topics) {
        topicIndex.set(t.id, { subject, unit, chapter, topic: t });
      }
    }
  }
}

export function getTopicRef(id: string): TopicRef | undefined {
  return topicIndex.get(id);
}

export function allTopicRefs(): TopicRef[] {
  return [...topicIndex.values()];
}

export function topicsOfSubject(id: SubjectId): TopicRef[] {
  return allTopicRefs().filter((r) => r.subject.id === id);
}

export function allTopics(): Topic[] {
  return allTopicRefs().map((r) => r.topic);
}

/** Share of the subject's 6 CFU carried by each topic (unit CFU split evenly). */
export function topicWeight(ref: TopicRef): number {
  const topicsInUnit = ref.unit.chapters.reduce((n, c) => n + c.topics.length, 0);
  return ref.unit.cfu / topicsInUnit;
}

export const SYLLABUS_SOURCE = {
  label: "MUR — Syllabus semestre aperto a.a. 2026-2027",
  published: "2026-06-19",
  pageUrl: "https://www.mur.gov.it/it/news/venerdi-19062026/semestre-aperto-aa-2026-2027",
  pdf: {
    biologia: "https://www.mur.gov.it/sites/default/files/2026-06/Syllabus_BIOLOGIA_%20finale%202026.pdf",
    chimica: "https://www.mur.gov.it/sites/default/files/2026-06/Syllabus%20Chim.Prop_.Bioch_.%20-%20finale-%202026.pdf",
    fisica: "https://www.mur.gov.it/sites/default/files/2026-06/Syllabus_FISICA_%20finale%202026.pdf",
  } satisfies Record<SubjectId, string>,
  verifiedOn: "2026-10-19",
};
