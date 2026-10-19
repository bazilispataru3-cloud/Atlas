"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Square, Sparkles, BookOpen, X, FileText, Plus, Library } from "lucide-react";
import { useAtlas, type ChatMessage, type ChatThread } from "@/lib/store";
import { offlineAnswer, streamChat, useIntegrations } from "@/lib/ai-client";
import { Markdown } from "@/components/ui/rich-text";
import { Badge, Notice, Segmented, Select } from "@/components/ui/primitives";
import { getTopicRef, allTopicRefs } from "@/data/syllabus";
import { resourcesForTopic } from "@/data/resources";
import { questionsFor } from "@/data/questions";
import { useTopicStates } from "@/lib/hooks";
import { retrieveFromDoc } from "@/lib/library";
import type { ExplanationLevel } from "@/lib/types";
import { cn, shuffle, uid } from "@/lib/utils";

export const QUICK_PROMPTS = [
  { id: "spiega", label: "Spiegami questo argomento", text: "Spiegami questo argomento." },
  { id: "esempio", label: "Fammi un esempio", text: "Fammi un esempio concreto, possibilmente con un collegamento medico." },
  { id: "interroga", label: "Interrogami come un professore", text: "Interrogami come un professore: una domanda alla volta, poi valuta la mia risposta." },
  { id: "correggi", label: "Correggi la mia spiegazione", text: "Correggi la mia spiegazione: " },
  { id: "domande", label: "Genera 20 domande", text: "Genera 20 domande di verifica su questo argomento, con le soluzioni alla fine." },
  { id: "lacune", label: "Quali concetti non ho capito?", text: "Quali concetti non ho capito? Analizza i miei risultati." },
  { id: "programma", label: "Crea un programma di studio", text: "Crea un programma di studio fino all’esame." },
  { id: "video", label: "Consigliami un video universitario", text: "Consigliami un video universitario su questo argomento." },
] as const;

const LEVELS: { value: ExplanationLevel; label: string }[] = [
  { value: "introduttivo", label: "Introduttivo" },
  { value: "universitario", label: "Universitario" },
  { value: "avanzato", label: "Avanzato" },
];

