"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, ExternalLink, Layers, Play, ShieldCheck, Sparkles } from "lucide-react";
import { SUBJECTS, SYLLABUS_SOURCE } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { Badge, Button, Card, PageHeader, ProgressBar, Stat } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { STATUS_FILL } from "@/components/ui/status";
import { SUBJECT_ICON } from "@/components/study/start-study-modal";
import { useHydrated, useTopicStates } from "@/lib/hooks";
import { programMastery } from "@/lib/insights";
import { STATUS_LABEL, type TopicStatus } from "@/lib/progress";
import { useUI } from "@/lib/ui-store";
import { cn, fmt } from "@/lib/utils";

const ORDER: TopicStatus[] = ["consolidato", "da-consolidare", "in-corso", "nuovo"];

export function SubjectsOverview() {
  const hydrated = useHydrated();
  const all = useTopicStates();
  const states = hydrated ? all : all.map((s) => ({ ...s, mastery: 0, status: "nuovo" as const }));
  const mastery = programMastery(states);
  const openStartStudy = useUI((s) => s.openStartStudy);
  const count = (st: TopicStatus) => states.filter((s) => s.status === st).length;

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> Le mie materie</span>}
        title={<>Il programma ufficiale, <span className="italic text-gradient-azure">argomento per argomento</span>.</>}
        description="Biologia, Chimica e propedeutica biochimica, Fisica: 18 CFU organizzati come nel syllabus MUR del semestre filtro 2026/27 (materia → unità → capitolo → argomento → sottoargomento). Lo stato di ogni argomento cambia solo con prove di recupero — quiz, richiamo attivo, flashcard — non con la sola lettura."
      />

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Padronanza del programma" value={fmt.percent(mastery.total)} hint="Media pesata per CFU" tone="azure" />
        {ORDER.map((st) => (
          <Stat key={st} label={STATUS_LABEL[st]} value={count(st)} hint={`su ${states.length} argomenti`} />
        ))}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {SUBJECTS.map((s) => {
          const list = states.filter((x) => x.ref.subject.id === s.id);
          const tone = SUBJECT_TONE[s.id];
          const Icon = SUBJECT_ICON[s.id];
          const lessons = list.filter((x) => hasLesson(x.ref.topic.id)).length;
          const next = list.find((x) => x.status === "da-consolidare") ?? list.find((x) => x.status === "in-corso") ?? list.find((x) => x.status === "nuovo");
          return (
            <Card key={s.id} className="flex flex-col overflow-hidden">
              <div className={cn("relative p-6", "bg-[radial-gradient(600px_180px_at_10%_0%,var(--glow),transparent)]")} style={{ ["--glow" as string]: `${TONE[tone].hex}26` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("grid h-12 w-12 place-items-center rounded-2xl border", TONE[tone].bg, TONE[tone].text, TONE[tone].border)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge tone="azure"><ShieldCheck className="h-3 w-3" /> Syllabus MUR</Badge>
                </div>
                <h2 className="mt-5 font-display text-[2.1rem] leading-none text-fg">{s.name}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{s.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-subtle">
                  <span>{s.cfu} CFU</span>
                  <span>{s.units.length} unità</span>
                  <span>{list.length} argomenti</span>
                  <span>{lessons} lezioni ATLAS complete</span>
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                  <span className="text-[12px] text-fg-subtle">Padronanza</span>
                  <span className="font-mono text-sm text-fg">{fmt.percent(mastery.bySubject[s.id])}</span>
                </div>
                <ProgressBar value={mastery.bySubject[s.id]} tone={tone} className="mt-1.5" label={`Padronanza ${s.name}`} />
                <div className="mt-3 flex gap-0.5" aria-hidden>
                  {list.map((x) => (
                    <span key={x.ref.topic.id} title={`${x.ref.topic.title} · ${STATUS_LABEL[x.status]}`} className={cn("h-1.5 flex-1 rounded-full", STATUS_FILL[x.status])} />
                  ))}
                </div>
              </div>

              <div className="border-t border-white/[0.06] px-6 py-4">
                <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Unità didattiche</div>
                <ul className="space-y-2">
                  {s.units.map((u) => {
                    const ul = list.filter((x) => x.ref.unit.id === u.id);
                    const m = ul.reduce((a, x) => a + x.mastery, 0) / Math.max(1, ul.length);
                    return (
                      <li key={u.id}>
                        <Link href={`/materie/${s.id}#${u.id}`} className="group flex items-center gap-3 rounded-lg py-0.5">
                          <span className="w-5 shrink-0 font-mono text-[11px] text-fg-subtle">{u.number}</span>
                          <span className="min-w-0 flex-1 truncate text-[13px] text-fg-muted group-hover:text-fg">{u.title}</span>
                          <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{u.cfu} CFU</span>
                          <span className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
                            <span className={cn("block h-full rounded-full", TONE[tone].dot)} style={{ width: `${Math.round(m * 100)}%` }} />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-white/[0.06] p-4">
                <Button variant="secondary" href={`/materie/${s.id}`} className="flex-1">
                  Apri il programma <ArrowRight className="h-4 w-4" />
                </Button>
                {next && (
                  <Button variant="primary" onClick={() => openStartStudy({ subject: s.id, topicId: next.ref.topic.id })} className="flex-1" title={next.ref.topic.title}>
                    <Play className="h-4 w-4 fill-current" /> Studia il prossimo
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-fg">
            <BookOpenCheck className="h-4 w-4 text-azure-300" /> Fonte del programma
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
            {SYLLABUS_SOURCE.label}, pubblicato dal MUR il {fmt.dateYear(SYLLABUS_SOURCE.published)}. Il testo degli argomenti è riportato con sole correzioni tipografiche; il raggruppamento in capitoli è editoriale. Verificato il {fmt.dateYear(SYLLABUS_SOURCE.verifiedOn)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" href={SYLLABUS_SOURCE.pageUrl} external>
              Notizia MUR <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            {SUBJECTS.map((s) => (
              <Button key={s.id} variant="outline" size="sm" href={SYLLABUS_SOURCE.pdf[s.id]} external>
                PDF {s.name} <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[14px] font-semibold text-fg">Come leggere i contenuti</div>
          <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-fg-muted">
            <div className="flex gap-3">
              <Badge tone="azure" className="shrink-0"><ShieldCheck className="h-3 w-3" /> PROGRAMMA UFFICIALE</Badge>
              <span>Testo del syllabus ministeriale e contenuti necessari per raggiungerne gli obiettivi.</span>
            </div>
            <div className="flex gap-3">
              <Badge tone="gold" className="shrink-0"><Sparkles className="h-3 w-3" /> APPROFONDIMENTO AVANZATO</Badge>
              <span>Contenuti oltre il programma, utili per capire meglio ma non richiesti dal syllabus.</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
