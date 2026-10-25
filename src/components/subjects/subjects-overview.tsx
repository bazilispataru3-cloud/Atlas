"use client";

import Link from "next/link";
import { ChevronRight, ExternalLink, Play } from "lucide-react";
import { SUBJECTS, SYLLABUS_SOURCE } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { Button, Meridian, PageHeader, ProgressBar, Skeleton } from "@/components/ui/primitives";
import { ScienceFigure } from "@/components/imagery/science-figure";
import { imageForSubject } from "@/data/imagery";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { StatusBadge } from "@/components/ui/status";
import { useHydrated, useTopicStates, type TopicState } from "@/lib/hooks";
import { programMastery } from "@/lib/insights";
import { useUI } from "@/lib/ui-store";
import { cn, fmt, pluralize } from "@/lib/utils";
import { AdvancedBadge, cfu, nextOf, STATUS_ORDER, StatusCounts, statusCount, STATUS_RANK, SUBJECT_ICONS, TopicStrip } from "./shared";

export function SubjectsOverview() {
  const hydrated = useHydrated();
  const all = useTopicStates();
  const states: TopicState[] = hydrated ? all : all.map((s) => ({ ...s, mastery: 0, status: "nuovo" as const }));
  const mastery = programMastery(states);
  const openStartStudy = useUI((s) => s.openStartStudy);

  // The single next step of the whole programme: the most urgent status first,
  // then the subject that is furthest behind, then syllabus order.
  const perSubject = SUBJECTS.map((s) => ({ subject: s, next: nextOf(states.filter((x) => x.ref.subject.id === s.id)) }));
  const next = perSubject
    .filter((p) => p.next)
    .sort((a, b) => STATUS_RANK[a.next!.status] - STATUS_RANK[b.next!.status] || mastery.bySubject[a.subject.id] - mastery.bySubject[b.subject.id])[0]?.next;
  const started = states.some((s) => s.status !== "nuovo");

  return (
    <div className="pb-6">
      <PageHeader
        title="Le mie materie"
        description="I 18 CFU del semestre filtro 2026/27, ordinati come il syllabus MUR. Un argomento avanza solo quando lo verifichi con quiz, richiamo attivo o flashcard, non con la sola lettura."
      />

      {/* Programme: mastery along the meridian, and the one thing to do next. */}
      <section aria-labelledby="programma-titolo" className="card mt-8 grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-10">
        <div className="min-w-0">
          <h2 id="programma-titolo" className="text-sm font-medium text-fg-muted">
            Padronanza del programma
          </h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {hydrated ? (
              <span className="font-display text-5xl leading-none text-fg">{fmt.percent(mastery.total)}</span>
            ) : (
              <Skeleton className="h-12 w-24" />
            )}
            <span className="text-ui text-fg-subtle">media pesata per CFU su {states.length} argomenti</span>
          </div>
          <Meridian value={hydrated ? mastery.total : 0} label="Padronanza del programma" className="mt-6" />
          {hydrated ? <StatusCounts states={states} className="mt-4" /> : <Skeleton className="mt-4 h-5 w-72 max-w-full" />}
        </div>

        <div className="min-w-0 border-t border-white/[0.07] pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <h2 className="text-sm font-medium text-fg-muted">{started ? "Prossimo passo" : "Da dove iniziare"}</h2>
          {hydrated && next ? (
            <>
              <Link
                href={`/materie/${next.ref.subject.id}/${next.ref.topic.id}`}
                className="mt-2 block font-display text-2xl leading-snug text-fg underline-offset-4 hover:underline"
              >
                {next.ref.topic.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-ui text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", TONE[SUBJECT_TONE[next.ref.subject.id]].dot)} aria-hidden />
                  {next.ref.subject.name}, unità {next.ref.unit.number}
                </span>
                {next.status !== "nuovo" && <StatusBadge status={next.status} />}
              </div>
              <Button variant="primary" size="lg" className="mt-5 w-full sm:w-auto" onClick={() => openStartStudy({ subject: next.ref.subject.id, topicId: next.ref.topic.id })}>
                <Play className="h-4 w-4 fill-current" aria-hidden /> {started ? "Continua a studiare" : "Inizia a studiare"}
              </Button>
              {!started && <p className="mt-3 text-ui text-fg-subtle">Oppure scegli una materia qui sotto e parti dall’unità che preferisci.</p>}
            </>
          ) : hydrated ? (
            <p className="mt-2 text-sm text-fg-muted">Hai consolidato tutti gli argomenti. Ripassa con le flashcard per mantenerli.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-48" />
            </div>
          )}
        </div>
      </section>

      {/* Subjects: one plate each. The identity column can later host a 3:2 image above the name. */}
      <section aria-labelledby="materie-titolo" className="mt-12">
        <h2 id="materie-titolo" className="mb-4 text-base font-semibold text-fg">
          Materie
        </h2>
        <ul className="space-y-5">
          {SUBJECTS.map((s) => {
            const list = states.filter((x) => x.ref.subject.id === s.id);
            const tone = SUBJECT_TONE[s.id];
            const Icon = SUBJECT_ICONS[s.id];
            const lessons = list.filter((x) => hasLesson(x.ref.topic.id)).length;
            const subjNext = perSubject.find((p) => p.subject.id === s.id)?.next;
            const m = mastery.bySubject[s.id];
            const hero = imageForSubject(s.id);
            const touched = STATUS_ORDER.filter((st) => st !== "nuovo")
              .map((st) => ({ st, n: list.filter((x) => x.status === st).length }))
              .filter((x) => x.n > 0);
            return (
              <li key={s.id}>
                <article aria-labelledby={`materia-${s.id}`} className="card grid overflow-hidden lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
                  <div className="flex flex-col lg:border-r lg:border-white/[0.07]">
                    {hero && <ScienceFigure image={hero} aspect="21/9" rounded="none" sizes="(min-width: 1024px) 21rem, 100vw" className="border-b border-white/[0.07]" />}
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-control border", TONE[tone].bg, TONE[tone].text, TONE[tone].border)}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <h3 id={`materia-${s.id}`} className="font-display text-3xl leading-tight text-fg">
                        {s.name}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-fg-muted">{s.tagline}</p>
                    <p className="mt-2 text-ui text-fg-subtle">
                      {s.cfu} CFU, {pluralize(s.units.length, "unità", "unità")}, {pluralize(list.length, "argomento", "argomenti")}, {pluralize(lessons, "lezione ATLAS completa", "lezioni ATLAS complete")}
                    </p>

                    <div className="mt-6">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-ui text-fg-muted">Padronanza</span>
                        {hydrated ? <span className="text-base font-semibold text-fg">{fmt.percent(m)}</span> : <Skeleton className="h-5 w-10" />}
                      </div>
                      <ProgressBar value={hydrated ? m : 0} tone={tone} size="sm" className="mt-2" label={`Padronanza di ${s.name}`} />
                      <TopicStrip states={list} className="mt-3" />
                      <p className="mt-2 text-xs text-fg-subtle">
                        {touched.length ? touched.map((t) => statusCount(t.st, t.n)).join(", ") + ", " : ""}
                        {statusCount("nuovo", list.filter((x) => x.status === "nuovo").length)}
                      </p>
                    </div>

                    {hydrated && subjNext && (
                      <div className="mt-6 border-t border-white/[0.07] pt-4">
                        <div className="text-xs text-fg-subtle">Prossimo argomento</div>
                        <Link
                          href={`/materie/${s.id}/${subjNext.ref.topic.id}`}
                          className="mt-1 line-clamp-2 text-sm font-medium text-fg underline-offset-4 hover:underline"
                        >
                          {subjNext.ref.topic.title}
                        </Link>
                      </div>
                    )}

                    <div className="pt-5 lg:mt-auto">
                      <Button variant="secondary" href={`/materie/${s.id}`} className="w-full" aria-label={`Apri il programma di ${s.name}`}>
                        Apri il programma
                      </Button>
                    </div>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.07] p-2 sm:p-3 lg:border-t-0">
                    <h4 className="px-3 pb-1 pt-2 text-xs font-medium text-fg-subtle">Unità didattiche</h4>
                    <ol>
                      {s.units.map((u) => {
                        const ul = list.filter((x) => x.ref.unit.id === u.id);
                        const um = ul.reduce((a, x) => a + x.mastery, 0) / Math.max(1, ul.length);
                        return (
                          <li key={u.id}>
                            <Link
                              href={`/materie/${s.id}#${u.id}`}
                              className="group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.04]"
                            >
                              <span className="self-start pt-px text-ui tabular-nums text-fg-subtle">{u.number}</span>
                              <span className="min-w-0">
                                <span className="line-clamp-2 text-sm text-fg-reading group-hover:text-fg">{u.title}</span>
                                <span className="mt-0.5 block text-xs text-fg-subtle">
                                  {cfu(u.cfu)}, {pluralize(ul.length, "argomento", "argomenti")}
                                </span>
                              </span>
                              <span className="flex items-center gap-2.5">
                                <ProgressBar value={hydrated ? um : 0} tone={tone} size="sm" className="hidden w-16 sm:block" label={`Padronanza unità ${u.number}`} />
                                <span className="w-9 text-right text-ui tabular-nums text-fg-muted">{hydrated ? fmt.percent(um) : ""}</span>
                                <ChevronRight className="h-4 w-4 text-fg-faint transition-colors group-hover:text-fg-muted" aria-hidden />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Source of the programme and how to read the content. */}
      <section aria-labelledby="fonte-titolo" className="mt-12 grid gap-6 border-t border-white/[0.07] pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <h2 id="fonte-titolo" className="text-base font-semibold text-fg">
            Fonte del programma
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-fg-muted">
            {SYLLABUS_SOURCE.label}, pubblicato dal MUR il {fmt.dateYear(SYLLABUS_SOURCE.published)}. Il testo degli argomenti è riportato con sole correzioni tipografiche; il raggruppamento in capitoli è editoriale. Verificato il{" "}
            {fmt.dateYear(SYLLABUS_SOURCE.verifiedOn)}.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            <li>
              <Button variant="outline" size="sm" href={SYLLABUS_SOURCE.pageUrl} external>
                Notizia MUR <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">(si apre in una nuova scheda)</span>
              </Button>
            </li>
            {SUBJECTS.map((s) => (
              <li key={s.id}>
                <Button variant="outline" size="sm" href={SYLLABUS_SOURCE.pdf[s.id]} external>
                  PDF {s.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">(si apre in una nuova scheda)</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-base font-semibold text-fg">Come leggere i contenuti</h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-fg-muted">
            Tutto ciò che trovi nelle materie segue il programma ufficiale, quindi non è segnato. I contenuti che vanno oltre il syllabus, utili per capire ma non richiesti all’esame, hanno questa etichetta:
          </p>
          <AdvancedBadge className="mt-3" />
        </div>
      </section>
    </div>
  );
}
