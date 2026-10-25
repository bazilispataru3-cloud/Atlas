"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ExternalLink } from "lucide-react";
import { getTechnique, MODE_INFO, type Technique } from "@/data/academy";
import { getLesson, LESSONS } from "@/data/lessons";
import { getTopicRef, SUBJECTS } from "@/data/syllabus";
import { TechniqueArt } from "./technique-art";
import { EvidenceLevel } from "./academy-index";
import { ACADEMY_ORDER, EXERCISE_INFO, STEP_CHECKS, groupOf } from "./guide";
import { StepCheck } from "./step-check";
import { FeynmanExercise } from "@/components/exercises/feynman";
import { MemoryPalace } from "@/components/exercises/memory-palace";
import { FreeRecall, ForgettingCurveSim, InterleavingExercise, LabelDiagramExercise, OralExam } from "@/components/exercises/more";
import { RevealPrompts } from "@/components/exercises/prompts";
import { CornellEditor } from "@/components/exercises/cornell";
import { ConceptMapBuilder } from "@/components/exercises/concept-map";
import { Button, Meridian, Select } from "@/components/ui/primitives";
import { Paragraphs, RichText } from "@/components/ui/rich-text";
import { useReducedMotion } from "@/lib/hooks";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { capFirst, cn } from "@/lib/utils";

