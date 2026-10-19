import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Resource, SubjectId } from "@/lib/types";
import { cached, clientKey, json, rateLimit } from "@/lib/server/guard";
import { LANGS, searchYouTube, youtubeConfigured, type Lang } from "@/lib/server/youtube";
import { searchAcademicWeb } from "@/lib/server/web-search";
import { AI_MODEL, aiConfigured, fallbackParams, getAnthropic } from "@/lib/server/ai";
import { getTopicRef } from "@/data/syllabus";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().trim().min(2).max(160),
  topicId: z.string().max(80).optional(),
  langs: z.string().optional(),
  web: z.enum(["0", "1"]).optional(),
});

type ProviderResult = { status: "ok" | "not_configured" | "error"; items: Resource[]; message?: string; cached?: boolean };

async function translateTitles(items: Resource[]): Promise<Resource[]> {
  const client = getAnthropic();
  const foreign = items.filter((r) => r.language !== "it" && !r.titleIt);
  if (!client || !foreign.length) return items;
  const Out = z.object({ items: z.array(z.object({ id: z.string(), titleIt: z.string(), descriptionIt: z.string() })) });
  try {
    const res = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: betaZodOutputFormat(Out) },
      messages: [
        {
          role: "user",
          content: `Traduci in italiano titolo e descrizione di questi video educativi, in modo fedele e naturale (non aggiungere informazioni):\n${foreign
            .map((r) => `id=${r.id} | titolo: ${r.title} | descrizione: ${r.description}`)
            .join("\n")}`,
        },
      ],
      ...fallbackParams(),
    });
    const map = new Map((res.parsed_output?.items ?? []).map((t) => [t.id, t]));
    return items.map((r) => {
      const t = map.get(r.id);
      return t ? { ...r, titleIt: t.titleIt, description: t.descriptionIt || r.description } : r;
    });
  } catch {
    return items; // Titles stay in the original language; the UI shows it as such.
  }
}

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = Query.safeParse(params);
  if (!parsed.success) return json({ error: "invalid_request", message: "Parametri di ricerca non validi." }, { status: 400 });
  const { q, topicId } = parsed.data;
  const langs = (parsed.data.langs?.split(",").filter((l): l is Lang => (LANGS as readonly string[]).includes(l)) ?? ["it", "en"]).slice(0, 3);
  const wantWeb = parsed.data.web === "1";
  const ref = topicId ? getTopicRef(topicId) : undefined;
  const subjects: SubjectId[] = ref ? [ref.subject.id] : ["biologia", "chimica", "fisica"];

  const limit = rateLimit(`res:${clientKey(req)}`, 30);
  if (!limit.ok) return json({ error: "rate_limited", message: "Troppe ricerche ravvicinate. Riprova tra qualche minuto." }, { status: 429 });

  const youtube: ProviderResult = { status: "not_configured", items: [] };
  if (youtubeConfigured()) {
    try {
      const { value, hit } = await cached(`yt:${q.toLowerCase()}:${langs.join(",")}:${topicId ?? ""}`, 6 * 3600_000, async () =>
        translateTitles(await searchYouTube({ query: q, langs: langs.length ? langs : ["it", "en"], subjects, topicId })),
      );
      youtube.status = "ok";
      youtube.items = value;
      youtube.cached = hit;
    } catch (err) {
      youtube.status = "error";
      youtube.message = err instanceof Error ? err.message : "Errore YouTube";
    }
  }

  const web: ProviderResult = { status: aiConfigured() ? "ok" : "not_configured", items: [] };
  if (wantWeb && aiConfigured()) {
    try {
      const { value, hit } = await cached(`web:${q.toLowerCase()}:${langs.join(",")}`, 24 * 3600_000, () => searchAcademicWeb({ query: q, subjects, topicId, langs }));
      web.items = value;
      web.cached = hit;
    } catch (err) {
      web.status = "error";
      web.message = err instanceof Error ? err.message : "Errore nella ricerca web";
    }
  }

  return json({ query: q, langs, youtube, web, translated: aiConfigured() });
}
