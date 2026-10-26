"use client";

import { forwardRef, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode, type SelectHTMLAttributes } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowUp, BookOpen, ChevronDown, FileText, GraduationCap, History, Library, Plus, RotateCcw, ShieldCheck, Sparkles, Square } from "lucide-react";
import { useAtlas, type ChatMessage, type ChatThread } from "@/lib/store";
import { offlineAnswer, streamChat, useIntegrations } from "@/lib/ai-client";
import { Markdown } from "@/components/ui/rich-text";
import { Badge, Button, Notice } from "@/components/ui/primitives";
import { getTopicRef, allTopicRefs, SUBJECTS } from "@/data/syllabus";
import { resourcesForTopic } from "@/data/resources";
import { questionsFor } from "@/data/questions";
import { useReducedMotion, useTopicStates } from "@/lib/hooks";
import { retrieveFromDoc } from "@/lib/library";
import type { ExplanationLevel } from "@/lib/types";
import { fmt, shuffle, uid } from "@/lib/utils";

// `clsx` (not `cn`): tailwind-merge drops the custom `text-ui` size next to a text colour.
const cx = clsx;

/** Suggestions shown in an empty conversation. `needsTopic`: meaningless without a topic in context. */
export const QUICK_PROMPTS = [
  { id: "spiega", label: "Spiegami questo argomento", text: "Spiegami questo argomento.", needsTopic: true },
  { id: "esempio", label: "Fammi un esempio", text: "Fammi un esempio concreto, possibilmente con un collegamento medico.", needsTopic: true },
  { id: "interroga", label: "Interrogami come un professore", text: "Interrogami come un professore: una domanda alla volta, poi valuta la mia risposta.", needsTopic: false },
  { id: "correggi", label: "Correggi la mia spiegazione", text: "Correggi la mia spiegazione: ", needsTopic: false },
  { id: "domande", label: "Genera 20 domande", text: "Genera 20 domande di verifica su questo argomento, con le soluzioni alla fine.", needsTopic: true },
  { id: "lacune", label: "Quali concetti non ho capito?", text: "Quali concetti non ho capito? Analizza i miei risultati.", needsTopic: false },
  { id: "programma", label: "Crea un programma di studio", text: "Crea un programma di studio fino all’esame.", needsTopic: false },
  { id: "video", label: "Consigliami un video universitario", text: "Consigliami un video universitario su questo argomento.", needsTopic: true },
] as const;

const LEVELS: { value: ExplanationLevel; label: string }[] = [
  { value: "introduttivo", label: "Introduttivo" },
  { value: "universitario", label: "Universitario" },
  { value: "avanzato", label: "Avanzato" },
];

const RULES = [
  "Distingue fatti consolidati, interpretazioni e punti incerti.",
  "Cita solo fonti presenti nel contesto (lezioni ATLAS, syllabus, tuoi documenti) e non inventa link.",
  "Le informazioni sull’esame vengono dalle fonti ministeriali verificate.",
  "Non sostituisce il docente né il libro di testo: verifica sempre i passaggi importanti.",
];

function usePointerFine() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(pointer: fine)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(pointer: fine)").matches,
    () => true,
  );
}

/** A native select dressed as a compact chip: real keyboard and touch pickers, with an icon and a visible value. */
const ChipSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { icon: ComponentType<{ className?: string }>; label: string }>(function ChipSelect(
  { icon: Icon, label, className, children, ...props },
  ref,
) {
  return (
    <span className={cx("relative inline-flex h-9 shrink-0 items-center rounded-lg border border-white/[0.09] bg-white/[0.03] transition-colors hover:border-white/[0.16] focus-within:border-azure-400/60 focus-within:ring-[3px] focus-within:ring-azure-500/20", className)}>
      <Icon className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-fg-subtle" aria-hidden />
      <select
        ref={ref}
        aria-label={label}
        className="h-full max-w-[13rem] min-w-0 cursor-pointer appearance-none truncate rounded-lg bg-transparent pl-8 pr-7 text-ui text-fg-muted outline-none [&>optgroup]:bg-ink-700 [&>option]:bg-ink-700"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-fg-subtle" aria-hidden />
    </span>
  );
});

