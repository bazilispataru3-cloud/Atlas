import "server-only";
import type { Resource, SubjectId } from "@/lib/types";

// YouTube Data API v3 (official). Quota: search.list costs 100 units, videos.list 1.
// Results are cached by the caller to stay well within the default daily quota.

const API = "https://www.googleapis.com/youtube/v3";

/** Channels with a track record of accurate educational content get a ranking boost. */
const TRUSTED_CHANNELS = new Map<string, number>([
  ["MIT OpenCourseWare", 3],
  ["YaleCourses", 3],
  ["Federica Web Learning", 3],
  ["Khan Academy", 2.5],
  ["khanacademymedicine", 2.5],
  ["Khan Academy Italiano", 2.5],
  ["CrashCourse", 2],
  ["Amoeba Sisters", 2],
  ["Ninja Nerd", 2],
  ["Professor Dave Explains", 1.5],
  ["iBiology", 2.5],
  ["Osmosis from Elsevier", 2],
  ["Stanford", 2.5],
  ["Harvard University", 2],
]);

export function youtubeConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

interface SearchItem {
  id: { videoId?: string };
  snippet: { title: string; channelTitle: string; description: string };
}

interface VideoItem {
  id: string;
  snippet: { title: string; description: string; channelTitle: string; defaultAudioLanguage?: string; defaultLanguage?: string; publishedAt: string };
  contentDetails: { duration: string; caption: "true" | "false" };
  statistics: { viewCount?: string };
}

export function isoDuration(iso: string): { seconds: number; label: string } {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return { seconds: 0, label: "" };
  const [, d, h, min, s] = m.map((x) => (x ? Number(x) : 0)) as number[];
  const seconds = (d ?? 0) * 86400 + (h ?? 0) * 3600 + (min ?? 0) * 60 + (s ?? 0);
  const hh = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = seconds % 60;
  const label = hh ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;
  return { seconds, label };
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "’").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

const LANGS = ["it", "en", "fr", "es", "de"] as const;
type Lang = (typeof LANGS)[number];

export async function searchYouTube(opts: { query: string; langs: Lang[]; subjects: SubjectId[]; topicId?: string; perLang?: number }): Promise<Resource[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY non configurata");
  const perLang = opts.perLang ?? 6;

  const searches = await Promise.all(
    opts.langs.map(async (lang) => {
      const url = new URL(`${API}/search`);
      url.search = new URLSearchParams({
        part: "snippet",
        type: "video",
        maxResults: String(perLang),
        q: opts.query,
        relevanceLanguage: lang,
        safeSearch: "strict",
        videoEmbeddable: "true",
        videoDuration: "any",
        key,
      }).toString();
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`YouTube search ${res.status}`);
      const data = (await res.json()) as { items: SearchItem[] };
      return data.items.filter((i) => i.id.videoId).map((i, rank) => ({ id: i.id.videoId as string, lang, rank }));
    }),
  );

  const ranks = new Map<string, { lang: Lang; rank: number }>();
  for (const list of searches) for (const s of list) if (!ranks.has(s.id)) ranks.set(s.id, { lang: s.lang, rank: s.rank });
  if (!ranks.size) return [];

  const vurl = new URL(`${API}/videos`);
  vurl.search = new URLSearchParams({ part: "snippet,contentDetails,statistics", id: [...ranks.keys()].join(","), key }).toString();
  const vres = await fetch(vurl, { signal: AbortSignal.timeout(8000) });
  if (!vres.ok) throw new Error(`YouTube videos ${vres.status}`);
  const videos = ((await vres.json()) as { items: VideoItem[] }).items;

  const now = new Date().toISOString().slice(0, 10);
  return videos
    .map((v) => {
      const dur = isoDuration(v.contentDetails.duration);
      const r = ranks.get(v.id)!;
      const audio = (v.snippet.defaultAudioLanguage ?? v.snippet.defaultLanguage ?? r.lang).slice(0, 2).toLowerCase();
      const language = (LANGS as readonly string[]).includes(audio) ? (audio as Lang) : "multi";
      const trust = TRUSTED_CHANNELS.get(v.snippet.channelTitle) ?? 0;
      const views = Number(v.statistics.viewCount ?? 0);
      const score = trust * 2 + Math.log10(views + 10) - r.rank * 0.6 + (dur.seconds >= 300 ? 1 : 0);
      const resource: Resource & { _score: number; _seconds: number } = {
        id: `yt-${v.id}`,
        youtubeId: v.id,
        title: decodeEntities(v.snippet.title),
        url: `https://www.youtube.com/watch?v=${v.id}`,
        provider: "YouTube",
        institution: v.snippet.channelTitle,
        description: decodeEntities(v.snippet.description).split("\n")[0].slice(0, 220),
        language,
        level: dur.seconds > 1800 ? "universitario" : "introduttivo",
        kind: "videolezione",
        duration: dur.label,
        access: "free",
        priceNote: v.contentDetails.caption === "true" ? "Il video dichiara sottotitoli disponibili (lingue non specificate dall’API)." : undefined,
        subjects: opts.subjects,
        topicTags: opts.topicId ? [opts.topicId] : [],
        verifiedOn: now,
        source: "youtube-api",
        _score: score,
        _seconds: dur.seconds,
      };
      return resource;
    })
    .filter((r) => r._seconds >= 120) // exclude Shorts and teasers
    .sort((a, b) => b._score - a._score)
    .map(({ _score, _seconds, ...r }) => r);
}

export { LANGS };
export type { Lang };
