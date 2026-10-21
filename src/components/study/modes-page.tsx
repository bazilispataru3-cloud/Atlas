"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { BookOpenCheck, Clock, Info, Play, Search } from "lucide-react";
import type { StudyMode, SubjectId } from "@/lib/types";
import { TECHNIQUES, type Goal } from "@/data/academy";
import { SUBJECTS } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { ModeCard } from "./mode-card";
import { SUBJECT_ICON } from "./start-study-modal";
import { MODE_META, MODES, nextTopic, sequenceFor, STEP_LABEL, ULTRA_RATIONALE, type UltraKind } from "./paths";
import { Button, EmptyState, PageHeader, SectionTitle, Segmented, Skeleton } from "@/components/ui/primitives";
import { MODE_TONE, SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { STATUS_LABEL } from "@/lib/progress";
import { useUI } from "@/lib/ui-store";
import { useAtlas } from "@/lib/store";
import { useHydrated, useReducedMotion, useTopicStates, type TopicState } from "@/lib/hooks";
import { fmt, DAY_MS } from "@/lib/utils";
import { cx } from "./cx";

/** How well each mode serves a goal. Deliberately relative: no mode is "best" in general. */
const FIT: { goal: string; note: string; fit: Record<StudyMode, 0 | 1 | 2> }[] = [
  {
    goal: "Primo contatto con un argomento",
    note: "Serve un quadro d’insieme prima dei dettagli; Fast lo dà in poco tempo, Deep lo costruisce con più contesto.",
    fit: { fast: 2, deep: 2, ultra: 1 },
  },
  {
    goal: "Comprensione di meccanismi e cause",
    note: "Spiegazione strutturata, esempi ed elaborazione dei perché richiedono tempo: Deep e Ultra sono più adatte.",
    fit: { fast: 0, deep: 2, ultra: 2 },
  },
  {
    goal: "Memorizzazione di termini e sequenze",
    note: "Flashcard e recupero attivo funzionano in tutte; il palazzo della memoria (Ultra) aiuta con sequenze ordinate.",
    fit: { fast: 1, deep: 1, ultra: 2 },
  },
  {
    goal: "Problem solving (fisica, stechiometria, pH)",
    note: "Problemi guidati e auto-spiegazione di esempi svolti sono in Deep e Ultra; Fast ha solo un quiz breve.",
    fit: { fast: 0, deep: 2, ultra: 2 },
  },
  {
    goal: "Ripasso rapido prima di una prova",
    note: "Con poco tempo conviene il recupero attivo mirato: Fast oppure il ripasso flashcard.",
    fit: { fast: 2, deep: 1, ultra: 0 },
  },
  {
    goal: "Esposizione orale e spiegazione a parole tue",
    note: "Feynman e simulazione orale sono nel percorso Ultra.",
    fit: { fast: 0, deep: 1, ultra: 2 },
  },
];

const FIT_LABEL = ["Poco adatta", "Utile", "Indicata"] as const;

/** Ultra follows the subject: the variant of each one. */
const KIND_OF: Record<SubjectId, UltraKind> = { biologia: "meccanistico", chimica: "misto", fisica: "quantitativo" };

const isStudyMode = (m: string): m is StudyMode => m === "fast" || m === "deep" || m === "ultra";

function FitDots({ n, mode }: { n: 0 | 1 | 2; mode: StudyMode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx("h-2 w-2 rounded-full", i <= n ? TONE[MODE_TONE[mode]].dot : "bg-white/10")} />
        ))}
      </span>
      <span className={cx("text-ui", n === 2 ? "text-fg" : "text-fg-muted")}>{FIT_LABEL[n]}</span>
    </span>
  );
}

function ModeName({ mode }: { mode: StudyMode }) {
  const Icon = MODE_META[mode].icon;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={cx("h-3.5 w-3.5", TONE[MODE_TONE[mode]].text)} aria-hidden />
      {MODE_META[mode].name}
    </span>
  );
}

/** Short time for the usage tiles: "45 min", "6,1 h". */
const shortTime = (min: number) => (min < 60 ? `${Math.round(min)} min` : `${fmt.hours(min)} h`);

