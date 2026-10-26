import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AI_MODEL, describeAiError, fallbackParams, getAnthropic } from "@/lib/server/ai";
import { clientKey, json, rateLimit } from "@/lib/server/guard";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["flashcards", "quiz", "summary", "conceptmap"]),
  title: z.string().max(300),
  /** Source material. Page markers like "[p. 12]" let the model cite pages. */
  text: z.string().min(40).max(80_000),
  count: z.number().int().min(3).max(30).default(10),
  level: z.enum(["introduttivo", "universitario", "avanzato"]).default("universitario"),
});

const Flashcards = z.object({
  cards: z.array(z.object({ front: z.string(), back: z.string(), page: z.number().int().nullable() })),
});

const Quiz = z.object({
  questions: z.array(
    z.object({
      type: z.enum(["mcq", "cloze"]),
      stem: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int(),
      answer: z.string(),
      explanation: z.string(),
      page: z.number().int().nullable(),
    }),
  ),
});

const Summary = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  definitions: z.array(z.object({ term: z.string(), definition: z.string() })),
  uncertainties: z.array(z.string()),
  pages: z.array(z.number().int()),
});

const ConceptMap = z.object({
  nodes: z.array(z.object({ id: z.string(), label: z.string() })),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string() })),
});

const INSTRUCTIONS = {
  flashcards: (n: number) =>
    `Crea ${n} flashcard di qualità universitaria a partire dal materiale. Una sola idea per carta; domanda precisa sul fronte, risposta breve e completa sul retro. Indica in "page" la pagina da cui deriva (dai marcatori [p. N]) oppure null.`,
  quiz: (n: number) =>
    `Crea ${n} quesiti basati esclusivamente sul materiale: circa due terzi "mcq" con esattamente 5 opzioni e una sola corretta (correctIndex 0-4; "answer" = testo dell'opzione corretta), il resto "cloze" con una risposta di un solo concetto ("options" vuoto, correctIndex -1). Spiega ogni soluzione. Indica la pagina di riferimento o null. Non presentarli come quesiti ministeriali.`,
  summary: () =>
    `Scrivi un riassunto fedele del materiale (circa 250-400 parole), i punti chiave, le definizioni principali, le eventuali incertezze o affermazioni da verificare, e le pagine più rilevanti.`,
  conceptmap: () =>
    `Costruisci una mappa concettuale di 8-14 nodi con archi etichettati da un verbo o da una breve relazione. Gli id dei nodi sono brevi stringhe senza spazi.`,
};

export async function POST(req: Request) {
  const client = getAnthropic();
  if (!client) return json({ error: "ai_not_configured", message: "AI non configurata: imposta ANTHROPIC_API_KEY sul server." }, { status: 503 });
  const limit = rateLimit(`gen:${clientKey(req)}`, 15);
  if (!limit.ok) return json({ error: "rate_limited", message: "Troppe richieste di generazione. Riprova più tardi." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request", message: "Richiesta non valida." }, { status: 400 });
  const { kind, title, text, count, level } = parsed.data;

  const schema = kind === "flashcards" ? Flashcards : kind === "quiz" ? Quiz : kind === "summary" ? Summary : ConceptMap;
  const instruction = INSTRUCTIONS[kind](count);

  try {
    const response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      system:
        "Sei un docente universitario che prepara materiali di studio per il semestre filtro di Medicina. Scrivi in italiano. Usa solo informazioni presenti nel materiale fornito o conoscenze scientifiche consolidate; se il materiale contiene errori evidenti, non riprodurli e segnalali nelle incertezze o nelle spiegazioni.",
      messages: [
        {
          role: "user",
          content: `Titolo: ${title}\nLivello: ${level}\n\n<materiale>\n${text}\n</materiale>\n\n${instruction}`,
        },
      ],
      ...fallbackParams(),
    });
    if (response.stop_reason === "refusal") return json({ error: "refused", message: "Il servizio AI non ha potuto elaborare questo materiale." }, { status: 422 });
    if (!response.parsed_output) return json({ error: "parse_error", message: "Risposta AI non interpretabile. Riprova." }, { status: 502 });
    return json({ kind, model: AI_MODEL, data: response.parsed_output });
  } catch (err) {
    const e = describeAiError(err);
    return json({ error: "ai_error", message: e.message }, { status: e.status });
  }
}
