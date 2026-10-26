import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AI_MODEL, describeAiError, fallbackParams, getAnthropic } from "@/lib/server/ai";
import { clientKey, json, rateLimit } from "@/lib/server/guard";
import { getTopicRef } from "@/data/syllabus";
import { getLesson } from "@/data/lessons";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("feynman"),
    topicId: z.string().max(80).optional(),
    topicTitle: z.string().max(200),
    explanation: z.string().min(20).max(8000),
    attempt: z.number().int().min(1).max(10).default(1),
  }),
  z.object({
    kind: z.literal("open"),
    question: z.string().max(2000),
    modelAnswer: z.string().max(4000),
    keyPoints: z.array(z.string().max(300)).max(12),
    answer: z.string().min(1).max(6000),
  }),
]);

const Feynman = z.object({
  score: z.number().int(),
  verdict: z.string(),
  correct: z.array(z.string()),
  errors: z.array(z.object({ claim: z.string(), correction: z.string() })),
  omissions: z.array(z.string()),
  jargon: z.array(z.string()),
  improvedExplanation: z.string(),
  followUpQuestions: z.array(z.string()),
});

const Open = z.object({
  score: z.number(),
  covered: z.array(z.string()),
  missing: z.array(z.string()),
  errors: z.array(z.string()),
  feedback: z.string(),
});

export async function POST(req: Request) {
  const client = getAnthropic();
  if (!client) return json({ error: "ai_not_configured", message: "AI non configurata: imposta ANTHROPIC_API_KEY sul server." }, { status: 503 });
  const limit = rateLimit(`eval:${clientKey(req)}`, 30);
  if (!limit.ok) return json({ error: "rate_limited", message: "Troppe richieste. Riprova tra qualche minuto." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request", message: "Richiesta non valida." }, { status: 400 });
  const body = parsed.data;

  try {
    if (body.kind === "feynman") {
      const ref = body.topicId ? getTopicRef(body.topicId) : undefined;
      const lesson = body.topicId ? getLesson(body.topicId) : undefined;
      const reference = [
        ref ? `Syllabus MUR: «${ref.topic.syllabusText}»` : "",
        lesson ? `Concetti essenziali attesi:\n- ${lesson.feynman.essentials.map((e) => `${e.concept}: ${e.explanation}`).join("\n- ")}` : "",
        lesson ? `Sintesi verificata:\n- ${lesson.fastSummary.join("\n- ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const response = await client.beta.messages.parse({
        model: AI_MODEL,
        max_tokens: 8000,
        output_config: { effort: "medium", format: betaZodOutputFormat(Feynman) },
        system:
          "Sei un docente universitario che valuta spiegazioni secondo la tecnica di Feynman. Scrivi in italiano. Sii preciso e costruttivo: individua errori scientifici, omissioni di concetti essenziali e termini tecnici usati senza spiegarli. Il punteggio (0-100) misura correttezza e completezza, non lo stile. Non inventare errori: se la spiegazione è corretta, dillo.",
        messages: [
          {
            role: "user",
            content: `Argomento: ${body.topicTitle} (tentativo n. ${body.attempt})\n\n${reference}\n\n<spiegazione_studente>\n${body.explanation}\n</spiegazione_studente>\n\nValuta la spiegazione. In "improvedExplanation" scrivi una versione corretta e semplice (max 180 parole). In "followUpQuestions" proponi 2-3 domande per il secondo tentativo.`,
          },
        ],
        ...fallbackParams(),
      });
      if (!response.parsed_output) return json({ error: "parse_error", message: "Risposta AI non interpretabile." }, { status: 502 });
      return json({ kind: "feynman", model: AI_MODEL, data: response.parsed_output });
    }

    const response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: betaZodOutputFormat(Open) },
      system:
        "Sei un esaminatore universitario equo. Valuta la risposta dello studente rispetto ai punti chiave attesi. Scrivi in italiano. score è un numero tra 0 e 1. Non penalizzare la forma se il contenuto è corretto.",
      messages: [
        {
          role: "user",
          content: `Domanda: ${body.question}\nRisposta modello: ${body.modelAnswer}\nPunti chiave: ${body.keyPoints.join("; ")}\n\n<risposta_studente>\n${body.answer}\n</risposta_studente>`,
        },
      ],
      ...fallbackParams(),
    });
    if (!response.parsed_output) return json({ error: "parse_error", message: "Risposta AI non interpretabile." }, { status: 502 });
    return json({ kind: "open", model: AI_MODEL, data: response.parsed_output });
  } catch (err) {
    const e = describeAiError(err);
    return json({ error: "ai_error", message: e.message }, { status: e.status });
  }
}