export function ModesPage() {
  const openStartStudy = useUI((s) => s.openStartStudy);
  const sessions = useAtlas((s) => s.sessions);
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const states = useTopicStates();
  const detailRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<StudyMode>("deep");
  const [ultraSubject, setUltraSubject] = useState<SubjectId>("biologia");
  const kind = KIND_OF[ultraSubject];
  const meta = MODE_META[mode];
  const seq = sequenceFor(mode, kind);
  const techniques = TECHNIQUES.filter((t) => t.modes.includes(mode));

  const usage = useMemo(() => {
    const since = Date.now() - 30 * DAY_MS;
    const out: Record<StudyMode, { minutes: number; count: number }> = { fast: { minutes: 0, count: 0 }, deep: { minutes: 0, count: 0 }, ultra: { minutes: 0, count: 0 } };
    if (!hydrated) return out;
    for (const s of sessions) {
      if (isStudyMode(s.mode) && new Date(s.start).getTime() >= since) {
        out[s.mode].minutes += s.minutes;
        out[s.mode].count += 1;
      }
    }
    return out;
  }, [sessions, hydrated]);
  const usageTotal = usage.fast.count + usage.deep.count + usage.ultra.count;

  // One-click starts: topics with a complete lesson (the modes only differ there). The one studied
  // last, then the next one per subject; Ultra shows the subject chosen above, since its path follows it.
  const suggestions = useMemo(() => {
    const withLesson = states.filter((s) => hasLesson(s.ref.topic.id) && (mode !== "ultra" || s.ref.subject.id === ultraSubject));
    const out: { st: TopicState; reason: string }[] = [];
    const last = [...sessions].filter((s) => isStudyMode(s.mode) && hasLesson(s.topicId)).sort((a, b) => b.start.localeCompare(a.start))[0];
    const lastState = last && withLesson.find((x) => x.ref.topic.id === last.topicId);
    if (lastState) out.push({ st: lastState, reason: "Studiato per ultimo" });
    const subjects = mode === "ultra" ? SUBJECTS.filter((s) => s.id === ultraSubject) : SUBJECTS;
    for (const subj of subjects) {
      const pool = withLesson.filter((x) => x.ref.subject.id === subj.id && !out.some((o) => o.st.ref.topic.id === x.ref.topic.id));
      const nx = nextTopic(pool);
      if (nx) out.push({ st: nx, reason: `Prossimo in ${subj.name}` });
      else {
        const weakest = [...pool].sort((a, b) => a.mastery - b.mastery)[0];
        if (weakest) out.push({ st: weakest, reason: `Da ripassare in ${subj.name}` });
      }
    }
    return out.slice(0, 4);
  }, [states, sessions, mode, ultraSubject]);

  const goals = useMemo(() => {
    const counts = new Map<Goal, number>();
    for (const t of techniques) for (const g of t.goals) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [techniques]);

  // Phones: the cards are stacked, so after tapping one bring its path (and the topics to start from) into view.
  const onCardTap = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || !(e.target as HTMLElement).closest(".card")) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    window.setTimeout(() => detailRef.current?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" }), 120);
  };

  return (
    <div className="pb-8">
      <PageHeader
        title="Tre modi di studiare"
        description="Fast, Deep e Ultra non sono livelli di difficoltà: cambiano quanto va in profondità il percorso e quali strumenti usa. Scegli in base al tempo che hai e a cosa devi saper fare; poi scegli l’argomento e parti."
      />

      <div role="radiogroup" aria-label="Modalità di studio" onPointerUp={onCardTap} className="mt-8 grid gap-2.5 md:grid-cols-3 md:gap-4">
        {MODES.map((m) => (
          <ModeCard key={m} mode={m} selected={m === mode} onSelect={() => setMode(m)} layout="responsive" name="modalita" ultraKind={kind} animateArt headingLevel={2} />
        ))}
      </div>

      {/* The chosen mode: its path and where to start */}
      <section ref={detailRef} aria-labelledby="mode-detail" className="card mt-5 grid scroll-mt-20 gap-x-12 gap-y-8 p-5 sm:p-7 lg:grid-cols-2">
        <div>
          <h2 id="mode-detail" className="flex items-center gap-2.5 font-display text-2xl leading-tight text-fg sm:text-3xl">
            <meta.icon className={cx("h-5 w-5 shrink-0", TONE[MODE_TONE[mode]].text)} aria-hidden />
            Il percorso {meta.name}
          </h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            {seq.length} passi, {meta.time}
          </p>

          {mode === "ultra" && (
            <div className="mt-5">
              <div className="mb-2 text-ui text-fg-muted" id="ultra-subject">
                Il percorso Ultra cambia con la materia
              </div>
              <Segmented
                ariaLabel="Materia del percorso Ultra"
                value={ultraSubject}
                onChange={setUltraSubject}
                options={SUBJECTS.map((s) => ({ value: s.id, label: s.name.split(" e ")[0] }))}
              />
              <p className="mt-3 max-w-[60ch] text-ui leading-relaxed text-fg-muted">{ULTRA_RATIONALE[kind]}</p>
            </div>
          )}

          <ol className="relative mt-6 space-y-1">
            <span className="absolute bottom-3 left-[11px] top-3 w-px bg-white/[0.09]" aria-hidden />
            {seq.map((k, i) => (
              <li key={k} className="relative flex min-h-9 items-center gap-3 text-sm text-fg-reading">
                <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/[0.14] bg-ink-800 text-xs font-medium tabular-nums text-fg-muted" aria-hidden>
                  {i + 1}
                </span>
                <span>
                  <span className="sr-only">Passo {i + 1}: </span>
                  {STEP_LABEL[k]}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:border-l lg:border-white/[0.06] lg:pl-12">
          <h3 className="text-base font-semibold text-fg">Inizia in {meta.name}</h3>
          <p className="mt-1 text-ui text-fg-muted">Argomenti con lezione completa: un tocco e la sessione parte.</p>
          <ul className="mt-4 space-y-2">
            {!hydrated
              ? [0, 1, 2].map((i) => (
                  <li key={i}>
                    <Skeleton className="h-[3.75rem] w-full" />
                  </li>
                ))
              : suggestions.map(({ st, reason }) => {
                  const Icon = SUBJECT_ICON[st.ref.subject.id];
                  return (
                    <li key={st.ref.topic.id}>
                      <Link
                        href={`/studio/${st.ref.topic.id}?mode=${mode}`}
                        className="group flex min-h-[3.75rem] items-center gap-3 rounded-control border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 transition-colors duration-150 hover:border-white/[0.16] hover:bg-white/[0.045]"
                      >
                        <Icon className={cx("h-4 w-4 shrink-0", TONE[SUBJECT_TONE[st.ref.subject.id]].text)} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="sr-only">Inizia in {meta.name}: </span>
                          <span className="block text-sm font-medium leading-snug text-fg">{st.ref.topic.title}</span>
                          <span className="mt-0.5 block text-xs text-fg-muted">
                            {reason}, {STATUS_LABEL[st.status].toLowerCase()}
                          </span>
                        </span>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-azure-400/30 text-azure-300 transition-colors group-hover:border-azure-400/60 group-hover:bg-azure-500/[0.12]" aria-hidden>
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
          </ul>
          <Button variant="secondary" className="mt-3 w-full sm:w-auto" onClick={() => openStartStudy({ mode, subject: mode === "ultra" ? ultraSubject : undefined })}>
            <Search className="h-4 w-4" aria-hidden /> Scegli un altro argomento
          </Button>
          <p className="mt-4 flex gap-2 text-xs leading-relaxed text-fg-muted">
            <BookOpenCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Gli argomenti senza lezione completa seguono un percorso guidato unico: obiettivi ufficiali, risorse, spiegazione dell’AI Professor, richiamo e quiz.
          </p>
        </div>

        <div className="border-t border-white/[0.06] pt-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-fg">Le tecniche di questa modalità</h3>
          <ul className="mt-2 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {techniques.map((t) => (
              <li key={t.id} className="border-b border-white/[0.05]">
                <Link href={`/academy/${t.id}`} className="group flex min-h-12 items-center justify-between gap-3 py-2 text-sm text-fg transition-colors hover:text-azure-200">
                  <span className="underline decoration-white/0 underline-offset-4 transition-[text-decoration-color] group-hover:decoration-white/30">{t.name}</span>
                  <span className="shrink-0 text-xs text-fg-muted">Evidenza {t.evidence.level}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-fg-muted">Servono soprattutto a: {goals.join(", ")}.</p>
        </div>
      </section>

      {/* Goal matrix */}
      <section className="mt-14" aria-labelledby="fit-title">
        <SectionTitle id="fit-title" title="Quale modalità per quale obiettivo" description="Indicazioni pratiche, non una classifica." />
        <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] md:hidden">
          {FIT.map((row) => (
            <li key={row.goal} className="py-4">
              <div className="text-sm font-medium text-fg">{row.goal}</div>
              <p className="mt-1 text-ui leading-relaxed text-fg-muted">{row.note}</p>
              <dl className="mt-3 space-y-1.5">
                {MODES.map((m) => (
                  <div key={m} className="flex items-center justify-between gap-3 text-ui">
                    <dt className="text-fg-muted">
                      <ModeName mode={m} />
                    </dt>
                    <dd>
                      <FitDots n={row.fit[m]} mode={m} />
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <div className="card hidden overflow-hidden md:block">
          <table className="w-full text-left">
            <caption className="sr-only">Adattezza di Fast, Deep e Ultra a ciascun obiettivo di studio</caption>
            <thead>
              <tr className="border-b border-white/[0.06] text-ui text-fg-muted">
                <th scope="col" className="px-5 py-3 font-medium">
                  Obiettivo
                </th>
                {MODES.map((m) => (
                  <th key={m} scope="col" className="w-[17%] px-4 py-3 font-medium text-fg">
                    <ModeName mode={m} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIT.map((row) => (
                <tr key={row.goal} className="border-b border-white/[0.04] align-top last:border-0">
                  <th scope="row" className="px-5 py-4 text-left font-normal">
                    <div className="text-sm font-medium text-fg">{row.goal}</div>
                    <div className="mt-1 max-w-[52ch] text-ui leading-relaxed text-fg-muted">{row.note}</div>
                  </th>
                  {MODES.map((m) => (
                    <td key={m} className="px-4 py-4">
                      <FitDots n={row.fit[m]} mode={m} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex max-w-[80ch] gap-2 text-xs leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Le tecniche con l’evidenza più solida in letteratura (recupero attivo e ripetizione dilazionata; Dunlosky et al., 2013) sono presenti in tutte e tre le modalità e nel ripasso flashcard.
        </p>
      </section>

      {/* Personal usage */}
      <section className="mt-14" aria-labelledby="usage-title">
        <SectionTitle id="usage-title" title="Le tue sessioni negli ultimi 30 giorni" description="Conta solo il tempo con la scheda visibile e il timer non in pausa." />
        {!hydrated ? (
          <Skeleton className="h-24 w-full" />
        ) : usageTotal === 0 ? (
          <EmptyState
            icon={<Clock />}
            title="Ancora nessuna sessione"
            description="Quando studi in Fast, Deep o Ultra, qui trovi il tempo dedicato a ciascuna modalità."
            action={
              <Button variant="secondary" onClick={() => openStartStudy({ mode })}>
                <Play className="h-4 w-4 fill-current" aria-hidden /> Inizia in {meta.name}
              </Button>
            }
          />
        ) : (
          <dl className="card grid grid-cols-3 divide-x divide-white/[0.06]">
            {MODES.map((m) => (
              <div key={m} className="min-w-0 px-3 py-4 sm:px-6">
                <dt className="text-ui text-fg-muted">
                  <ModeName mode={m} />
                </dt>
                <dd className="mt-1.5">
                  <span className="block text-xl font-semibold leading-tight tabular-nums text-fg sm:text-2xl">{shortTime(usage[m].minutes)}</span>
                  <span className="mt-0.5 block text-xs text-fg-muted">
                    {usage[m].count} {usage[m].count === 1 ? "sessione" : "sessioni"}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
