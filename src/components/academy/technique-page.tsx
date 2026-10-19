"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, BookMarked, Brain, CheckCircle2, ExternalLink, GraduationCap, Lightbulb, ListOrdered, Play, Target } from "lucide-react";
import { getTechnique, MODE_INFO, TECHNIQUES, type Technique } from "@/data/academy";
import { getLesson, LESSONS } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import { TechniqueArt } from "./technique-art";
import { EVIDENCE_TONE } from "./academy-index";
import { FeynmanExercise } from "@/components/exercises/feynman";
import { MemoryPalace } from "@/components/exercises/memory-palace";
import { FreeRecall, ForgettingCurveSim, InterleavingExercise, LabelDiagramExercise, OralExam } from "@/components/exercises/more";
import { RevealPrompts } from "@/components/exercises/prompts";
import { CornellEditor } from "@/components/exercises/cornell";
import { ConceptMapBuilder } from "@/components/exercises/concept-map";
import { Badge, Button, Card, Select } from "@/components/ui/primitives";
import { Paragraphs, RichText } from "@/components/ui/rich-text";
import { MODE_TONE } from "@/components/ui/tone";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

/** Topic picker limited to topics with a full ATLAS lesson (the exercises need its content). */
function LessonTopicSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] text-fg-subtle">Argomento:</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-auto min-w-[260px] text-[13px]" aria-label="Argomento dell’esercizio">
        {LESSONS.map((l) => (
          <option key={l.topicId} value={l.topicId}>
            {getTopicRef(l.topicId)?.subject.name} · {getTopicRef(l.topicId)?.topic.title}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Exercise({ t }: { t: Technique }) {
  const [topicId, setTopicId] = useState(t.exercise === "self-explain" ? "fis-idrodinamica" : "bio-mitocondri");
  const lesson = getLesson(topicId)!;
  const recordRecall = useAtlas((s) => s.recordRecallScore);
  const picker = <LessonTopicSelect value={topicId} onChange={setTopicId} />;
  const withPicker = (node: ReactNode) => (
    <div className="space-y-4">
      {picker}
      <div key={topicId}>{node}</div>
    </div>
  );

  switch (t.exercise) {
    case "feynman":
      return <FeynmanExercise />;
    case "palace":
      return <MemoryPalace />;
    case "recall":
      return withPicker(<FreeRecall topicId={topicId} />);
    case "spacing":
      return <ForgettingCurveSim />;
    case "interleaving":
      return <InterleavingExercise />;
    case "dual":
      return <LabelDiagramExercise />;
    case "why":
      return withPicker(
        <RevealPrompts label="Perché" intro="Prova a spiegare il perché prima di leggere la risposta, poi valuta la tua risposta." items={lesson.elaborative.map((e) => ({ prompt: e.question, answer: e.answer }))} onComplete={(s) => recordRecall(topicId, s)} />,
      );
    case "self-explain":
      return withPicker(
        <RevealPrompts label="Passaggio" intro="Per ogni passaggio dell’esempio svolto, spiega a te stesso cosa succede e perché." items={lesson.selfExplanation.map((s) => ({ prompt: `${s.step}\n\n**${s.prompt}**`, answer: s.modelAnswer }))} onComplete={(s) => recordRecall(topicId, s)} />,
      );
    case "cornell":
      return withPicker(<CornellEditor topicId={topicId} seedCues={lesson.activeRecall.map((a) => a.prompt)} />);
    case "concept-map":
      return withPicker(<ConceptMapBuilder reference={lesson.conceptMap} />);
    case "oral":
      return withPicker(<OralExam topicId={topicId} />);
  }
}

function Block({ id, icon, title, children, className }: { id: string; icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        <span className="text-azure-300">{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

const TOC = [
  ["descrizione", "Descrizione"],
  ["principi", "Principi cognitivi"],
  ["tutorial", "Tutorial"],
  ["esempio", "Esempio"],
  ["esercizio", "Esercizio"],
  ["quando", "Quando usarla"],
  ["limiti", "Limiti ed errori"],
  ["fonti", "Fonti"],
] as const;

export function TechniquePage({ id }: { id: string }) {
  const t = getTechnique(id)!;
  const idx = TECHNIQUES.findIndex((x) => x.id === id);
  const prev = TECHNIQUES[(idx - 1 + TECHNIQUES.length) % TECHNIQUES.length];
  const next = TECHNIQUES[(idx + 1) % TECHNIQUES.length];
  const [step, setStep] = useState(0);
  const openStartStudy = useUI((s) => s.openStartStudy);

  return (
    <div className="pb-16">
      <Link href="/academy" className="inline-flex items-center gap-1.5 text-[13px] text-fg-subtle hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Study Academy
      </Link>

      <header className="mt-4 grid items-center gap-6 lg:grid-cols-[1fr_440px]">
        <div className="animate-fade-up">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={EVIDENCE_TONE[t.evidence.level]}>Evidenza {t.evidence.level}</Badge>
            {t.modes.map((m) => (
              <Badge key={m} tone={MODE_TONE[m]}>{MODE_INFO[m].name}</Badge>
            ))}
          </div>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] text-fg">{t.name}</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-fg-muted">{t.tagline}</p>
          <p className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-[13px] leading-relaxed text-fg-subtle">
            <strong className="font-medium text-fg-muted">Cosa dice la ricerca. </strong>
            {t.evidence.note}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" href="#esercizio">
              <Play className="h-4 w-4 fill-current" /> Prova l’esercizio
            </Button>
            <Button variant="secondary" onClick={() => openStartStudy({ mode: t.modes[0] })}>
              Usala in una sessione {MODE_INFO[t.modes[0]].name}
            </Button>
          </div>
        </div>
        <Card className="aspect-[16/9] overflow-hidden bg-ink-900">
          <TechniqueArt icon={t.icon} className="h-full w-full" />
        </Card>
      </header>

      <nav className="no-scrollbar -mx-4 mt-8 flex gap-1 overflow-x-auto border-y border-white/[0.05] px-4 py-2 sm:mx-0 sm:rounded-2xl sm:border" aria-label="Indice">
        {TOC.map(([a, label]) => (
          <a key={a} href={`#${a}`} className="shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] text-fg-subtle transition hover:bg-white/[0.05] hover:text-fg">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-14">
        <Block id="descrizione" icon={<BookMarked className="h-4 w-4" />} title="Descrizione">
          <Paragraphs items={t.description} className="max-w-3xl" />
        </Block>

        <Block id="principi" icon={<Brain className="h-4 w-4" />} title="Principi cognitivi">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {t.principles.map((p) => (
              <Card key={p.title} className="p-5">
                <div className="text-[14.5px] font-semibold text-fg">{p.title}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{p.text}</p>
              </Card>
            ))}
          </div>
        </Block>

        <Block id="tutorial" icon={<ListOrdered className="h-4 w-4" />} title="Tutorial passo per passo">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <ol className="space-y-1.5">
              {t.steps.map((s, i) => (
                <li key={s.title}>
                  <button
                    onClick={() => setStep(i)}
                    aria-current={i === step}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] transition",
                      i === step ? "bg-azure-500/12 text-fg" : "text-fg-subtle hover:bg-white/[0.04] hover:text-fg-muted",
                    )}
                  >
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border font-mono text-[11px]", i < step ? "border-emerald-400/40 text-emerald-300" : i === step ? "border-azure-400/60 text-azure-200" : "border-white/10")}>
                      {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ol>
            <Card className="flex flex-col p-6">
              <div className="font-mono text-[12px] text-azure-300">Passo {step + 1} di {t.steps.length}</div>
              <div key={step} className="animate-fade-up">
                <div className="mt-2 font-display text-[1.9rem] leading-tight text-fg">{t.steps[step].title}</div>
                <p className="mt-3 text-[15px] leading-relaxed text-fg-muted"><RichText text={t.steps[step].text} /></p>
              </div>
              <div className="mt-auto flex gap-2 pt-6">
                <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft className="h-4 w-4" /> Indietro
                </Button>
                {step < t.steps.length - 1 ? (
                  <Button variant="secondary" size="sm" onClick={() => setStep((s) => s + 1)}>
                    Passo successivo <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" href="#esercizio">
                    Mettilo in pratica <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </Block>

        <Block id="esempio" icon={<GraduationCap className="h-4 w-4" />} title="Esempio universitario">
          <Card className="max-w-3xl p-6">
            <div className="text-[15px] font-semibold text-fg">{t.example.title}</div>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted"><RichText text={t.example.text} /></p>
          </Card>
        </Block>

        <Block id="esercizio" icon={<Target className="h-4 w-4" />} title="Esercizio interattivo con feedback">
          <Card className="p-5 sm:p-6">
            <Exercise t={t} />
          </Card>
        </Block>

        <div className="grid gap-6 lg:grid-cols-2">
          <Block id="quando" icon={<Lightbulb className="h-4 w-4" />} title="Quando usarla">
            <ul className="space-y-2">
              {t.whenToUse.map((w) => (
                <li key={w} className="flex gap-2.5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.04] p-3.5 text-[13.5px] text-fg-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> {w}
                </li>
              ))}
            </ul>
          </Block>
          <Block id="limiti" icon={<AlertTriangle className="h-4 w-4" />} title="Limiti ed errori comuni">
            <ul className="space-y-2">
              {t.limits.map((w) => (
                <li key={w} className="flex gap-2.5 rounded-2xl border border-amber-400/15 bg-amber-500/[0.04] p-3.5 text-[13.5px] text-fg-muted">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> {w}
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <Block id="fonti" icon={<BookMarked className="h-4 w-4" />} title="Fonti scientifiche">
          <ul className="space-y-2">
            {t.sources.map((s) => {
              const href = s.url ?? (s.doi ? `https://doi.org/${s.doi}` : undefined);
              return (
                <li key={s.label} className="flex flex-col gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="text-[13.5px] leading-relaxed text-fg-muted">{s.label}</span>
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 font-mono text-[11.5px] text-azure-300 hover:underline">
                      {s.doi ? `doi:${s.doi}` : "Apri"} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Block>

        <nav className="grid gap-3 border-t border-white/[0.06] pt-8 sm:grid-cols-2" aria-label="Altre tecniche">
          <Link href={`/academy/${prev.id}`} className="group rounded-2xl border border-white/[0.07] p-4 transition hover:border-white/15">
            <div className="flex items-center gap-1.5 text-[12px] text-fg-subtle"><ArrowLeft className="h-3.5 w-3.5" /> Precedente</div>
            <div className="mt-1 text-[15px] text-fg">{prev.name}</div>
          </Link>
          <Link href={`/academy/${next.id}`} className="group rounded-2xl border border-white/[0.07] p-4 text-right transition hover:border-white/15">
            <div className="flex items-center justify-end gap-1.5 text-[12px] text-fg-subtle">Successiva <ArrowRight className="h-3.5 w-3.5" /></div>
            <div className="mt-1 text-[15px] text-fg">{next.name}</div>
          </Link>
        </nav>
      </div>
    </div>
  );
}
