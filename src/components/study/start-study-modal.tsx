"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, BookOpenCheck, Microscope, FlaskConical, Atom, History, Compass, X, Play } from "lucide-react";
import { Modal, Button, ProgressBar, Notice } from "@/components/ui/primitives";
import { STATUS_FILL } from "@/components/ui/status";
import { ModeCard } from "./mode-card";
import { MODES, MODE_META, NO_LESSON_STEPS, ultraKind } from "./paths";
import { useUI } from "@/lib/ui-store";
import { useAtlas } from "@/lib/store";
import { SUBJECTS, getTopicRef, allTopicRefs } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { useTopicStates, type TopicState } from "@/lib/hooks";
import { programMastery } from "@/lib/insights";
import { STATUS_LABEL } from "@/lib/progress";
import type { StudyMode, SubjectId, TopicRef } from "@/lib/types";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";

import { norm } from "@/lib/search";
import { cx } from "./cx";

export const SUBJECT_ICON = { biologia: Microscope, chimica: FlaskConical, fisica: Atom } as const;

type Step = "topic" | "mode";

const isStudyMode = (m: string): m is StudyMode => m === "fast" || m === "deep" || m === "ultra";

/** The next topic to study in a subject: same rule as the subjects pages and the dashboard. */
function nextIn(states: TopicState[]) {
  return states.find((x) => x.status === "da-consolidare") ?? states.find((x) => x.status === "in-corso") ?? states.find((x) => x.status === "nuovo");
}

/** Moves focus between topic rows with the arrow keys; from the first row ArrowUp goes back to the search field. */
function onRowsKeyDown(e: KeyboardEvent<HTMLElement>, search: HTMLInputElement | null) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
  const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-topic-row]"));
  const i = rows.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  let next = i;
  if (e.key === "ArrowDown") next = Math.min(rows.length - 1, i + 1);
  if (e.key === "ArrowUp") next = i - 1;
  if (e.key === "Home") next = 0;
  if (e.key === "End") next = rows.length - 1;
  if (next < 0) search?.focus();
  else rows[next]?.focus();
}

