import type { Lesson } from "@/lib/types";
import { mitocondri } from "./mitocondri";
import { replicazione } from "./replicazione";
import { tamponi } from "./tamponi";
import { osmosi } from "./osmosi";
import { idrodinamica } from "./idrodinamica";
import { radioattivita } from "./radioattivita";

export const LESSONS: Lesson[] = [mitocondri, replicazione, tamponi, osmosi, idrodinamica, radioattivita];

const byTopic = new Map(LESSONS.map((l) => [l.topicId, l]));

export function getLesson(topicId: string): Lesson | undefined {
  return byTopic.get(topicId);
}

export function hasLesson(topicId: string): boolean {
  return byTopic.has(topicId);
}
