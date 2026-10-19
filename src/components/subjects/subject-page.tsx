"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight, ExternalLink, Play, Search, ShieldCheck, Target, X } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { getSubject, SYLLABUS_SOURCE } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { questionsFor } from "@/data/questions";
import { Badge, Button, Card, Notice, ProgressBar, Segmented } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { STATUS_FILL, StatusBadge } from "@/components/ui/status";
import { SUBJECT_ICON } from "@/components/study/start-study-modal";
import { useHydrated, useTopicStates } from "@/lib/hooks";
import { programMastery } from "@/lib/insights";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { STATUS_LABEL, type TopicStatus } from "@/lib/progress";
import { norm } from "@/lib/search";
import { cn, fmt, pluralize } from "@/lib/utils";

type Filter = "tutti" | TopicStatus;

export function SubjectPage({ subjectId }: { subjectId: SubjectId }) {
  const subject = getSubject(subjectId)!;
  const hydrated = useHydrated();
  const raw = useTopicStates(subjectId);
  const states = hydrated ? raw : raw.map((s) => ({ ...s, mastery: 0, status: "nuovo" as const }));
  const byId = useMemo(() => new Map(states.map((s) => [s.ref.topic.id, s])), [states]);
  const progress = useAtlas((s) => s.progress);
  const openStartStudy = useUI((s) => s.openStartStudy);
  const [filter, setFilter] = useState<Filter>("tutti");
  const [q, setQ] = useState("");
  const [onlyLessons, setOnlyLessons] = useState(false);
  const tone = SUBJECT_TONE[subjectId];
  const Icon = SUBJECT_ICON[subjectId];
  const mastery = programMastery(states).bySubject[subjectId];
  const next = states.find((x) => x.status === "da-consolidare") ?? states.find((x) => x.status === "in-corso") ?? states.find((x) => x.status === "nuovo");

  const visible = (topicId: string, title: string, text: string) => {
    const st = byId.get(topicId);
    if (filter !== "tutti" && st?.status !== filter) return false;
    if (onlyLessons && !hasLesson(topicId)) return false;
    if (q.trim()) {
      const n = norm(q);
      return norm(title).includes(n) || norm(text).includes(n);
    }
    return true;
  };

  let shown = 0;

  return (
    <div className="pb-16">
      <Link href="/materie" className="inline-flex items-center gap-1.5 text-[13px] text-fg-subtle hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Le mie materie
      </Link>

      <header className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="animate-fade-up">
          <div className="flex items-center gap-3">
            <span className={cn("grid h-12 w-12 place-items-center rounded-2xl border", TONE[tone].bg, TONE[tone].text, TONE[tone].border)}>
              <Icon className="h-6 w-6" />
            </span>
            <Badge tone="azure"><ShieldCheck className="h-3 w-3" /> PROGRAMMA UFFICIALE</Badge>
            <Badge tone="muted">{subject.cfu} CFU</Badge>
          </div>
          <h1 className="mt-4 font-display text-5xl leading-none text-fg">{subject.name}</h1>
          <p className="mt-4 max-w-3xl text-[14.5px] leading-relaxed text-fg-muted">
            <span className="text-fg-subtle">Obiettivo formativo (syllabus MUR): </span>«{subject.generalObjective}»
          </p>
          <a href={SYLLABUS_SOURCE.pdf[subjectId]} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-azure-300 hover:underline">
            PDF ufficiale del syllabus di {subject.name} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-fg-subtle">Padronanza della materia</span>
            <span className="font-mono text-lg text-fg">{fmt.percent(mastery)}</span>
          </div>
          <ProgressBar value={mastery} tone={tone} className="mt-2" label={`Padronanza ${subject.name}`} />
          <div className="mt-3 flex gap-0.5" aria-hidden>
            {states.map((x) => (
              <span key={x.ref.topic.id} className={cn("h-1.5 flex-1 rounded-full", STATUS_FILL[x.status])} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[12px] text-fg-subtle">
            {(["consolidato", "da-consolidare", "in-corso", "nuovo"] as TopicStatus[]).map((st) => (
              <span key={st} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", STATUS_FILL[st])} /> {STATUS_LABEL[st]}: {states.filter((x) => x.status === st).length}
              </span>
            ))}
          </div>
          {next && (
            <Button variant="primary" className="mt-4 w-full" onClick={() => openStartStudy({ subject: subjectId, topicId: next.ref.topic.id })}>
              <Play className="h-4 w-4 fill-current" /> Studia: {next.ref.topic.title.length > 26 ? next.ref.topic.title.slice(0, 25) + "…" : next.ref.topic.title}
            </Button>
          )}
        </Card>
      </header>

      {/* Filters */}
      <div className="sticky top-14 z-10 lg:top-16 -mx-4 mt-8 border-y border-white/[0.05] bg-ink-950/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Cerca in ${subject.name}…`}
              aria-label={`Cerca argomenti di ${subject.name}`}
              className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-8 text-[13.5px] text-fg placeholder:text-fg-subtle focus:border-azure-400/60 focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-fg-subtle hover:text-fg" aria-label="Cancella">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "tutti", label: "Tutti" },
              { value: "nuovo", label: "Da iniziare" },
              { value: "in-corso", label: "In studio" },
              { value: "da-consolidare", label: "Da consolidare" },
              { value: "consolidato", label: "Consolidati" },
            ]}
          />
          <button
            onClick={() => setOnlyLessons((v) => !v)}
            aria-pressed={onlyLessons}
            className={cn("flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] transition", onlyLessons ? "border-azure-400/40 bg-azure-500/10 text-azure-100" : "border-white/10 text-fg-subtle hover:text-fg")}
          >
            <BookOpen className="h-4 w-4" /> Con lezione completa
          </button>
        </div>
      </div>

      {/* Units */}
      <div className="mt-6 space-y-6">
        {subject.units.map((u) => {
          const unitTopics = u.chapters.flatMap((c) => c.topics);
          const unitStates = unitTopics.map((t) => byId.get(t.id)!).filter(Boolean);
          const um = unitStates.reduce((a, x) => a + x.mastery, 0) / Math.max(1, unitStates.length);
          const anyVisible = unitTopics.some((t) => visible(t.id, t.title, t.syllabusText));
          if (!anyVisible) return null;
          return (
            <Card key={u.id} as="section" id={u.id} className="scroll-mt-36 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] uppercase tracking-[0.14em] text-fg-subtle">
                    <span className={TONE[tone].text}>Unità {u.number}</span>
                    <span>· {u.cfu} CFU</span>
                    {u.exerciseShare != null && <span>· di cui almeno {String(u.exerciseShare).replace(".", ",")} CFU di esercitazioni</span>}
                  </div>
                  <h2 className="mt-1 text-[18px] font-semibold leading-snug text-fg">{u.title}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[12px] text-fg-subtle">{fmt.percent(um)}</span>
                  <ProgressBar value={um} tone={tone} className="w-32" label={`Padronanza unità ${u.number}`} />
                </div>
              </div>
              {u.chapters.map((c) => {
                const topics = c.topics.filter((t) => visible(t.id, t.title, t.syllabusText));
                if (!topics.length) return null;
                return (
                  <div key={c.id} className="border-b border-white/[0.04] last:border-0">
                    <div className="px-5 pb-1 pt-4 text-[12px] font-medium text-fg-subtle">{c.title}</div>
                    <ul className="px-2 pb-2">
                      {topics.map((t) => {
                        shown++;
                        const st = byId.get(t.id);
                        const p = hydrated ? progress[t.id] : undefined;
                        const lesson = hasLesson(t.id);
                        const nq = questionsFor({ topicIds: [t.id] }).length;
                        return (
                          <li key={t.id} className="group relative flex flex-col gap-2 rounded-2xl px-3 py-3 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-4">
                            <Link href={`/materie/${subjectId}/${t.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Apri ${t.title}`} />
                            <span className={cn("hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block", st ? STATUS_FILL[st.status] : "bg-white/10")} aria-hidden />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[14.5px] font-medium text-fg">{t.title}</span>
                                {lesson && <Badge tone="azure"><BookOpen className="h-3 w-3" /> Lezione completa</Badge>}
                              </div>
                              <div className="mt-0.5 line-clamp-1 text-[12.5px] text-fg-subtle">
                                {pluralize(t.subtopics.length, "sottoargomento", "sottoargomenti")} · {nq ? pluralize(nq, "quesito ATLAS", "quesiti ATLAS") : "quesiti in preparazione"}
                                {p?.lastStudied ? ` · ultimo studio ${fmt.dateShort(p.lastStudied)}` : ""}
                              </div>
                            </div>
                            <div className="relative z-10 flex items-center gap-2">
                              {st && <StatusBadge status={st.status} />}
                              {st && st.mastery > 0 && <span className="w-10 text-right font-mono text-[12px] text-fg-subtle">{fmt.percent(st.mastery)}</span>}
                              <Button size="sm" variant="ghost" onClick={() => openStartStudy({ subject: subjectId, topicId: t.id })} aria-label={`Studia ${t.title}`}>
                                <Play className="h-3.5 w-3.5" /> Studia
                              </Button>
                              {nq > 0 && (
                                <Button size="sm" variant="ghost" href={`/quiz?topic=${t.id}`} aria-label={`Quiz su ${t.title}`}>
                                  <Target className="h-3.5 w-3.5" /> Quiz
                                </Button>
                              )}
                              <ChevronRight className="hidden h-4 w-4 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-fg sm:block" />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </Card>
          );
        })}
        {shown === 0 && <Notice tone="info">Nessun argomento corrisponde ai filtri.</Notice>}
      </div>
    </div>
  );
}