function TopicRow({
  t,
  state,
  selected,
  onChoose,
  showSubject,
  hint,
}: {
  t: TopicRef;
  state?: TopicState;
  selected: boolean;
  onChoose: () => void;
  showSubject?: boolean;
  hint?: string;
}) {
  const lesson = hasLesson(t.topic.id);
  return (
    <button
      type="button"
      data-topic-row
      onClick={onChoose}
      aria-current={selected ? "true" : undefined}
      className={cx(
        "flex min-h-12 w-full items-start gap-3 rounded-control border px-3 py-2.5 text-left transition-colors duration-150",
        selected ? "border-azure-400/50 bg-azure-500/[0.1]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]",
      )}
    >
      <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", STATUS_FILL[state?.status ?? "nuovo"], (state?.status ?? "nuovo") === "nuovo" && "bg-white/25")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug text-fg">{t.topic.title}</span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fg-subtle">
          {hint && <span className="text-fg-muted">{hint}</span>}
          {showSubject && (
            <span>
              {t.subject.name}, unità {t.unit.number}
            </span>
          )}
          <span>{STATUS_LABEL[state?.status ?? "nuovo"]}</span>
          {lesson && (
            <span className="inline-flex items-center gap-1 text-azure-300">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden /> Lezione completa
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export function StartStudyModal() {
  const router = useRouter();
  const open = useUI((s) => s.startStudyOpen);
  const preset = useUI((s) => s.startStudyPreset);
  const close = useUI((s) => s.closeStartStudy);
  const sessions = useAtlas((s) => s.sessions);
  const [step, setStep] = useState<Step>("topic");
  const [subject, setSubject] = useState<SubjectId>("biologia");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [mode, setMode] = useState<StudyMode>("deep");
  const [q, setQ] = useState("");
  const [coarse, setCoarse] = useState(false);
  const states = useTopicStates();
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const lastStudy = useMemo(() => {
    const s = [...sessions].filter((x) => isStudyMode(x.mode)).sort((a, b) => b.start.localeCompare(a.start))[0];
    const ref = s ? getTopicRef(s.topicId) : undefined;
    return s && ref ? { ref, mode: s.mode as StudyMode } : null;
  }, [sessions]);

  // Every time the dialog opens: honour the preset and skip what is already known.
  useEffect(() => {
    if (!open) return;
    const ref = preset?.topicId ? getTopicRef(preset.topicId) : undefined;
    setSubject(ref?.subject.id ?? preset?.subject ?? lastStudy?.ref.subject.id ?? "biologia");
    setTopicId(ref?.topic.id ?? null);
    setMode(preset?.mode ?? lastStudy?.mode ?? "deep");
    setQ("");
    setStep(ref ? "mode" : "topic");
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset]);

  // Put focus where the next decision is: on open (when the dialog itself does not already
  // focus the search field) and after every step change.
  const [focusSeq, setFocusSeq] = useState(0);
  const initialFocus = useRef(true);
  useEffect(() => {
    if (open) {
      initialFocus.current = true;
      setFocusSeq((n) => n + 1);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const initial = initialFocus.current;
    initialFocus.current = false;
    const id = window.setTimeout(() => {
      const root = bodyRef.current;
      if (!root) return;
      if (step === "mode") {
        (root.querySelector<HTMLElement>('input[type="radio"]:checked') ?? document.querySelector<HTMLElement>("[data-start]"))?.focus();
      } else if (!initial) {
        (root.querySelector<HTMLElement>('[data-topic-row][aria-current="true"]') ?? searchRef.current)?.focus();
      }
    }, 60);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, focusSeq]);

  const stateById = useMemo(() => new Map(states.map((s) => [s.ref.topic.id, s])), [states]);
  const mastery = useMemo(() => programMastery(states).bySubject, [states]);
  const subjectData = SUBJECTS.find((s) => s.id === subject)!;
  const subjectStates = useMemo(() => states.filter((s) => s.ref.subject.id === subject), [states, subject]);
  const next = nextIn(subjectStates);

  const recommended = useMemo(() => {
    const out: { ref: TopicRef; hint: string; mode?: StudyMode }[] = [];
    if (lastStudy && lastStudy.ref.subject.id === subject) out.push({ ref: lastStudy.ref, hint: `Riprendi in ${MODE_META[lastStudy.mode].name}`, mode: lastStudy.mode });
    if (next && next.ref.topic.id !== lastStudy?.ref.topic.id) out.push({ ref: next.ref, hint: `Prossimo in ${subjectData.name}` });
    return out;
  }, [lastStudy, next, subject, subjectData.name]);

  const units = useMemo(
    () =>
      subjectData.units.map((u) => ({
        unit: u,
        topics: u.chapters.flatMap((c) => c.topics).map((t) => getTopicRef(t.id)!),
      })),
    [subjectData],
  );

  const results = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return null;
    return allTopicRefs().filter((r) => norm(`${r.topic.title} ${r.topic.syllabusText} ${(r.topic.keywords ?? []).join(" ")} ${r.subject.name}`).includes(nq));
  }, [q]);

  const topicRef = topicId ? getTopicRef(topicId) : undefined;
  const lessonReady = topicRef ? hasLesson(topicRef.topic.id) : false;

  const choose = (ref: TopicRef, m?: StudyMode) => {
    setTopicId(ref.topic.id);
    setSubject(ref.subject.id);
    if (m) setMode(m);
    setStep("mode");
  };

  const start = () => {
    if (!topicId) return;
    close();
    router.push(`/studio/${topicId}?mode=${mode}`);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && results?.length) {
      e.preventDefault();
      choose(results[0]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      bodyRef.current?.querySelector<HTMLElement>("[data-topic-row]")?.focus();
    } else if (e.key === "Escape" && q) {
      e.stopPropagation();
      setQ("");
    }
  };

  const onSubjectKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const ids = SUBJECTS.map((s) => s.id);
    const i = ids.indexOf(subject);
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % ids.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + ids.length) % ids.length;
    if (n < 0) return;
    e.preventDefault();
    setSubject(ids[n]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[n]?.focus();
  };

  const stepNo = step === "topic" ? 1 : 2;

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="Inizia a studiare"
      description={step === "topic" ? "Scegli l’argomento del programma." : "Scegli come studiarlo."}
      footer={
        <div className="flex items-center justify-between gap-3">
          {step === "topic" ? (
            <Button variant="ghost" onClick={close}>
              Annulla
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep("topic")}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Argomento
            </Button>
          )}
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 text-ui text-fg-muted md:flex">
            <span className="flex items-center gap-1" aria-hidden>
              {[1, 2].map((n) => (
                <span key={n} className={cx("h-1 rounded-full transition-[width,background-color] duration-200", n === stepNo ? "w-5 bg-azure-400" : "w-2.5 bg-white/15")} />
              ))}
            </span>
            <span>Passo {stepNo} di 2</span>
          </div>
          {step === "topic" ? (
            <Button variant="primary" disabled={!topicId} onClick={() => setStep("mode")}>
              Continua
            </Button>
          ) : (
            <Button variant="primary" onClick={start} disabled={!topicId} data-start>
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {lessonReady ? `Inizia in ${MODE_META[mode].name}` : "Inizia il percorso"}
            </Button>
          )}
        </div>
      }
    >
      <p className="sr-only" aria-live="polite">
        Passo {stepNo} di 2: {step === "topic" ? "scegli l’argomento" : "scegli la modalità"}
      </p>
      <div ref={bodyRef} tabIndex={-1} data-autofocus={coarse || step === "mode" ? "" : undefined} className="outline-none">
        {step === "topic" && (
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onSearchKey}
                data-autofocus={coarse ? undefined : ""}
                placeholder="Cerca un argomento"
                aria-label="Cerca un argomento in tutte le materie"
                aria-describedby="start-search-hint"
                className="h-11 w-full rounded-control border border-white/[0.1] bg-white/[0.03] pl-10 pr-10 text-base text-fg placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 hover:border-white/[0.16] focus:border-azure-400/70 focus:outline-none focus:ring-[3px] focus:ring-azure-500/25 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <button type="button" onClick={() => (setQ(""), searchRef.current?.focus())} className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-fg-muted hover:bg-white/[0.06] hover:text-fg" aria-label="Cancella la ricerca">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <p id="start-search-hint" className="sr-only">
              Invio apre il primo risultato; freccia giù scorre l’elenco.
            </p>

            {results ? (
              <div className="mt-4" onKeyDown={(e) => onRowsKeyDown(e, searchRef.current)}>
                <p className="mb-2 text-ui text-fg-muted" role="status">
                  {results.length ? `${results.length} ${results.length === 1 ? "argomento trovato" : "argomenti trovati"}` : `Nessun argomento contiene «${q.trim()}»`}
                </p>
                {results.length ? (
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {results.slice(0, 40).map((r) => (
                      <li key={r.topic.id}>
                        <TopicRow t={r} state={stateById.get(r.topic.id)} selected={topicId === r.topic.id} onChoose={() => choose(r)} showSubject />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-card border border-dashed border-white/[0.1] px-5 py-8 text-center text-sm text-fg-muted">
                    Prova con una parola più breve o con il nome di un processo (per esempio «glicolisi» o «pH»).
                    <div className="mt-4">
                      <Button variant="secondary" size="sm" onClick={() => (setQ(""), searchRef.current?.focus())}>
                        Cancella la ricerca
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div role="radiogroup" aria-label="Materia" onKeyDown={onSubjectKey} className="mt-4 grid grid-cols-3 gap-2">
                  {SUBJECTS.map((s) => {
                    const tone = SUBJECT_TONE[s.id];
                    const Icon = SUBJECT_ICON[s.id];
                    const sel = subject === s.id;
                    const m = mastery[s.id] ?? 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={sel}
                        tabIndex={sel ? 0 : -1}
                        onClick={() => setSubject(s.id)}
                        className={cx(
                          "flex min-h-11 flex-col items-start rounded-control border px-3 py-2.5 text-left transition-colors duration-150",
                          sel ? cx(TONE[tone].border, "bg-white/[0.05]") : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]",
                        )}
                      >
                        <span className="flex w-full items-center gap-2">
                          <Icon className={cx("h-4 w-4 shrink-0", TONE[tone].text)} aria-hidden />
                          <span className="truncate text-sm font-medium text-fg">
                            <span className="sm:hidden">{s.name.split(" e ")[0]}</span>
                            <span className="hidden sm:inline">{s.name}</span>
                          </span>
                          <span className="ml-auto hidden text-xs tabular-nums text-fg-muted sm:inline">{Math.round(m * 100)}%</span>
                        </span>
                        <ProgressBar value={m} tone={tone} size="sm" className="mt-2" label={`Padronanza di ${s.name}: ${Math.round(m * 100)}%`} />
                        <span className="mt-1 text-xs tabular-nums text-fg-subtle sm:hidden">{Math.round(m * 100)}%</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 space-y-6" onKeyDown={(e) => onRowsKeyDown(e, searchRef.current)}>
                  {recommended.length > 0 && (
                    <section aria-labelledby="start-reco">
                      <h3 id="start-reco" className="mb-2 flex items-center gap-1.5 text-ui font-medium text-fg-muted">
                        <Compass className="h-3.5 w-3.5 text-azure-300" aria-hidden /> Consigliati
                      </h3>
                      <ul className="grid gap-1.5 sm:grid-cols-2">
                        {recommended.map((r) => (
                          <li key={r.ref.topic.id}>
                            <TopicRow t={r.ref} state={stateById.get(r.ref.topic.id)} selected={topicId === r.ref.topic.id} onChoose={() => choose(r.ref, r.mode)} hint={r.hint} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {units.map(({ unit, topics }) => (
                    <section key={unit.id} aria-labelledby={`start-u-${unit.id}`}>
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <h3 id={`start-u-${unit.id}`} className="text-ui font-medium text-fg-muted">
                          Unità {unit.number}: {unit.title}
                        </h3>
                        <span className="shrink-0 text-xs text-fg-subtle">{unit.cfu} CFU</span>
                      </div>
                      <ul className="grid gap-1.5 sm:grid-cols-2">
                        {topics.map((t) => (
                          <li key={t.topic.id}>
                            <TopicRow t={t} state={stateById.get(t.topic.id)} selected={topicId === t.topic.id} onChoose={() => choose(t)} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                  <p className="flex gap-2 text-xs leading-relaxed text-fg-subtle">
                    <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    Gli argomenti senza lezione completa offrono obiettivi ufficiali, risorse, spiegazione dell’AI Professor e verifica; la lezione ATLAS è in preparazione.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {step === "mode" && topicRef && (
          <div>
            <div className="inset-panel mb-4 flex items-center gap-3 px-3.5 py-3">
              {(() => {
                const Icon = SUBJECT_ICON[topicRef.subject.id];
                return <Icon className={cx("h-4 w-4 shrink-0", TONE[SUBJECT_TONE[topicRef.subject.id]].text)} aria-hidden />;
              })()}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-snug text-fg">{topicRef.topic.title}</div>
                <div className="mt-0.5 text-xs text-fg-subtle">
                  {topicRef.subject.name}, unità {topicRef.unit.number}. {STATUS_LABEL[stateById.get(topicRef.topic.id)?.status ?? "nuovo"]}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep("topic")} className="shrink-0">
                Cambia
              </Button>
            </div>

            {lessonReady ? (
              <div role="radiogroup" aria-label="Modalità di studio" className="grid gap-2.5 md:grid-cols-3 md:gap-3">
                {MODES.map((m) => (
                  <ModeCard key={m} mode={m} selected={mode === m} onSelect={() => setMode(m)} onConfirm={start} layout="responsive" name="start-mode" ultraKind={ultraKind(topicRef)} bandArt={false} />
                ))}
              </div>
            ) : (
              <Notice tone="info" title="Lezione ATLAS in preparazione">
                <p>Per questo argomento le tre modalità seguono lo stesso percorso guidato in {NO_LESSON_STEPS.length} passi:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 marker:text-fg-subtle">
                  {NO_LESSON_STEPS.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </Notice>
            )}
            {lessonReady && <p className="mt-3 hidden text-xs text-fg-subtle md:block">Frecce per cambiare modalità, Invio per iniziare.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