export function ProfessorChat({
  initialTopicId,
  initialPrompt,
  initialDocId,
  initialThreadId,
  onThreadChange,
  compact,
  title,
  hideHistory,
}: {
  initialTopicId?: string;
  initialPrompt?: string;
  initialDocId?: string;
  initialThreadId?: string | null;
  onThreadChange?: (id: string) => void;
  /** Inside the side panel. */
  compact?: boolean;
  /** Page heading shown in the chat header (the page's h1). */
  title?: ReactNode;
  /** The page shows the conversation list in its own column from this breakpoint: "lg". */
  hideHistory?: "lg";
}) {
  const integrations = useIntegrations();
  const settingsLevel = useAtlas((s) => s.settings.explanationLevel);
  const chats = useAtlas((s) => s.chats);
  const upsertChat = useAtlas((s) => s.upsertChat);
  const library = useAtlas((s) => s.library);
  const quizResults = useAtlas((s) => s.quizResults);
  const topicStates = useTopicStates();
  const reduceMotion = useReducedMotion();
  const pointerFine = usePointerFine();

  const [threadId, setThreadId] = useState<string | null>(initialThreadId ?? null);
  const [level, setLevel] = useState<ExplanationLevel>(settingsLevel);
  const [topicId, setTopicId] = useState<string | undefined>(initialTopicId);
  const [docId, setDocId] = useState<string>(initialDocId ?? "");
  const [input, setInput] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);
  const [needTopic, setNeedTopic] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const topicRefEl = useRef<HTMLSelectElement>(null);
  const nearBottom = useRef(true);
  const inputId = useId();

  const thread = chats.find((c) => c.id === threadId) ?? null;
  const messages = useMemo(() => thread?.messages ?? [], [thread]);
  const topicRef = topicId ? getTopicRef(topicId) : undefined;
  const aiReady = integrations?.ai ?? false;
  const indexedDocs = library.filter((d) => d.textIndexed);
  const recent = useMemo(() => [...chats].sort((a, b) => (b.messages.at(-1)?.createdAt ?? b.createdAt).localeCompare(a.messages.at(-1)?.createdAt ?? a.createdAt)).slice(0, 30), [chats]);
  const topicGroups = useMemo(() => {
    const refs = allTopicRefs();
    return SUBJECTS.map((s) => ({ subject: s, refs: refs.filter((r) => r.subject.id === s.id) }));
  }, []);

  useEffect(() => {
    setTopicId(initialTopicId);
  }, [initialTopicId]);
  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
      inputRef.current?.focus();
    }
  }, [initialPrompt]);

  // Follow the answer only while the student is at the bottom: reading higher up is never interrupted.
  const lastContent = messages.at(-1)?.content;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !nearBottom.current || !messages.length) return;
    el.scrollTo({ top: el.scrollHeight, behavior: busy || reduceMotion ? "auto" : "smooth" });
  }, [messages.length, lastContent, busy, reduceMotion]);

  // The composer grows with the text, up to a limit.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const save = (t: ChatThread) => upsertChat(t);

  /** Answers that ATLAS can compute locally from the student’s own data. */
  const localAnswer = (promptId: string | null, text: string): string | null => {
    if (promptId === "lacune") {
      const weak = topicStates.filter((s) => s.status === "da-consolidare" || s.status === "in-corso").sort((a, b) => a.mastery - b.mastery).slice(0, 6);
      const wrong = new Map<string, number>();
      for (const r of quizResults) for (const a of r.answers) if (a.correct === false) wrong.set(a.topicId, (wrong.get(a.topicId) ?? 0) + 1);
      const wrongList = [...wrong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!weak.length && !wrongList.length) return "Non ho ancora abbastanza dati: completa almeno un quiz o una sessione di richiamo attivo, poi chiedimelo di nuovo.";
      return [
        "**Analisi delle lacune dai tuoi risultati** (calcolata da ATLAS sui tuoi quiz e richiami, non sulla sola lettura):",
        ...weak.map((s) => `- **${s.ref.topic.title}** (${s.ref.subject.name}): padronanza stimata ${Math.round(s.mastery * 100)}%`),
        wrongList.length ? "\n**Argomenti con più errori nei quiz:**" : "",
        ...wrongList.map(([id, n]) => `- ${getTopicRef(id)?.topic.title ?? id}: ${n} errori`),
        "\nSuggerimento: riprendi questi argomenti in modalità Deep con quiz progressivo e analisi delle lacune.",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (promptId === "programma") {
      return "Il programma di studio è generato dal **pianificatore** di ATLAS a partire da data d’esame, ore disponibili, giorni liberi e progressi reali. Aprilo dal [Calendario](/calendario): scegli appello e ore, l’anteprima si aggiorna subito. Quando cambiano i tuoi risultati, usa «Ricalcola».";
    }
    if (promptId === "video") {
      const list = topicRef ? resourcesForTopic(topicRef.topic.id, topicRef.subject.id).filter((r) => r.kind === "videolezione") : [];
      if (!list.length) return topicRef ? `Nel catalogo ATLAS non ci sono ancora videolezioni verificate per «${topicRef.topic.title}». Cerca in [Study Resources](/risorse).` : "Scegli un argomento per ricevere video verificati dal catalogo, oppure cerca in [Study Resources](/risorse).";
      return [`**Videolezioni verificate per «${topicRef!.topic.title}»** (catalogo ATLAS):`, ...list.slice(0, 5).map((r) => `- ${r.titleIt ?? r.title}, ${r.institution}, ${r.duration}, lingua ${r.language.toUpperCase()}\n  ${r.url}`)].join("\n");
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
    if (!aiReady) return offlineAnswer(text, topicId);
    return null;
  };

  /** Streams an answer into `assistantId` for the conversation in `base`. */
  const answer = async (base: ChatThread, content: string, assistantId: string) => {
    let current: ChatThread = {
      ...base,
      messages: [...base.messages, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), meta: { level, topicId } }],
    };
    save(current);
    setBusy(true);
    setFailed(null);
    let acc = "";
    const docs = docId ? await retrieveFromDoc(docId, content, 5) : [];
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await streamChat(
      {
        messages: base.messages.map((m) => ({ role: m.role, content: m.content })).slice(-20),
        level,
        topicId,
        docs,
      },
      (chunk) => {
        acc += chunk;
        current = { ...current, messages: current.messages.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)) };
        save(current);
      },
      controller.signal,
    );
    const stopped = controller.signal.aborted;
    let offline = false;
    if (!result.ok && !stopped) {
      // Honest fallback: the lesson passage, labelled as such, plus a visible error with a retry.
      if (!acc) {
        acc = offlineAnswer(content, topicId);
        offline = true;
      }
      setFailed({ id: assistantId, message: result.error?.message ?? "Il servizio AI non è disponibile." });
    }
    if (stopped && !acc) acc = "Risposta interrotta.";
    const citations = docs.map((d) => ({ doc: d.name, page: d.page }));
    save({ ...current, messages: current.messages.map((m) => (m.id === assistantId ? { ...m, content: acc, meta: { ...m.meta, offline, citations } } : m)) });
    setBusy(false);
    abortRef.current = null;
  };

  const send = async (text: string, promptId: string | null = null) => {
    const content = text.trim();
    if (!content || busy) return;
    const now = new Date().toISOString();
    const base: ChatThread = thread ?? { id: uid("chat"), title: content.slice(0, 60), createdAt: now, messages: [] };
    const userMsg: ChatMessage = { id: uid("m"), role: "user", content, createdAt: now, meta: { level, topicId } };
    const current: ChatThread = { ...base, messages: [...base.messages, userMsg] };
    setThreadId(current.id);
    if (current.id !== threadId) onThreadChange?.(current.id);
    save(current);
    setInput("");
    setNeedTopic(null);
    nearBottom.current = true;

    const local = localAnswer(promptId, content);
    if (local !== null) {
      save({ ...current, messages: [...current.messages, { id: uid("m"), role: "assistant", content: local, createdAt: new Date().toISOString(), meta: { offline: true, topicId } }] });
      return;
    }
    await answer(current, content, uid("m"));
  };

  /** Asks again for a failed answer, replacing it. */
  const retry = async (assistantId: string) => {
    if (!thread || busy) return;
    const i = thread.messages.findIndex((m) => m.id === assistantId);
    const question = [...thread.messages.slice(0, i)].reverse().find((m) => m.role === "user");
    if (i < 0 || !question) return;
    nearBottom.current = true;
    // The retry button disappears with the error: keep focus in the conversation.
    scrollRef.current?.focus({ preventScroll: true });
    await answer({ ...thread, messages: thread.messages.slice(0, i) }, question.content, uid("m"));
  };

  const pickPrompt = (p: (typeof QUICK_PROMPTS)[number]) => {
    if (p.needsTopic && !topicRef) {
      setNeedTopic(p.label);
      topicRefEl.current?.focus();
      return;
    }
    if (p.id === "correggi") {
      setInput(p.text);
      inputRef.current?.focus();
      return;
    }
    send(p.text, p.id);
  };

  const newThread = () => {
    abortRef.current?.abort();
    setThreadId(null);
    setInput("");
    setFailed(null);
    inputRef.current?.focus();
  };

  const openThread = (id: string) => {
    abortRef.current?.abort();
    setThreadId(id || null);
    setFailed(null);
    if (id) onThreadChange?.(id);
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  const historyControl = chats.length > 0 && (
    <span
      className={cx(
        "relative grid shrink-0 place-items-center text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg focus-within:ring-2 focus-within:ring-azure-400",
        compact ? "h-9 w-9 rounded-lg border border-white/[0.09] bg-white/[0.03]" : "h-10 w-10 rounded-control",
        hideHistory === "lg" && "lg:hidden",
      )}
    >
      <History className="h-4 w-4" aria-hidden />
      <select
        value={threadId ?? ""}
        onChange={(e) => openThread(e.target.value)}
        aria-label="Apri una conversazione recente"
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 [&>option]:bg-ink-700"
      >
        <option value="">Conversazioni recenti</option>
        {recent.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}, {fmt.dateShort(c.messages.at(-1)?.createdAt ?? c.createdAt)}
          </option>
        ))}
      </select>
    </span>
  );
  const newControl = messages.length > 0 && (
    <Button variant="ghost" size="sm" onClick={newThread} className={cx("shrink-0", compact ? "h-9" : "h-10")}>
      <Plus className="h-4 w-4" aria-hidden /> Nuova
    </Button>
  );
  // In the side panel the controls join the chips above the composer: no extra header row.
  const showHeader = !compact && (Boolean(title) || chats.length > 0 || messages.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader && (
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] px-1 py-2 sm:px-4">
          {title ? <h1 className="min-w-0 flex-1 truncate font-display text-2xl leading-tight tracking-[-0.01em] text-fg">{title}</h1> : <div className="flex-1" />}
          {historyControl}
          {newControl}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={busy}
        aria-label="Conversazione"
        tabIndex={-1}
        data-autofocus={compact && !pointerFine ? "" : undefined}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
      >
        <div className={cx("mx-auto w-full max-w-[44rem] py-6", compact ? "px-4" : "px-1 sm:px-4")}>
          {messages.length === 0 ? (
            <EmptyChat topicTitle={topicRef?.topic.title} compact={compact} onPrompt={pickPrompt} hasTopic={!!topicRef} />
          ) : (
            <ol className="space-y-7">
              {messages.map((m) => (
                <li key={m.id} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-card rounded-br-md border border-azure-400/15 bg-azure-500/[0.12] px-4 py-2.5 text-base leading-relaxed text-fg">
                      <span className="sr-only">Tu: </span>
                      {m.content}
                    </div>
                  ) : (
                    <AssistantMessage
                      m={m}
                      compact={compact}
                      streaming={busy && m.id === lastAssistant?.id}
                      error={failed?.id === m.id ? failed.message : null}
                      onRetry={() => retry(m.id)}
                      docLink={(name) => {
                        const d = library.find((x) => x.name === name);
                        return d ? `/biblioteca/${d.id}` : null;
                      }}
                    />
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Composer: always at the bottom of the conversation, above the safe area in the panel. */}
      <form
        className={cx("shrink-0 border-t border-white/[0.06] pt-3", compact ? "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "pb-1 sm:px-3 sm:pb-3")}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="mx-auto w-full max-w-[44rem]">
          <div className="no-scrollbar fade-x -mx-1 mb-2 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5">
            {compact && historyControl}
            {compact && newControl}
            <ChipSelect icon={GraduationCap} label="Livello delle spiegazioni" value={level} onChange={(e) => setLevel(e.target.value as ExplanationLevel)}>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </ChipSelect>
            <ChipSelect
              ref={topicRefEl}
              icon={BookOpen}
              label="Argomento di contesto"
              value={topicId ?? ""}
              onChange={(e) => {
                setTopicId(e.target.value || undefined);
                if (e.target.value) setNeedTopic(null);
              }}
              className={cx(needTopic && !topicRef && "border-orange-300/60")}
            >
              <option value="">Nessun argomento</option>
              {topicGroups.map((g) => (
                <optgroup key={g.subject.id} label={g.subject.name}>
                  {g.refs.map((r) => (
                    <option key={r.topic.id} value={r.topic.id}>
                      {r.topic.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </ChipSelect>
            {indexedDocs.length > 0 && (
              <ChipSelect icon={Library} label="Documento della biblioteca da usare come fonte" value={docId} onChange={(e) => setDocId(e.target.value)}>
                <option value="">Nessun documento</option>
                {indexedDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </ChipSelect>
            )}
            {topicRef && (
              <Link href={`/materie/${topicRef.subject.id}/${topicRef.topic.id}`} className="inline-flex h-9 shrink-0 items-center rounded-lg px-2 text-ui text-azure-300 underline-offset-4 hover:underline">
                Apri l’argomento
              </Link>
            )}
          </div>
          {needTopic && !topicRef && (
            <p role="status" className="mb-2 px-1 text-ui text-orange-300">
              Per «{needTopic}» scegli prima l’argomento qui sopra, poi premi di nuovo il suggerimento.
            </p>
          )}
          <div className="flex items-end gap-2 rounded-card border border-white/[0.1] bg-white/[0.03] p-1.5 pl-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-azure-400/60 focus-within:ring-[3px] focus-within:ring-azure-500/20">
            <label htmlFor={inputId} className="sr-only">
              Messaggio per l’AI Professor
            </label>
            <textarea
              id={inputId}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              data-autofocus={compact && pointerFine ? "" : undefined}
              placeholder={topicRef ? `Chiedi qualcosa su «${topicRef.topic.title}»` : "Fai una domanda al tuo professore"}
              aria-describedby={`${inputId}-hint`}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none sm:text-sm"
            />
            {busy ? (
              <Button size="icon" variant="secondary" onClick={() => abortRef.current?.abort()} aria-label="Interrompi la risposta">
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
              </Button>
            ) : (
              <Button type="submit" size="icon" variant="primary" disabled={!input.trim()} aria-label="Invia">
                <ArrowUp className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
          <p id={`${inputId}-hint`} className="mt-2 px-1 text-xs leading-relaxed text-fg-subtle">
            {integrations && !aiReady ? (
              <>
                Modalità base: rispondo con le lezioni verificate di ATLAS, senza AI generativa.{" "}
                <Link href="/profilo#integrazioni" className="text-azure-300 underline-offset-4 hover:underline">
                  Perché?
                </Link>
              </>
            ) : (
              "L’AI può sbagliare: verifica sulle fonti citate. Le domande generate non sono quesiti ministeriali."
            )}
          </p>
        </div>
      </form>
    </div>
  );
}

function EmptyChat({ topicTitle, compact, hasTopic, onPrompt }: { topicTitle?: string; compact?: boolean; hasTopic: boolean; onPrompt: (p: (typeof QUICK_PROMPTS)[number]) => void }) {
  return (
    <div>
      <span className="grid h-10 w-10 place-items-center rounded-full border border-azure-400/20 bg-azure-500/[0.08] text-azure-300">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-[-0.01em] text-fg [text-wrap:balance]">{topicTitle ? `Come posso aiutarti con «${topicTitle}»?` : "Come posso aiutarti?"}</h2>
      <p className="mt-1.5 max-w-[56ch] text-sm leading-relaxed text-fg-muted">
        Spiego a tre livelli, ti interrogo, correggo le tue spiegazioni e uso i tuoi documenti della biblioteca citando le pagine.
        {!hasTopic && " Per spiegazioni, esempi e domande scegli un argomento sotto, accanto al livello."}
      </p>
      <ul className={cx("mt-5 grid gap-2", !compact && "sm:grid-cols-2")} aria-label="Suggerimenti">
        {QUICK_PROMPTS.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPrompt(p)}
              className="flex min-h-11 w-full items-center gap-2 rounded-control border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-left text-sm text-fg-muted transition-colors duration-150 hover:border-azure-400/35 hover:bg-azure-500/[0.06] hover:text-fg"
            >
              <span className="min-w-0 flex-1">{p.label}</span>
              {p.needsTopic && !hasTopic && <span className="shrink-0 text-xs text-fg-subtle">serve un argomento</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 max-w-[60ch] text-sm leading-relaxed text-fg-muted">
        <span className="font-medium text-fg">Un consiglio:</span> prima di chiedere una spiegazione, prova a spiegare tu e chiedi «Correggi la mia spiegazione». Generare la risposta da soli fissa meglio i concetti.
      </p>
      <details className="group mt-4 border-t border-white/[0.06] pt-3">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
          <ShieldCheck className="h-4 w-4 text-fg-subtle" aria-hidden /> Come risponde
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li>Le conversazioni restano salvate solo in questo browser.</li>
        </ul>
      </details>
    </div>
  );
}

function AssistantMessage({
  m,
  compact,
  streaming,
  error,
  onRetry,
  docLink,
}: {
  m: ChatMessage;
  compact?: boolean;
  streaming: boolean;
  error: string | null;
  onRetry: () => void;
  docLink: (name: string) => string | null;
}) {
  const topic = m.meta?.topicId ? getTopicRef(m.meta.topicId) : undefined;
  const citations = m.meta?.citations ?? [];
  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1.5 font-medium text-fg-muted">
          <Sparkles className="h-3.5 w-3.5 text-azure-300" aria-hidden /> AI Professor
        </span>
        {m.meta?.offline && <Badge tone="muted">Lezioni ATLAS</Badge>}
      </div>
      {m.content ? (
        <Markdown source={m.content} className={cx(compact && "text-base")} />
      ) : (
        <span role="status" className="inline-flex items-center gap-1.5 py-2">
          <span className="sr-only">Il professore sta scrivendo</span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-fg-subtle" style={{ animationDelay: `${i * 150}ms` }} aria-hidden />
          ))}
        </span>
      )}
      {streaming && m.content && (
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-fg-subtle" aria-hidden>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-azure-400" /> Sta scrivendo
        </p>
      )}
      {(citations.length > 0 || (m.meta?.offline && topic)) && !streaming && (
        <div className="mt-3 border-t border-white/[0.06] pt-2.5">
          <p className="text-xs text-fg-subtle">Fonti</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {m.meta?.offline && topic && (
              <li>
                <Link href={`/materie/${topic.subject.id}/${topic.topic.id}`} className="inline-flex min-h-8 items-center gap-1.5 rounded-chip border border-white/10 bg-white/[0.03] px-2 text-xs text-fg-muted transition-colors hover:border-white/20 hover:text-fg">
                  <BookOpen className="h-3.5 w-3.5 text-fg-subtle" aria-hidden /> Lezione ATLAS: {topic.topic.title}
                </Link>
              </li>
            )}
            {citations.map((c, i) => {
              const href = docLink(c.doc);
              const body = (
                <>
                  <FileText className="h-3.5 w-3.5 text-fg-subtle" aria-hidden /> {c.doc}, p. {c.page}
                </>
              );
              const cls = "inline-flex min-h-8 items-center gap-1.5 rounded-chip border border-white/10 bg-white/[0.03] px-2 text-xs text-fg-muted";
              return (
                <li key={i}>
                  {href ? (
                    <Link href={`${href}?p=${c.page}`} className={cx(cls, "transition-colors hover:border-white/20 hover:text-fg")}>
                      {body}
                    </Link>
                  ) : (
                    <span className={cls}>{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {error && (
        <Notice tone="warning" live className="mt-3" title="L’AI non ha risposto">
          <p>
            {error} {m.meta?.offline ? "Qui sopra trovi il passaggio più vicino delle lezioni ATLAS." : "La risposta potrebbe essere incompleta."}
          </p>
          <Button size="sm" variant="secondary" onClick={onRetry} className="mt-2.5">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Riprova
          </Button>
        </Notice>
      )}
    </div>
  );
}