export function ProfessorChat({ initialTopicId, initialPrompt, initialDocId, compact }: { initialTopicId?: string; initialPrompt?: string; initialDocId?: string; compact?: boolean }) {
  const integrations = useIntegrations();
  const settingsLevel = useAtlas((s) => s.settings.explanationLevel);
  const chats = useAtlas((s) => s.chats);
  const upsertChat = useAtlas((s) => s.upsertChat);
  const library = useAtlas((s) => s.library);
  const quizResults = useAtlas((s) => s.quizResults);
  const topicStates = useTopicStates();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [level, setLevel] = useState<ExplanationLevel>(settingsLevel);
  const [topicId, setTopicId] = useState<string | undefined>(initialTopicId);
  const [docId, setDocId] = useState<string>(initialDocId ?? "");
  const [input, setInput] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const thread = chats.find((c) => c.id === threadId) ?? null;
  const messages = thread?.messages ?? [];
  const topicRef = topicId ? getTopicRef(topicId) : undefined;
  const aiReady = integrations?.ai ?? false;

  useEffect(() => {
    setTopicId(initialTopicId);
  }, [initialTopicId]);
  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      inputRef.current?.focus();
    }
  }, [initialPrompt]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, messages.at(-1)?.content]);

  const save = (t: ChatThread) => upsertChat(t);

  /** Answers that ATLAS can compute locally from the student’s own data. */
  const localAnswer = (promptId: string | null, text: string): string | null => {
    if (promptId === "lacune") {
      const weak = topicStates.filter((s) => s.status === "da-consolidare" || (s.status === "in-corso" && s.ref.topic.id)).sort((a, b) => a.mastery - b.mastery).slice(0, 6);
      const wrong = new Map<string, number>();
      for (const r of quizResults) for (const a of r.answers) if (a.correct === false) wrong.set(a.topicId, (wrong.get(a.topicId) ?? 0) + 1);
      const wrongList = [...wrong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!weak.length && !wrongList.length) return "Non ho ancora abbastanza dati: completa almeno un quiz o una sessione di active recall, poi chiedimelo di nuovo.";
      return [
        "**Analisi delle lacune dai tuoi risultati** (calcolata da ATLAS sui tuoi quiz e richiami, non sulla sola lettura):",
        ...weak.map((s) => `- **${s.ref.topic.title}** (${s.ref.subject.name}) — padronanza stimata ${Math.round(s.mastery * 100)}%`),
        wrongList.length ? "\n**Argomenti con più errori nei quiz:**" : "",
        ...wrongList.map(([id, n]) => `- ${getTopicRef(id)?.topic.title ?? id}: ${n} errori`),
        "\nSuggerimento: riprendi questi argomenti in modalità Deep con quiz progressivo e analisi delle lacune.",
      ].filter(Boolean).join("\n");
    }
    if (promptId === "programma") {
      return "Il programma di studio è generato dal **pianificatore** di ATLAS a partire da data d’esame, ore disponibili, giorni liberi e progressi reali. Aprilo da [Calendario](/calendario) e premi «Genera piano»: si aggiorna automaticamente in base ai risultati dei quiz.";
    }
    if (promptId === "video") {
      const list = topicRef ? resourcesForTopic(topicRef.topic.id, topicRef.subject.id).filter((r) => r.kind === "videolezione") : [];
      if (!list.length) return "Seleziona un argomento (in alto) per ricevere video verificati dal catalogo, oppure cerca in [Study Resources](/risorse).";
      return [`**Videolezioni verificate per «${topicRef!.topic.title}»** (catalogo ATLAS):`, ...list.slice(0, 5).map((r) => `- ${r.titleIt ?? r.title} — ${r.institution} · ${r.duration} · ${r.language.toUpperCase()}\n  ${r.url}`)].join("\n");
    }
    if (promptId === "domande" && !aiReady) {
      const qs = shuffle(questionsFor(topicRef ? { topicIds: [topicRef.topic.id] } : {}), 7).slice(0, 20);
      if (!qs.length) return "Non ci sono ancora quesiti nella banca ATLAS per questo argomento.";
      return [
        `**${qs.length} domande dalla banca ATLAS** (quesiti originali, non ministeriali):`,
        ...qs.map((q, i) => `${i + 1}. ${q.stem}`),
        "\n**Soluzioni**",
        ...qs.map((q, i) => `${i + 1}. ${q.type === "mcq" ? q.options[q.correct] : q.type === "cloze" ? q.answers[0] : q.modelAnswer}`),
      ].join("\n");
    }
    if (!aiReady) return `${offlineAnswer(text, topicId)}\n\n_Risposta dalla base di conoscenza ATLAS: l’AI Professor non è configurata su questo server._`;
    return null;
  };

  const send = async (text: string, promptId: string | null = null) => {
    const content = text.trim();
    if (!content || busy) return;
    const now = new Date().toISOString();
    const base: ChatThread = thread ?? { id: uid("chat"), title: content.slice(0, 60), createdAt: now, messages: [] };
    const userMsg: ChatMessage = { id: uid("m"), role: "user", content, createdAt: now, meta: { level, topicId } };
    let current: ChatThread = { ...base, messages: [...base.messages, userMsg] };
    setThreadId(current.id);
    save(current);
    setInput("");

    const local = localAnswer(promptId, content);
    if (local !== null) {
      current = { ...current, messages: [...current.messages, { id: uid("m"), role: "assistant", content: local, createdAt: new Date().toISOString(), meta: { offline: true, topicId } }] };
      save(current);
      return;
    }

    setBusy(true);
    const assistantId = uid("m");
    let acc = "";
    current = { ...current, messages: [...current.messages, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), meta: { level, topicId } }] };
    save(current);

    const docs = docId ? await retrieveFromDoc(docId, content, 5) : [];
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await streamChat(
      {
        messages: current.messages.filter((m) => m.id !== assistantId).map((m) => ({ role: m.role, content: m.content })).slice(-20),
        level,
        topicId,
        docs,
      },
      (chunk) => {
        acc += chunk;
        const snapshot = { ...current, messages: current.messages.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)) };
        save(snapshot);
      },
      controller.signal,
    );
    if (!result.ok) {
      acc = acc || `${offlineAnswer(content, topicId)}\n\n_${result.error?.message ?? "Servizio AI non disponibile."} Ho risposto con la base di conoscenza ATLAS._`;
    }
    const citations = docs.map((d) => ({ doc: d.name, page: d.page }));
    save({ ...current, messages: current.messages.map((m) => (m.id === assistantId ? { ...m, content: acc, meta: { ...m.meta, offline: !result.ok, citations } } : m)) });
    setBusy(false);
    abortRef.current = null;
  };

  const newThread = () => {
    abortRef.current?.abort();
    setThreadId(null);
    setInput("");
  };

  const topicOptions = useMemo(() => allTopicRefs(), []);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", compact ? "" : "rounded-3xl border border-white/[0.07] bg-ink-900/60")}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <Segmented size="sm" value={level} onChange={setLevel} options={LEVELS} />
        <div className="ml-auto flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={newThread} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] text-fg-subtle hover:bg-white/5 hover:text-fg" title="Nuova conversazione">
              <Plus className="h-3.5 w-3.5" /> Nuova
            </button>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <Select value={topicId ?? ""} onChange={(e) => setTopicId(e.target.value || undefined)} className="h-8 text-[12.5px]" aria-label="Argomento di contesto">
              <option value="">Nessun argomento specifico</option>
              {topicOptions.map((r) => (
                <option key={r.topic.id} value={r.topic.id}>
                  {r.subject.shortName} · {r.topic.title}
                </option>
              ))}
            </Select>
          </div>
          {library.length > 0 && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Library className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
              <Select value={docId} onChange={(e) => setDocId(e.target.value)} className="h-8 text-[12.5px]" aria-label="Documento della biblioteca">
                <option value="">Senza documenti</option>
                {library.filter((d) => d.textIndexed).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {integrations && !aiReady && (
          <Notice tone="warning" title="AI non configurata su questo server">
            Le risposte arrivano dalla base di conoscenza ATLAS (lezioni verificate) e dai tuoi dati. Per attivare l’AI Professor imposta <code>ANTHROPIC_API_KEY</code> nelle variabili d’ambiente del server.
          </Notice>
        )}
        {messages.length === 0 && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-sm text-fg">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-azure-500/15 text-azure-300">
                <Sparkles className="h-4 w-4" />
              </span>
              Come posso aiutarti{topicRef ? <> con <span className="text-azure-200">{topicRef.topic.title}</span></> : ""}?
            </div>
            <div className={cn("mt-4 grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => (p.id === "correggi" ? (setInput(p.text), inputRef.current?.focus()) : send(p.text, p.id))}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-left text-[13px] text-fg-muted transition hover:border-azure-400/30 hover:bg-azure-500/[0.06] hover:text-fg"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-azure-500/15 px-4 py-2.5 text-[14px] leading-relaxed text-fg">{m.content}</div>
            ) : (
              <div className="max-w-[95%] min-w-0">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-fg-subtle">
                  <Sparkles className="h-3 w-3 text-azure-300" /> AI Professor
                  {m.meta?.offline && <Badge tone="muted">Base di conoscenza ATLAS</Badge>}
                </div>
                {m.content ? <Markdown source={m.content} /> : <TypingDots />}
                {!!m.meta?.citations?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.meta.citations.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[11px] text-fg-subtle">
                        <FileText className="h-3 w-3" /> {c.doc}, p. {c.page}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <form
        className="border-t border-white/[0.06] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        {topicRef && (
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="azure">
              Contesto: {topicRef.topic.title}
              <button type="button" onClick={() => setTopicId(undefined)} aria-label="Rimuovi contesto" className="ml-1 opacity-70 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </Badge>
            <Link href={`/materie/${topicRef.subject.id}/${topicRef.topic.id}`} className="text-[11px] text-fg-subtle hover:text-fg-muted">
              apri argomento
            </Link>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-azure-400/50">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={compact ? 2 : 2}
            placeholder="Fai una domanda al tuo professore…"
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-fg placeholder:text-fg-subtle focus:outline-none"
            aria-label="Messaggio"
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-fg" aria-label="Interrompi">
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-azure-500 text-white disabled:opacity-30" aria-label="Invia">
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-fg-subtle">
          L’AI può sbagliare: verifica sulle fonti citate. Le domande non sono quesiti ministeriali.
        </p>
      </form>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-2" aria-label="Sta scrivendo">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-fg-subtle" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}
