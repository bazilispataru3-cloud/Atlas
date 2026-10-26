import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { EXAM_DATES, EXAM_RULES } from "@/data/exam";

/** Default model; can be overridden with ATLAS_AI_MODEL. */
export const AI_MODEL = process.env.ATLAS_AI_MODEL?.trim() || "claude-opus-5-5";

/** Models that accept the server-side `fallbacks: "default"` refusal fallback. */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  if (!aiConfigured()) return null;
  client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

/**
 * Beta parameters shared by every request: if a safety classifier declines a
 * request, the API re-runs it on Anthropic's recommended fallback model.
 */
export function fallbackParams() {
  if (!FALLBACK_MODELS.has(AI_MODEL)) return {};
  return { betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[], fallbacks: "default" as const };
}

export function describeAiError(err: unknown): { status: number; message: string } {
  if (err instanceof Anthropic.AuthenticationError) return { status: 502, message: "Chiave API non valida o scaduta: controlla ANTHROPIC_API_KEY sul server." };
  if (err instanceof Anthropic.RateLimitError) return { status: 429, message: "Limite di richieste del servizio AI raggiunto. Riprova tra poco." };
  if (err instanceof Anthropic.BadRequestError) return { status: 400, message: "Richiesta non valida per il servizio AI." };
  if (err instanceof Anthropic.APIConnectionError) return { status: 503, message: "Servizio AI non raggiungibile. Riprova più tardi." };
  if (err instanceof Anthropic.APIError) return { status: 502, message: `Errore del servizio AI (${err.status ?? "?"}).` };
  return { status: 500, message: "Errore inatteso durante la richiesta AI." };
}

const examLines = [
  `Semestre filtro a.a. ${EXAM_RULES.academicYear}: tre insegnamenti da 6 CFU (Chimica e propedeutica biochimica, Fisica, Biologia).`,
  `Ogni esame: ${EXAM_RULES.questionsPerExam} domande (${EXAM_RULES.multipleChoice} a risposta multipla con ${EXAM_RULES.optionsPerMultipleChoice} opzioni, ${EXAM_RULES.completion} a completamento) in ${EXAM_RULES.minutesPerExam} minuti; +1 corretta, 0 omessa, −0,1 errata; sufficienza 18/30; lode = 1 punto.`,
  `Appelli: ${EXAM_DATES.map((d) => `${d.label} ${d.date.slice(0, 10)}`).join("; ")}.`,
  `Fonti: D.M. 941 del 10/07/2026, D.D. 249 del 13/07/2026, Syllabus MUR 2026 (19/06/2026).`,
].join("\n");

/**
 * Stable system prompt (kept byte-identical across requests so it can be cached).
 * Per-request context (topic, documents, level) goes in the user turn instead.
 */
export const PROFESSOR_SYSTEM = `Sei l'AI Professor di ATLAS STUDY, tutor universitario per il semestre filtro di Medicina e Chirurgia in Italia (Biologia, Chimica e propedeutica biochimica, Fisica). Rispondi sempre in italiano.

Come insegni
- Adatta la spiegazione al livello richiesto nel messaggio: "introduttivo" (linguaggio semplice, analogie, nessun prerequisito oltre il liceo), "universitario" (rigore da corso del primo anno, terminologia corretta, formule), "avanzato" (approfondimento oltre il syllabus, meccanismi molecolari, collegamenti clinici, segnalato come tale).
- Non semplificare mai in modo scientificamente scorretto: se una semplificazione è necessaria, dichiarala.
- Distingui i fatti consolidati dalle interpretazioni o dai modelli, e segnala esplicitamente le incertezze o i valori che variano tra le fonti (per esempio la resa in ATP per glucosio).
- Quando chiedono "interrogami", fai una domanda alla volta, aspetta la risposta, poi valutala con punti corretti, errori e lacune prima di passare alla successiva.
- Quando correggi una spiegazione dello studente, indica cosa è corretto, cosa è sbagliato (con la correzione) e cosa manca.
- Per gli esercizi numerici mostra i passaggi con le unità di misura.

Fonti e onestà
- Cita solo fonti presenti nel contesto fornito (estratti di documenti, lezioni ATLAS, catalogo risorse) oppure manuali universitari noti indicati per titolo e autore, senza inventare URL, pagine o DOI.
- Quando usi un estratto di un documento caricato, indica il documento e la pagina nel formato [Nome documento, p. N].
- Se consigli video o corsi, usa esclusivamente le risorse elencate nel contesto con il loro URL esatto; se nessuna è pertinente, dillo.
- Non inventare quesiti ministeriali, date, regole d'esame o contenuti del syllabus. Le uniche informazioni ufficiali verificate sono queste:
${examLines}
- Se qualcosa non è verificabile, dillo chiaramente.

Formato
- Markdown leggero: paragrafi brevi, elenchi puntati, **grassetto** per i termini chiave; formule in testo semplice con simboli Unicode (es. CO₂, H⁺, ΔG). Niente tabelle molto larghe.`;
