"use client";

import { create } from "zustand";
import { useEffect } from "react";
import type { ExplanationLevel } from "./types";
import { getLesson } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import { searchTopics, tokens } from "./search";

export interface Integrations {
  ai: boolean;
  model: string | null;
  youtube: boolean;
  webSearch: boolean;
  supabase: boolean;
}

const useIntegrationStore = create<{ status: Integrations | null; loading: boolean; load: () => void }>((set, get) => ({
  status: null,
  loading: false,
  load: () => {
    if (get().status || get().loading) return;
    set({ loading: true });
    fetch("/api/status")
      .then((r) => r.json())
      .then((status: Integrations) => set({ status, loading: false }))
      .catch(() => set({ status: { ai: false, model: null, youtube: false, webSearch: false, supabase: false }, loading: false }));
  },
}));

/** Which server-side integrations are configured (never exposes keys). */
export function useIntegrations(): Integrations | null {
  const status = useIntegrationStore((s) => s.status);
  const load = useIntegrationStore((s) => s.load);
  useEffect(() => load(), [load]);
  return status;
}

export interface ApiError {
  error: string;
  message: string;
}

export async function postJSON<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: ApiError; status: number }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({ error: "bad_response", message: "Risposta non valida dal server." }));
    if (!res.ok) return { ok: false, error: json as ApiError, status: res.status };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: { error: "network", message: "Connessione non disponibile." }, status: 0 };
  }
}

export async function streamChat(
  body: { messages: { role: "user" | "assistant"; content: string }[]; level: ExplanationLevel; topicId?: string; docs?: { name: string; page: number; text: string }[] },
  onText: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<{ ok: boolean; error?: ApiError }> {
  let res: Response;
  try {
    res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch {
    return { ok: false, error: { error: "network", message: "Connessione non disponibile." } };
  }
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({ error: "ai_error", message: "Errore del servizio AI." }));
    return { ok: false, error: json as ApiError };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      onText(decoder.decode(value, { stream: true }));
    }
  } catch {
    if (signal?.aborted) return { ok: true };
    return { ok: false, error: { error: "stream", message: "Flusso interrotto." } };
  }
  return { ok: true };
}

/**
 * Offline answer used when the AI is not configured: retrieves the most relevant
 * passage from ATLAS lessons. It is labelled as such in the UI — it is not AI.
 */
export function offlineAnswer(question: string, topicId?: string): string {
  const candidates = topicId ? [topicId] : searchTopics(question, 5).map((r) => r.ref.topic.id);
  const qTokens = new Set(tokens(question));
  let best: { score: number; title: string; topicTitle: string; text: string; topicId: string } | null = null;

  for (const id of candidates) {
    const lesson = getLesson(id);
    const ref = getTopicRef(id);
    if (!lesson || !ref) continue;
    const passages = [
      ...lesson.sections.map((s) => ({ title: s.title, text: s.body.join(" ") })),
      ...lesson.definitions.map((d) => ({ title: d.term, text: d.definition })),
      { title: "Sintesi", text: lesson.fastSummary.join(" ") },
    ];
    for (const p of passages) {
      const pt = tokens(`${p.title} ${p.text}`);
      const score = pt.reduce((s, t) => s + (qTokens.has(t) ? 1 : 0), 0) / Math.sqrt(pt.length + 5);
      if (!best || score > best.score) best = { score, title: p.title, topicTitle: ref.topic.title, text: p.text, topicId: id };
    }
  }

  if (!best || best.score === 0) {
    const ref = candidates[0] ? getTopicRef(candidates[0]) : undefined;
    if (ref) {
      return `Non ho trovato una lezione ATLAS completa che risponda a questa domanda.\n\n**Argomento più vicino nel syllabus:** ${ref.topic.title} (${ref.subject.name}, Unità ${ref.unit.number}).\n\n> ${ref.topic.syllabusText}\n\nApri l’argomento da *Le mie materie* per obiettivi, risorse e quiz.`;
    }
    return "Non ho trovato contenuti pertinenti nelle lezioni ATLAS. Prova a riformulare la domanda con i termini del syllabus (es. «ciclo di Krebs», «Bernoulli», «tamponi»).";
  }
  return `**Dalla lezione ATLAS «${best.topicTitle}» — ${best.title}**\n\n${best.text}`;
}
