"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, BookText, Calculator, Clock, ExternalLink, FileText, GalleryVerticalEnd, Image as ImageIcon, Lightbulb, ListChecks,
  MonitorPlay, Play, Plus, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import type { Source } from "@/lib/types";
import { getTopicRef, SYLLABUS_SOURCE } from "@/data/syllabus";
import { getLesson } from "@/data/lessons";
import { questionsFor } from "@/data/questions";
import { getResource, resourcesForTopic } from "@/data/resources";
import { MODE_INFO } from "@/data/academy";
import { AiExplain, Definitions, Objectives, Schema, SectionsView } from "@/components/study/steps";
import { LessonDiagram, DIAGRAM_CAPTION } from "@/components/diagrams/diagrams";
import { ConceptMapView } from "@/components/exercises/concept-map";
import { FlipCards, GuidedProblems } from "@/components/exercises/prompts";
import { QuizRunner } from "@/components/exercises/quiz-runner";
import { ResourceCard } from "@/components/resources/resource-card";
import { Badge, Button, Card, Notice, ProgressRing } from "@/components/ui/primitives";
import { Paragraphs, RichText } from "@/components/ui/rich-text";
import { StatusBadge } from "@/components/ui/status";
import { MODE_TONE, SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { toast } from "@/components/ui/toast";
import { useHydrated, useTopicStates } from "@/lib/hooks";
import { useRecordQuiz } from "@/lib/record";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { cn, fmt } from "@/lib/utils";

type TabId = "panoramica" | "spiegazione" | "esempi" | "diagrammi" | "video" | "flashcard" | "quiz" | "approfondimenti" | "fonti";

const TAB_META: Record<TabId, { label: string; icon: typeof BookOpen }> = {
  panoramica: { label: "Lezione introduttiva", icon: BookOpen },
  spiegazione: { label: "Spiegazione", icon: BookText },
  esempi: { label: "Esempi ed esercizi", icon: Calculator },
  diagrammi: { label: "Diagrammi e mappa", icon: ImageIcon },
  video: { label: "Video e corsi", icon: MonitorPlay },
  flashcard: { label: "Flashcard", icon: GalleryVerticalEnd },
  quiz: { label: "Quiz", icon: ListChecks },
  approfondimenti: { label: "Approfondimenti", icon: Sparkles },
  fonti: { label: "Fonti", icon: FileText },
};

function SourceItem({ s }: { s: Source }) {
  const href = s.url ?? (s.doi ? `https://doi.org/${s.doi}` : undefined);
  const kind = { ufficiale: "Fonte ufficiale", manuale: "Manuale", articolo: "Articolo scientifico", "risorsa-aperta": "Risorsa aperta" }[s.kind];
  return (
    <li className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={s.kind === "ufficiale" ? "azure" : "muted"}>{kind}</Badge>
        {s.doi && <span className="font-mono text-[11px] text-fg-subtle">doi:{s.doi}</span>}
      </div>
      <div className="mt-2 text-[13.5px] leading-relaxed text-fg">{s.label}</div>
      {s.detail && <div className="mt-1 text-[12.5px] text-fg-subtle">{s.detail}</div>}
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-azure-300 hover:underline">
          Apri la fonte <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </li>
  );
}

export function TopicPage({ topicId }: { topicId: string }) {
  const ref = getTopicRef(topicId)!;
  const lesson = getLesson(topicId);
  const hydrated = useHydrated();
  const states = useTopicStates(ref.subject.id);
  const state = hydrated ? states.find((s) => s.ref.topic.id === topicId) : undefined;
  const progress = useAtlas((s) => (hydrated ? s.progress[topicId] : undefined));
  const addCards = useAtlas((s) => s.addCards);
  const openProfessor = useUI((s) => s.openProfessor);
  const showAdvanced = useAtlas((s) => s.settings.showAdvanced);
  const recordQuiz = useRecordQuiz();
  const tone = SUBJECT_TONE[ref.subject.id];

  const questions = useMemo(() => questionsFor({ topicIds: [topicId] }), [topicId]);
  const resources = useMemo(() => {
    const fromLesson = (lesson?.videoIds ?? []).map((id) => getResource(id)).filter((r): r is NonNullable<typeof r> => !!r);
    const seen = new Set<string>();
    return [...fromLesson, ...resourcesForTopic(topicId, ref.subject.id)].filter((r) => r.access === "free" && !seen.has(r.id) && seen.add(r.id));
  }, [lesson, topicId, ref.subject.id]);

  const tabs: TabId[] = lesson
    ? ["panoramica", "spiegazione", "esempi", "diagrammi", "video", "flashcard", "quiz", ...(showAdvanced ? (["approfondimenti"] as TabId[]) : []), "fonti"]
    : ["panoramica", "video", ...(questions.length ? (["quiz"] as TabId[]) : []), "fonti"];
  const [tab, setTab] = useState<TabId>("panoramica");
  const [quizKey, setQuizKey] = useState(0);

  // Deep links: /materie/biologia/bio-mitocondri#quiz
  useEffect(() => {
    const h = window.location.hash.slice(1) as TabId;
    if (h && h in TAB_META) setTab(h);
  }, []);
  const select = (t: TabId) => {
    setTab(t);
    window.history.replaceState(null, "", `#${t}`);
  };

  const readCount = lesson ? lesson.sections.filter((s) => progress?.sectionsRead.includes(s.id)).length : 0;

  return (
    <div className="pb-16">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-fg-subtle" aria-label="Percorso">
        <Link href="/materie" className="inline-flex items-center gap-1 hover:text-fg"><ArrowLeft className="h-3.5 w-3.5" /> Materie</Link>
        <span>/</span>
        <Link href={`/materie/${ref.subject.id}`} className={cn("hover:underline", TONE[tone].text)}>{ref.subject.name}</Link>
        <span>/</span>
        <Link href={`/materie/${ref.subject.id}#${ref.unit.id}`} className="hover:text-fg">Unità {ref.unit.number}</Link>
        <span className="hidden sm:inline">/</span>
        <span className="hidden sm:inline">{ref.chapter.title}</span>
      </nav>

      <header className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 animate-fade-up">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="azure"><ShieldCheck className="h-3 w-3" /> PROGRAMMA UFFICIALE</Badge>
            {state && <StatusBadge status={state.status} />}
            {lesson ? (
              <Badge tone="muted"><Clock className="h-3 w-3" /> Lettura ~{lesson.readingMinutes} min</Badge>
            ) : (
              <Badge tone="warning">Lezione ATLAS in preparazione</Badge>
            )}
          </div>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] text-fg md:text-5xl">{ref.topic.title}</h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-fg-subtle">
            {ref.unit.title} · {ref.unit.cfu} CFU
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(["fast", "deep", "ultra"] as const).map((m) => (
              <Button key={m} variant={m === "deep" ? "primary" : "secondary"} href={`/studio/${topicId}?mode=${m}`}>
                <Play className={cn("h-3.5 w-3.5 fill-current", m !== "deep" && TONE[MODE_TONE[m]].text)} /> {MODE_INFO[m].name}
              </Button>
            ))}
            <Button variant="ghost" onClick={() => openProfessor({ topicId })}>
              <Sparkles className="h-4 w-4 text-azure-300" /> Chiedi al Professor
            </Button>
          </div>
        </div>
        <Card className="flex items-center gap-4 self-start p-4 lg:w-72">
          <ProgressRing value={state?.mastery ?? 0} size={72} stroke={7} tone={tone} label="Padronanza">
            <span className="font-mono text-[15px] text-fg">{fmt.percent(state?.mastery ?? 0)}</span>
          </ProgressRing>
          <div className="min-w-0 text-[12.5px] leading-relaxed text-fg-subtle">
            <div className="text-[13px] font-medium text-fg">Padronanza</div>
            {progress?.quiz.length ? <div>Ultimo quiz: {fmt.percent(progress.quiz.at(-1)!.score)}</div> : <div>Nessun quiz svolto</div>}
            {lesson && <div>Sezioni lette: {readCount}/{lesson.sections.length}</div>}
            <div className="text-[11.5px]">La lettura non aumenta la padronanza.</div>
          </div>
        </Card>
      </header>

      {/* Tabs */}
      <div className="sticky top-14 z-10 -mx-4 mt-8 border-b border-white/[0.06] bg-ink-950/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-10 lg:px-10">
        <div className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Sezioni dell’argomento">
          {tabs.map((t) => {
            const Icon = TAB_META[t].icon;
            const active = t === tab;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => select(t)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3 text-[13px] transition",
                  active ? "text-fg" : "text-fg-subtle hover:text-fg-muted",
                  t === "approfondimenti" && (active ? "text-gold-200" : "text-gold-300/70"),
                )}
              >
                <Icon className="h-4 w-4" /> {TAB_META[t].label}
                {active && <span className={cn("absolute inset-x-2 bottom-0 h-0.5 rounded-full", t === "approfondimenti" ? "bg-gold-400" : "bg-azure-400")} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "panoramica" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              {lesson ? (
                <>
                  <section>
                    <h2 className="font-display text-[1.9rem] text-fg">Introduzione</h2>
                    <Paragraphs items={lesson.intro} className="mt-3" />
                  </section>
                  <section>
                    <h2 className="mb-3 font-display text-[1.6rem] text-fg">Concetti chiave</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {lesson.keyConcepts.map((k) => (
                        <li key={k} className="flex gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 text-[13.5px] text-fg-muted">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" /> <RichText text={k} />
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h2 className="mb-3 font-display text-[1.6rem] text-fg">Schema</h2>
                    <Schema lesson={lesson} />
                  </section>
                  <section>
                    <h2 className="mb-3 font-display text-[1.6rem] text-fg">Definizioni</h2>
                    <Definitions lesson={lesson} />
                  </section>
                </>
              ) : (
                <>
                  <Notice tone="info" title="Lezione completa in preparazione">
                    Per questo argomento ATLAS non ha ancora una lezione scritta e revisionata. Trovi qui il testo ufficiale del syllabus, i sottoargomenti da coprire, le risorse verificate e — se configurato — l’AI Professor, che spiega a partire dal syllabus e segnala le incertezze.
                  </Notice>
                  <Card className="p-5">
                    <AiExplain ref={ref} />
                  </Card>
                </>
              )}
            </div>
            <aside className="space-y-4">
              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-fg"><Target className="h-4 w-4 text-azure-300" /> Obiettivi del syllabus</div>
                <Objectives ref={ref} lesson={lesson} />
              </Card>
            </aside>
          </div>
        )}

        {tab === "spiegazione" && lesson && (
          <div className="mx-auto max-w-3xl">
            <SectionsView lesson={lesson} topicId={topicId} />
            <Notice tone="info" className="mt-10">Segnare una sezione come letta aiuta a orientarti, ma non cambia la padronanza: per quella servono quiz e richiamo attivo.</Notice>
          </div>
        )}

        {tab === "esempi" && lesson && (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 font-display text-[1.6rem] text-fg">Esempi e applicazioni</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {lesson.examples.map((e) => (
                  <Card key={e.title} className="p-5">
                    <div className="text-[14.5px] font-semibold text-fg">{e.title}</div>
                    <RichText text={e.body} className="mt-2 block text-[13.5px] leading-relaxed text-fg-muted" />
                  </Card>
                ))}
              </div>
            </section>
            {lesson.guidedProblems.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-[1.6rem] text-fg">Problemi guidati</h2>
                <GuidedProblems problems={lesson.guidedProblems} />
              </section>
            )}
          </div>
        )}

        {tab === "diagrammi" && lesson && (
          <div className="space-y-8">
            {lesson.diagram && (
              <Card className="p-5">
                <LessonDiagram kind={lesson.diagram} />
                <p className="mt-3 text-[12.5px] leading-relaxed text-fg-subtle">{DIAGRAM_CAPTION[lesson.diagram]}</p>
              </Card>
            )}
            <section>
              <h2 className="mb-3 font-display text-[1.6rem] text-fg">Mappa concettuale</h2>
              <Card className="p-4">
                <ConceptMapView map={lesson.conceptMap} />
              </Card>
            </section>
          </div>
        )}

        {tab === "video" && (
          <div>
            {resources.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {resources.map((r) => <ResourceCard key={r.id} r={r} />)}
              </div>
            ) : (
              <Notice tone="info">Nessuna risorsa del catalogo verificato è collegata a questo argomento.</Notice>
            )}
            <Button variant="secondary" className="mt-6" href={`/risorse?topic=${topicId}`}>
              <MonitorPlay className="h-4 w-4" /> Cerca altre videolezioni e corsi
            </Button>
          </div>
        )}

        {tab === "flashcard" && lesson && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13.5px] text-fg-muted">Gira le carte e prova a rispondere prima di vedere il retro. Aggiungile al mazzo per la ripetizione dilazionata.</p>
              <Button
                variant="primary"
                onClick={() => {
                  const n = addCards(lesson.flashcards.map((f) => ({ front: f.front, back: f.back, topicId, subject: ref.subject.id, deck: ref.topic.title, origin: "atlas" as const })));
                  toast(n ? `${n} flashcard aggiunte al ripasso` : "Flashcard già presenti nel mazzo", { tone: n ? "success" : "info" });
                }}
              >
                <Plus className="h-4 w-4" /> Aggiungi tutte al ripasso
              </Button>
            </div>
            <FlipCards cards={lesson.flashcards} topicId={topicId} subject={ref.subject.id} deck={ref.topic.title} />
          </div>
        )}

        {tab === "quiz" && (
          <div className="mx-auto max-w-3xl space-y-3">
            {questions.length ? (
              <>
                <p className="text-[12.5px] text-fg-subtle">
                  {questions.length} quesiti originali ATLAS nel formato d’esame (risposta multipla a 5 opzioni e completamento). Non sono quesiti ministeriali.
                </p>
                <QuizRunner
                  key={quizKey}
                  questions={questions}
                  variant="progressive"
                  title={`Quiz · ${ref.topic.title}`}
                  seed={quizKey + 1}
                  onFinish={(o) => recordQuiz(o, { kind: "quiz", title: `Quiz · ${ref.topic.title}`, subject: ref.subject.id })}
                />
                <Button variant="ghost" size="sm" onClick={() => setQuizKey((k) => k + 1)}>Ricomincia con un altro ordine</Button>
              </>
            ) : (
              <Notice tone="info">La banca ATLAS non contiene ancora quesiti per questo argomento. Puoi esercitarti con il quiz misto di {ref.subject.name}.</Notice>
            )}
          </div>
        )}

        {tab === "approfondimenti" && lesson && (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-2xl border border-gold-400/30 bg-gold-500/[0.06] p-4 text-[13px] leading-relaxed text-gold-100/80">
              <Badge tone="gold" className="mb-2"><Sparkles className="h-3 w-3" /> APPROFONDIMENTO AVANZATO</Badge>
              <p>Questi contenuti vanno oltre il programma ufficiale: servono a capire meglio, ma non sono richiesti dal syllabus del semestre filtro.</p>
            </div>
            {lesson.advanced.map((a) => (
              <Card key={a.title} className="border-gold-400/20 p-6">
                <h2 className="font-display text-[1.6rem] text-gold-100">{a.title}</h2>
                <Paragraphs items={a.body} className="mt-3" />
              </Card>
            ))}
          </div>
        )}

        {tab === "fonti" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-fg">Programma</h2>
              <ul className="space-y-3">
                <SourceItem s={{ label: `${SYLLABUS_SOURCE.label} — ${ref.subject.name}`, url: SYLLABUS_SOURCE.pdf[ref.subject.id], detail: `Pubblicato il ${fmt.dateYear(SYLLABUS_SOURCE.published)}, verificato il ${fmt.dateYear(SYLLABUS_SOURCE.verifiedOn)}.`, kind: "ufficiale" }} />
              </ul>
            </section>
            {lesson && (
              <section>
                <h2 className="mb-3 text-[15px] font-semibold text-fg">Fonti della lezione</h2>
                <ul className="space-y-3">
                  {lesson.sources.map((s) => <SourceItem key={s.label} s={s} />)}
                </ul>
              </section>
            )}
            {!lesson && (
              <Notice tone="info">Le fonti della lezione saranno elencate quando la lezione ATLAS sarà pubblicata. Nel frattempo usa i manuali aperti e i corsi della scheda «Video e corsi».</Notice>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
