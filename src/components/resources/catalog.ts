import type { Resource, SubjectId } from "@/lib/types";
import { RESOURCES } from "@/data/resources";
import { getTopicRef } from "@/data/syllabus";
import { tokens } from "@/lib/search";

// Pure catalogue logic for Study Resources: labels, search ranking, filters and
// the "next topic" feature. Kept free of React so it can be unit-tested.

export type KindGroup = "videolezione" | "corso" | "libro" | "piattaforma";
export type KindFilter = "tutti" | KindGroup;
export type LangFilter = "tutte" | Resource["language"];
export type LevelFilter = "tutti" | Resource["level"];

export const LANG_LABEL: Record<Resource["language"], string> = { it: "Italiano", en: "Inglese", fr: "Francese", es: "Spagnolo", de: "Tedesco", multi: "Multilingue" };
export const LEVEL_LABEL: Record<Resource["level"], string> = { introduttivo: "Introduttivo", universitario: "Universitario", avanzato: "Avanzato" };
export const KIND_LABEL: Record<Resource["kind"], string> = { corso: "Corso", videolezione: "Videolezione", libro: "Manuale", piattaforma: "Piattaforma", playlist: "Playlist" };

/** Playlists are shown with the courses: they are structured sequences of lessons. */
export const groupOf = (r: Resource): KindGroup => (r.kind === "playlist" ? "corso" : r.kind);

export const SECTIONS: { id: KindGroup; title: string; noun: [string, string]; description: string }[] = [
  { id: "videolezione", title: "Videolezioni", noun: ["videolezione", "videolezioni"], description: "Una lezione su un argomento, da cinque minuti a poco più di un’ora." },
  { id: "corso", title: "Corsi universitari", noun: ["corso", "corsi"], description: "Corsi completi con lezioni registrate, esercizi e materiali." },
  { id: "libro", title: "Manuali aperti", noun: ["manuale", "manuali"], description: "Manuali universitari gratuiti da consultare online." },
  { id: "piattaforma", title: "Piattaforme", noun: ["piattaforma", "piattaforme"], description: "Siti con percorsi, esercizi e mappe per il ripasso." },
];

/** One clear verb per kind: the student knows where the link takes them. */
export function ctaLabel(r: Resource): string {
  if (r.access === "premium") {
    if (r.kind === "libro") return "Vedi il manuale";
    if (r.kind === "piattaforma") return "Vedi l’abbonamento";
    if (r.kind === "videolezione") return "Guarda il video";
    return "Vedi il corso";
  }
  switch (r.kind) {
    case "videolezione":
      return "Guarda il video";
    case "libro":
      return "Apri il manuale";
    case "piattaforma":
      return "Apri la piattaforma";
    case "playlist":
      return "Apri la playlist";
    default:
      return "Vai al corso";
  }
}

const SAME_ORG = new Set(["MIT OpenCourseWare", "Open Yale Courses"]);
const SHORT_INSTITUTION: Record<string, string> = {
  "Massachusetts Institute of Technology": "MIT",
  "Università degli Studi di Napoli Federico II": "Università Federico II",
};

/** Who publishes it: the channel for videos, otherwise platform plus university (never twice the same body). */
export function sourceLabel(r: Resource): string {
  if (r.kind === "videolezione" && r.youtubeId) return r.institution ?? r.provider;
  const inst = r.institution ? SHORT_INSTITUTION[r.institution] ?? r.institution : undefined;
  if (!inst || SAME_ORG.has(r.provider) || r.provider.includes(inst)) return r.provider;
  return `${r.provider}, ${inst}`;
}

/** Course code printed on generated covers (e.g. "7.016", "PHYS 200"). */
export function courseCode(r: Resource): string | undefined {
  const mit = r.title.match(/\((\d{1,2}\.\d{2,3}[A-Z]*)[,)]/);
  if (mit) return mit[1];
  const yale = r.title.match(/\(([A-Z]{3,5} \d{3}[a-z]?)\)/);
  return yale?.[1];
}

const SUBJECT_NAME: Record<SubjectId, string> = { biologia: "Biologia", chimica: "Chimica", fisica: "Fisica" };

/**
 * Big and small lines of the typographic overlay on generated covers: a course
 * code reads with its subject (the publisher is printed right below the cover),
 * a short title or a brand reads with its publisher.
 */
export function coverLabel(r: Resource): { big: string; small?: string } {
  const code = courseCode(r);
  if (code) return { big: code, small: r.subjects.map((s) => SUBJECT_NAME[s]).join(" e ") };
  const title = r.titleIt ?? r.title;
  // A video is published by its channel, not by "YouTube".
  const publisher = r.youtubeId ? r.institution ?? r.provider : r.provider;
  const big = title.length <= 22 ? title : publisher;
  const small = big === publisher || publisher.toLowerCase().includes(big.toLowerCase()) || big.toLowerCase().includes(publisher.toLowerCase()) ? undefined : publisher;
  return { big, small };
}

/** "13:26" → 13.4, "1:12:32" → 72.5; undefined for "15 settimane". */
export function durationMinutes(d?: string): number | undefined {
  if (!d || !/^\d+(:\d{2}){1,2}$/.test(d)) return undefined;
  const parts = d.split(":").map(Number);
  return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts[0] + parts[1] / 60;
}

// ── Search ────────────────────────────────────────────────────

interface Indexed {
  title: Set<string>;
  topic: Set<string>;
  people: Set<string>;
  body: Set<string>;
}

const index = new Map<string, Indexed>();

