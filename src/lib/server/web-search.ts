import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type Anthropic from "@anthropic-ai/sdk";
import type { Resource, SubjectId } from "@/lib/types";
import { AI_MODEL, fallbackParams, getAnthropic } from "./ai";

/** Academic domains the search is restricted to. */
export const ACADEMIC_DOMAINS = [
  "ocw.mit.edu",
  "oyc.yale.edu",
  "openstax.org",
  "khanacademy.org",
  "coursera.org",
  "edx.org",
  "federica.eu",
  "online.stanford.edu",
  "ox.ac.uk",
  "cam.ac.uk",
  "harvard.edu",
  "libretexts.org",
  "ncbi.nlm.nih.gov",
  "futurelearn.com",
];

interface Hit {
  url: string;
  title: string;
}

/**
 * Step 1 — Claude runs the server-side web_search tool on academic domains.
 * Only URLs returned by the search engine are kept: the model never writes URLs.
 * Step 2 — a structured-output call classifies those hits (by index) in Italian.
 */
export async function searchAcademicWeb(opts: { query: string; subjects: SubjectId[]; topicId?: string; langs: string[] }): Promise<Resource[]> {
  const client = getAnthropic();
  if (!client) throw new Error("AI non configurata");

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Cerca corsi universitari, lezioni registrate o capitoli di manuali aperti su: «${opts.query}». Lingue utili: ${opts.langs.join(", ")}. Privilegia contenuti di livello universitario del primo anno di medicina o scienze. Fai al massimo 3 ricerche, poi elenca brevemente i risultati migliori.`,
    },
  ];

  const hits = new Map<string, Hit>();
  let response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3, allowed_domains: ACADEMIC_DOMAINS }],
    messages,
    ...fallbackParams(),
  });

  // Resume paused server-tool turns (bounded).
  for (let i = 0; i < 2 && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3, allowed_domains: ACADEMIC_DOMAINS }],
      messages,
      ...fallbackParams(),
    });
  }

  const collect = (content: Anthropic.Beta.BetaContentBlock[]) => {
    for (const block of content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === "web_search_result" && r.url && !hits.has(r.url)) hits.set(r.url, { url: r.url, title: r.title });
        }
      }
    }
  };
  for (const m of messages) if (m.role === "assistant" && Array.isArray(m.content)) collect(m.content as Anthropic.Beta.BetaContentBlock[]);
  collect(response.content);

  const list = [...hits.values()].filter((h) => ACADEMIC_DOMAINS.some((d) => new URL(h.url).hostname.endsWith(d))).slice(0, 16);
  if (!list.length) return [];

  const Classified = z.object({
    items: z.array(
      z.object({
        index: z.number().int(),
        relevant: z.boolean(),
        provider: z.string(),
        institution: z.string(),
        titleIt: z.string(),
        description: z.string(),
        language: z.enum(["it", "en", "fr", "es", "de", "multi"]),
        level: z.enum(["introduttivo", "universitario", "avanzato"]),
        kind: z.enum(["corso", "videolezione", "libro", "piattaforma", "playlist"]),
        paid: z.boolean(),
      }),
    ),
  });

  const classified = await client.beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 6000,
    output_config: { effort: "low", format: betaZodOutputFormat(Classified) },
    messages: [
      {
        role: "user",
        content: `Argomento: «${opts.query}». Ecco risultati di ricerca reali (indice, titolo, URL):\n${list
          .map((h, i) => `${i}. ${h.title} — ${h.url}`)
          .join("\n")}\n\nPer ogni indice indica se è pertinente all'argomento per uno studente del primo anno di medicina, il fornitore e l'istituzione (deducili solo dal dominio o dal titolo; usa "" se non certi), un titolo tradotto in italiano, una descrizione di una frase in italiano basata solo sul titolo, la lingua probabile, il livello e il tipo. "paid" è true solo se il dominio è di una piattaforma a pagamento (es. corsi Coursera); in caso di dubbio false. Non inventare autori.`,
      },
    ],
    ...fallbackParams(),
  });

  const now = new Date().toISOString().slice(0, 10);
  const items = classified.parsed_output?.items ?? [];
  return items
    .filter((it) => it.relevant && list[it.index])
    .map((it) => {
      const hit = list[it.index];
      return {
        id: `web-${Buffer.from(hit.url).toString("base64url").slice(0, 24)}`,
        title: hit.title,
        titleIt: it.titleIt || undefined,
        url: hit.url,
        provider: it.provider || new URL(hit.url).hostname,
        institution: it.institution || undefined,
        description: it.description,
        language: it.language,
        level: it.level,
        kind: it.kind,
        access: it.paid ? "premium" : "free",
        priceNote: it.paid ? "Prezzo non verificato automaticamente: consulta la pagina ufficiale." : undefined,
        subjects: opts.subjects,
        topicTags: opts.topicId ? [opts.topicId] : [],
        verifiedOn: now,
        source: "ricerca-web",
      } satisfies Resource;
    });
}
