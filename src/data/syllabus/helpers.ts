import type { Topic } from "@/lib/types";

/**
 * Splits the official syllabus sentence into sub-topics.
 * "Titolo: frase uno. Frase due." → ["frase uno", "Frase due"]
 */
export function splitSubtopics(text: string): string[] {
  const body = text.includes(":") ? text.slice(text.indexOf(":") + 1) : text;
  return body
    .split(/\.\s+(?=[A-ZÀ-ÝL'’])/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length > 2)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

export function topic(
  id: string,
  title: string,
  syllabusText: string,
  extra: Partial<Pick<Topic, "hasLesson" | "keywords" | "advanced">> = {},
): Topic {
  return { id, title, syllabusText, subtopics: splitSubtopics(syllabusText), ...extra };
}