/** Topic picker limited to topics with a full ATLAS lesson (the exercises need its content), grouped by subject. */
function LessonTopicSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const groups = SUBJECTS.map((s) => ({ subject: s, lessons: LESSONS.filter((l) => getTopicRef(l.topicId)?.subject.id === s.id) })).filter((g) => g.lessons.length);
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="text-sm font-medium text-fg-muted">
        Argomento
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="sm:max-w-sm">
        {groups.map((g) => (
          <optgroup key={g.subject.id} label={g.subject.name}>
            {g.lessons.map((l) => (
              <option key={l.topicId} value={l.topicId}>
                {getTopicRef(l.topicId)?.topic.title}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </div>
  );
}

function Exercise({ t }: { t: Technique }) {
  const [topicId, setTopicId] = useState(t.exercise === "self-explain" ? "fis-idrodinamica" : "bio-mitocondri");
  const lesson = getLesson(topicId)!;
  const recordRecall = useAtlas((s) => s.recordRecallScore);
  const withPicker = (node: ReactNode) => (
    <div className="space-y-6">
      <LessonTopicSelect value={topicId} onChange={setTopicId} />
      <div key={topicId} className="border-t border-white/[0.07] pt-6">
        {node}
      </div>
    </div>
  );

  switch (t.exercise) {
    case "feynman":
      return withPicker(<FeynmanExercise topicId={topicId} />);
    case "palace":
      return <MemoryPalace />;
    case "recall":
      return withPicker(<FreeRecall topicId={topicId} />);
    case "spacing":
      return <ForgettingCurveSim />;
    case "interleaving":
      // The eight problems are about fluids: the score counts for that topic.
      return <InterleavingExercise onComplete={(s) => recordRecall("fis-idrodinamica", s)} />;
    case "dual":
      // The diagram is the mitochondrion of the "Mitocondri" lesson.
      return <LabelDiagramExercise onComplete={(s) => recordRecall("bio-mitocondri", s)} />;
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
      return withPicker(<ConceptMapBuilder reference={lesson.conceptMap} topicId={topicId} />);
    case "oral":
      return withPicker(<OralExam topicId={topicId} />);
  }
}

const TOC = [
  ["metodo", "Il metodo"],
  ["guida", "Guida"],
  ["esercizio", "Esercizio"],
  ["quando", "Quando usarla"],
  ["perche", "Perché funziona"],
  ["fonti", "Fonti"],
] as const;

/** Highlights the section currently under the sticky bars. */
function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = ids.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-128px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

function SectionHeading({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} tabIndex={-1} className={cn("text-2xl font-semibold tracking-[-0.015em] text-fg text-balance focus-visible:outline-offset-4", className)}>
      {children}
    </h2>
  );
}

/** Moves focus to an element and brings it into view (smoothly unless motion is reduced). */
function focusAndReveal(el: HTMLElement | null, reduced: boolean, block: ScrollLogicalPosition = "start") {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block, behavior: reduced ? "auto" : "smooth" });
}

function Guide({ t, onFinish, firstStepRef }: { t: Technique; onFinish: () => void; firstStepRef: RefObject<HTMLButtonElement | null> }) {
  const checks = STEP_CHECKS[t.id] ?? [];
  const n = t.steps.length;
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<boolean[]>(() => t.steps.map(() => false));
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const doneCount = done.filter(Boolean).length;

  const go = (i: number) => {
    setActive(i);
    requestAnimationFrame(() => focusAndReveal(heads.current[i], reduced, "start"));
  };
  const advance = () => {
    setDone((d) => d.map((v, k) => (k === active ? true : v)));
    if (active < n - 1) go(active + 1);
    else onFinish();
  };

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="relative">
        <Meridian orientation="vertical" value={doneCount / n} label="Avanzamento della guida" className="absolute bottom-6 left-[19px] top-6 h-auto" />
        <ol className="relative space-y-1">
          {t.steps.map((s, i) => {
            const open = i === active;
            const isDone = done[i];
            return (
              <li key={s.title}>
                <h3>
                  <button
                    ref={(el) => {
                      heads.current[i] = el;
                      if (i === 0) firstStepRef.current = el;
                    }}
                    type="button"
                    aria-expanded={open}
                    aria-controls={`passo-${i}`}
                    onClick={() => setActive(i)}
                    className="group flex min-h-12 w-full scroll-mt-32 items-center gap-3.5 rounded-control py-1.5 pr-3 text-left"
                  >
                    <span
                      className={cn(
                        "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-ink-950 text-sm font-semibold tabular-nums transition-colors duration-200",
                        open ? "border-azure-400 text-azure-200" : isDone ? "border-success/50 text-success" : "border-white/[0.14] text-fg-muted group-hover:border-white/30",
                      )}
                    >
                      {isDone && !open ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Completato:</span>
                        </>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className={cn("text-base font-medium transition-colors duration-150 text-balance", open ? "text-fg" : "text-fg-muted group-hover:text-fg")}>{s.title}</span>
                  </button>
                </h3>
                {open && (
                  <div id={`passo-${i}`} className="animate-fade-in pb-6 pl-[3.375rem] pr-1 pt-1">
                    {/* Phones and tablets: the drawing spans the whole column (over the rail) so its labels stay ≥ 12px. */}
                    <div className="relative z-10 mb-4 -ml-[3.375rem] overflow-hidden rounded-card border border-white/[0.07] bg-ink-900 sm:ml-0 sm:max-w-md lg:hidden">
                      <TechniqueArt icon={t.icon} step={i} className="aspect-[16/9] w-full" />
                    </div>
                    <p className="max-w-[60ch] text-reading leading-[1.7] text-fg-reading">
                      <RichText text={s.text} />
                    </p>
                    {checks[i] && <StepCheck key={`${t.id}-${i}`} check={checks[i]} onCorrect={() => requestAnimationFrame(() => nextBtn.current?.focus())} />}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button ref={nextBtn} variant="primary" onClick={advance}>
                        {i < n - 1 ? "Passo successivo" : "Vai all’esercizio"}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Button>
                      {i > 0 && (
                        <Button variant="ghost" onClick={() => go(i - 1)}>
                          Passo precedente
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <figure className="hidden self-start lg:sticky lg:top-32 lg:block">
        <div className="overflow-hidden rounded-panel border border-white/[0.07] bg-ink-900/70">
          <TechniqueArt icon={t.icon} step={active} className="aspect-[16/9] w-full" />
        </div>
        <figcaption className="mt-3 text-sm text-fg-muted">
          Passo {active + 1} di {n}: <span className="text-fg">{t.steps[active].title}</span>
        </figcaption>
      </figure>
    </div>
  );
}

export function TechniquePage({ id }: { id: string }) {
  const t = getTechnique(id)!;
  const group = groupOf(id);
  const idx = ACADEMY_ORDER.findIndex((x) => x.id === id);
  const prev = idx > 0 ? ACADEMY_ORDER[idx - 1] : null;
  const next = idx >= 0 && idx < ACADEMY_ORDER.length - 1 ? ACADEMY_ORDER[idx + 1] : null;
  const openStartStudy = useUI((s) => s.openStartStudy);
  const reduced = useReducedMotion();
  const firstStep = useRef<HTMLButtonElement | null>(null);
  const active = useScrollSpy(TOC.map(([a]) => a));
  const info = EXERCISE_INFO[t.exercise];
  const mode = MODE_INFO[t.modes[0]];

  const startGuide = () => focusAndReveal(firstStep.current, reduced, "center");
  const goExercise = () => focusAndReveal(document.getElementById("esercizio-title"), reduced);

  return (
    <div className="pb-16">
      <Link href="/academy" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg sm:min-h-8">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Study Academy
      </Link>

      <header className="mt-3 max-w-3xl">
        <p className="text-sm text-fg-muted">{group.title}</p>
        <h1 className="mt-1 font-display text-4xl leading-[1.05] tracking-[-0.015em] text-fg text-balance sm:text-5xl">{t.name}</h1>
        <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-fg-muted">{t.tagline}</p>
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <dt className="text-xs text-fg-subtle">Ricerca</dt>
            <dd className="mt-1">
              <a href="#perche" className="inline-flex min-h-6 items-center rounded-sm hover:underline">
                <EvidenceLevel level={t.evidence.level} className="text-sm text-fg" />
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Utile per</dt>
            <dd className="mt-1 text-sm text-fg">{capFirst(t.goals.join(", "))}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Nelle sessioni</dt>
            <dd className="mt-1 text-sm text-fg">{t.modes.map((m) => MODE_INFO[m].name).join(", ")}</dd>
          </div>
        </dl>
        <div className="mt-7 flex flex-wrap gap-2">
          <Button variant="primary" size="lg" onClick={startGuide}>
            Inizia la guida
          </Button>
          <Button variant="secondary" size="lg" onClick={goExercise}>
            Vai all’esercizio
          </Button>
        </div>
      </header>

      <nav aria-label="In questa pagina" className="sticky top-14 z-20 -mx-4 mt-10 border-b border-white/[0.07] bg-ink-950/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <ul className="no-scrollbar fade-x -mx-2 flex overflow-x-auto px-2">
          {TOC.map(([a, label]) => (
            <li key={a} className="shrink-0">
              <a
                href={`#${a}`}
                aria-current={active === a ? "location" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center px-3 text-sm transition-colors duration-150",
                  active === a ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {label}
                <span aria-hidden className={cn("absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-azure-400 transition-opacity duration-200", active === a ? "opacity-100" : "opacity-0")} />
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-12 space-y-20">
        <section id="metodo" aria-labelledby="metodo-title" className="scroll-mt-32">
          <SectionHeading id="metodo-title">Il metodo</SectionHeading>
          <Paragraphs items={t.description} className="mt-4" />
          <figure className="mt-8 max-w-[68ch] border-l-2 border-azure-400/50 pl-5">
            <figcaption className="text-sm font-medium text-fg">{t.example.title}</figcaption>
            <blockquote className="mt-2 text-base leading-relaxed text-fg-reading">
              <RichText text={t.example.text} />
            </blockquote>
          </figure>
        </section>

        <section id="guida" aria-labelledby="guida-title" className="scroll-mt-32">
          <SectionHeading id="guida-title">Guida passo per passo</SectionHeading>
          <p className="mt-2 max-w-[60ch] text-base text-fg-muted">
            {t.steps.length} passi, ognuno con una domanda veloce per verificare di averlo capito. Alla fine passi all’esercizio.
          </p>
          <Guide t={t} firstStepRef={firstStep} onFinish={goExercise} />
        </section>

        <section id="esercizio" aria-labelledby="esercizio-title" className="scroll-mt-32">
          <p className="text-sm font-medium text-azure-300">Esercizio</p>
          <SectionHeading id="esercizio-title" className="mt-1">
            {info.title}
          </SectionHeading>
          <p className="mt-2 max-w-[60ch] text-base text-fg-muted">{info.brief}</p>
          <div className="mt-6 rounded-panel border border-azure-400/25 bg-ink-900/60 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] sm:p-6">
            <Exercise t={t} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[60ch] text-sm text-fg-muted">Vuoi applicarla a un argomento del programma? Avvia una sessione guidata che la usa.</p>
            <Button variant="secondary" onClick={() => openStartStudy({ mode: t.modes[0] })} className="self-start sm:self-auto">
              Usala in {mode.name}
            </Button>
          </div>
        </section>

        <section id="quando" aria-labelledby="quando-title" className="grid scroll-mt-32 gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="quando-title">Quando usarla</SectionHeading>
            <ul className="mt-4 divide-y divide-white/[0.07]">
              {t.whenToUse.map((w) => (
                <li key={w} className="flex gap-3 py-3.5 text-base leading-relaxed text-fg-reading">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden /> {w}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.015em] text-fg">Limiti ed errori comuni</h2>
            <ul className="mt-4 divide-y divide-white/[0.07]">
              {t.limits.map((w) => (
                <li key={w} className="flex gap-3 py-3.5 text-base leading-relaxed text-fg-reading">
                  <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-warning" aria-hidden /> {w}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="perche" aria-labelledby="perche-title" className="scroll-mt-32">
          <SectionHeading id="perche-title">Perché funziona</SectionHeading>
          <div className="mt-5 max-w-[72ch] rounded-card border border-white/[0.07] bg-white/[0.02] p-5">
            <EvidenceLevel level={t.evidence.level} className="text-sm text-fg" />
            <p className="mt-2 text-base leading-relaxed text-fg-reading">{t.evidence.note}</p>
          </div>
          <dl className="mt-8 grid gap-x-12 gap-y-7 md:grid-cols-2">
            {t.principles.map((p) => (
              <div key={p.title}>
                <dt className="text-base font-semibold text-fg">{p.title}</dt>
                <dd className="mt-1.5 max-w-[60ch] text-base leading-relaxed text-fg-muted">{p.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="fonti" aria-labelledby="fonti-title" className="scroll-mt-32">
          <SectionHeading id="fonti-title">Fonti</SectionHeading>
          <ol className="mt-4 max-w-[80ch] divide-y divide-white/[0.07]">
            {t.sources.map((s) => {
              const href = s.url ?? (s.doi ? `https://doi.org/${s.doi}` : undefined);
              return (
                <li key={s.label} className="py-4">
                  <p className="text-sm leading-relaxed text-fg-reading">{s.label}</p>
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex min-h-11 items-center gap-1.5 text-sm text-azure-300 hover:text-azure-200 hover:underline sm:min-h-8">
                      {s.doi ? `Apri lo studio (doi ${s.doi})` : "Apri la fonte"}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only">(si apre in una nuova scheda)</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {(prev || next) && (
          <nav className="grid gap-3 border-t border-white/[0.07] pt-8 sm:grid-cols-2" aria-label="Altre tecniche">
            {prev ? (
              <Link href={`/academy/${prev.id}`} className="card card-hover flex flex-col gap-1 rounded-card p-4">
                <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Tecnica precedente
                </span>
                <span className="text-base font-medium text-fg">{prev.name}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next && (
              <Link href={`/academy/${next.id}`} className="card card-hover flex flex-col gap-1 rounded-card p-4 sm:items-end sm:text-right">
                <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                  Tecnica successiva <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-base font-medium text-fg">{next.name}</span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