function indexed(r: Resource): Indexed {
  const hit = index.get(r.id);
  if (hit) return hit;
  const topics = r.topicTags.map((t) => getTopicRef(t)).filter((t) => !!t);
  const entry: Indexed = {
    title: new Set(tokens(`${r.title} ${r.titleIt ?? ""}`)),
    topic: new Set(tokens(topics.map((t) => `${t.topic.title} ${(t.topic.keywords ?? []).join(" ")}`).join(" "))),
    people: new Set(tokens(`${r.provider} ${r.institution ?? ""} ${r.authors?.join(" ") ?? ""}`)),
    body: new Set(tokens(r.description)),
  };
  index.set(r.id, entry);
  return entry;
}

function has(set: Set<string>, t: string): boolean {
  if (set.has(t)) return true;
  if (t.length < 5) return false;
  const stem = t.slice(0, 5);
  for (const h of set) if (h.length >= 5 && h.startsWith(stem)) return true;
  return false;
}

/**
 * Relevance of a resource for a free-text query. Each word scores in every field
 * it appears in: title (4) ≫ syllabus topic, title and keywords (up to 3, more
 * for focused resources) ≫ people and institutions (2) ≫ description (1). At
 * least half of the query words must match; 0 means "not a result".
 */
export function scoreResource(r: Resource, query: string): number {
  const q = tokens(query);
  if (!q.length) return 1;
  const ix = indexed(r);
  let score = 0;
  let matched = 0;
  // A resource tagged with few topics is about them; one tagged with ten only touches them.
  const topicWeight = r.topicTags.length <= 2 ? 3 : r.topicTags.length <= 4 ? 2.4 : 1.8;
  for (const t of q) {
    const w = (has(ix.title, t) ? 4 : 0) + (has(ix.topic, t) ? topicWeight : 0) + (has(ix.people, t) ? 2 : 0) + (has(ix.body, t) ? 1 : 0);
    if (w) matched += 1;
    score += w;
  }
  if (matched / q.length < 0.5) return 0;
  return score + (matched === q.length ? 2 : 0);
}

/** How well a resource serves one syllabus topic: specific, short, Italian videos first. */
export function topicRelevance(r: Resource, topicId: string): number {
  if (!r.topicTags.includes(topicId)) return 0;
  const minutes = durationMinutes(r.duration);
  return (
    10 / r.topicTags.length +
    (r.kind === "videolezione" ? 3 : r.kind === "piattaforma" ? 0 : 1) +
    (r.language === "it" ? 2 : 0) +
    (minutes !== undefined ? (minutes <= 20 ? 2 : minutes <= 45 ? 1 : 0) : 0)
  );
}

export interface Filters {
  query: string;
  topicId?: string;
  subject: SubjectId | "tutte";
  kind: KindFilter;
  lang: LangFilter;
  level: LevelFilter;
  onlyFav: boolean;
}

export const DEFAULT_FILTERS: Omit<Filters, "query" | "topicId"> = { subject: "tutte", kind: "tutti", lang: "tutte", level: "tutti", onlyFav: false };

/** Number of filters (not the search text) that narrow the catalogue. */
export function activeFilterCount(f: Filters): number {
  return (f.subject !== "tutte" ? 1 : 0) + (f.kind !== "tutti" ? 1 : 0) + (f.lang !== "tutte" ? 1 : 0) + (f.level !== "tutti" ? 1 : 0) + (f.onlyFav ? 1 : 0);
}

export function passesFilters(r: Resource, f: Filters, favorites: string[]): boolean {
  if (f.topicId && !r.topicTags.includes(f.topicId)) return false;
  if (f.subject !== "tutte" && !r.subjects.includes(f.subject)) return false;
  if (f.kind !== "tutti" && groupOf(r) !== f.kind) return false;
  if (f.lang !== "tutte" && r.language !== f.lang) return false;
  if (f.level !== "tutti" && r.level !== f.level) return false;
  if (f.onlyFav && !favorites.includes(r.id)) return false;
  return true;
}

/** Filtered resources of one access tier, ranked by relevance when there is a query or a topic. */
export function filterCatalog(list: Resource[], f: Filters, favorites: string[]): Resource[] {
  const scored = list
    .filter((r) => passesFilters(r, f, favorites))
    .map((r, i) => ({ r, i, s: scoreResource(r, f.query) + (f.topicId ? topicRelevance(r, f.topicId) : 0) }))
    .filter((x) => x.s > 0);
  if (f.query.trim() || f.topicId) scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.map((x) => x.r);
}

export const FREE = RESOURCES.filter((r) => r.access === "free");
export const PREMIUM = RESOURCES.filter((r) => r.access === "premium");

/** Languages actually present in the free catalogue, most common first. */
export function availableLanguages(list: Resource[] = FREE): { id: Resource["language"]; count: number }[] {
  const counts = new Map<Resource["language"], number>();
  for (const r of list) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  return [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => (a.id === "it" ? -1 : b.id === "it" ? 1 : b.count - a.count));
}

/** Up to `n` free resources for a topic, best first (lead + secondary picks). */
export function featuredFor(topicId: string, n = 4): Resource[] {
  return FREE.filter((r) => r.topicTags.includes(topicId))
    .map((r, i) => ({ r, i, s: topicRelevance(r, topicId) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.r);
}

/** "19 ottobre 2026" from an ISO date (fixed Italian month names: no locale drift between server and client). */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  return `${d} ${months[m - 1]} ${y}`;
}

export const VERIFIED_ON = FREE.reduce((max, r) => (r.verifiedOn > max ? r.verifiedOn : max), "");
