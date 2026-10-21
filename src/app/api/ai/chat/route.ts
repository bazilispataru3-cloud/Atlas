import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, PROFESSOR_SYSTEM, describeAiError, fallbackParams, getAnthropic } from "@/lib/server/ai";
import { clientKey, json, rateLimit } from "@/lib/server/guard";
import { getTopicRef } from "@/data/syllabus";
import { getLesson } from "@/data/lessons";
import { RESOURCES, resourcesForTopic } from "@/data/resources";

export const runtime = "nodejs";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(12_000) }))
    .min(1)
    .max(40),
  level: z.enum(["introduttivo", "universitario", "avanzato"]).default("universitario"),
  topicId: z.string().max(80).optional(),
  docs: z
    .array(z.object({ name: z.string().max(200), page: z.number().int().min(1).max(5000), text: z.string().max(4000) }))
    .max(8)
    .optional(),
});

function buildContext(body: z.infer<typeof Body>): string {
  const parts: string[] = [`Livello di spiegazione richiesto: ${body.level}.`];
  const ref = body.topicId ? getTopicRef(body.topicId) : undefined;
  if (ref) {
    parts.push(
      `Argomento in studio: ${ref.subject.name} › Unità ${ref.unit.number} «${ref.unit.title}» › ${ref.topic.title}.`,
      `Testo ufficiale del syllabus MUR 2026/27 per questo argomento: «${ref.topic.syllabusText}»`,
    );
    const lesson = getLesson(ref.topic.id);
    if (lesson) parts.push(`Sintesi della lezione ATLAS (verificata):\n- ${lesson.fastSummary.join("\n- ")}`);
  }
  const resources = (ref ? resourcesForTopic(ref.topic.id, ref.subject.id) : RESOURCES.filter((r) => r.access === "free").slice(0, 12)).slice(0, 10);
  parts.push(
    `Catalogo risorse verificate utilizzabili (titolo — fornitore — URL):\n${resources
      .map((r) => `- ${r.title} — ${r.institution ?? r.provider}${r.authors?.length ? ` (${r.authors.slice(0, 2).join(", ")})` : ""} — ${r.url}`)
      .join("\n")}`,
  );
  if (body.docs?.length) {
    parts.push(
      `Estratti dai documenti caricati dallo studente (cita come [Nome, p. N]):\n${body.docs
        .map((d) => `[${d.name}, p. ${d.page}]\n${d.text}`)
        .join("\n\n")}`,
    );
  }
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  const client = getAnthropic();
  if (!client) {
    return json({ error: "ai_not_configured", message: "AI non configurata: imposta ANTHROPIC_API_KEY sul server." }, { status: 503 });
  }
  const limit = rateLimit(`chat:${clientKey(req)}`, 40);
  if (!limit.ok) return json({ error: "rate_limited", message: "Troppe richieste. Riprova tra qualche minuto." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request", message: "Richiesta non valida." }, { status: 400 });
  const body = parsed.data;
  if (body.messages[0].role !== "user") return json({ error: "invalid_request", message: "Il primo messaggio deve essere dell’utente." }, { status: 400 });

  // Context goes in front of the latest user message so the system prompt stays cacheable.
  const history = body.messages.slice(0, -1);
  const last = body.messages[body.messages.length - 1];
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `<contesto>\n${buildContext(body)}\n</contesto>\n\n${last.content}` },
  ];

  try {
    const stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: 8000,
      system: [{ type: "text", text: PROFESSOR_SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium" },
      messages,
      ...fallbackParams(),
    });

    const encoder = new TextEncoder();
    const bodyStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") {
            controller.enqueue(encoder.encode("\n\n_La richiesta non può essere completata dal servizio AI._"));
          } else if (final.stop_reason === "max_tokens") {
            controller.enqueue(encoder.encode("\n\n_Risposta troncata per lunghezza: chiedi di continuare._"));
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\n_${describeAiError(err).message}_`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(bodyStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Atlas-Model": AI_MODEL },
    });
  } catch (err) {
    const e = describeAiError(err);
    return json({ error: "ai_error", message: e.message }, { status: e.status });
  }
}
