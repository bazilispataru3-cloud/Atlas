"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronRight, CalendarPlus, Coffee, Play, RotateCcw, Compass } from "lucide-react";
import { Button, Meridian, buttonClasses } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { KIND_META, type PlanItem } from "@/lib/planner";
import { suggestionHref, type Suggestion } from "@/lib/insights";
import { getTopicRef } from "@/data/syllabus";
import type { StudyMode, TopicRef } from "@/lib/types";
import { capFirst, cn, fmt, greeting } from "@/lib/utils";
import { MODE_LABEL, suggestionVisual } from "./format";

// ── The "Oggi" block ──────────────────────────────────────────
// The page's one bold element and its one orchestrated entrance: greeting,
// what to study now and why, the button that does it, then today's plan
// drawn along the meridian.

export interface ResumeTarget {
  ref: TopicRef;
  mode: StudyMode;
}

export function TodayBlock({
  now,
  name,
  tip,
  resume,
  planItems,
  planDone,
  hasPlan,
  restDay,
  firstTime = false,
}: {
  now: Date;
  name: string;
  tip?: Suggestion;
  resume?: ResumeTarget;
  planItems: PlanItem[];
  planDone: string[];
  hasPlan: boolean;
  restDay: boolean;
  /** No study session recorded yet: the copy speaks of a first step. */
  firstTime?: boolean;
}) {
  const openStartStudy = useUI((s) => s.openStartStudy);
  const visual = tip ? suggestionVisual(tip) : null;
  const firstName = name.trim();

  return (
    <section aria-labelledby="oggi-titolo" className="card overflow-hidden rounded-panel">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="px-5 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7 lg:px-10 lg:pb-10 lg:pt-9">
          <div className="animate-fade-up">
            <p className="text-sm text-fg-subtle">
              {capFirst(fmt.weekday(now))} {fmt.date(now)}
            </p>
            <h1 id="oggi-titolo" className="mt-1.5 text-balance font-display text-[2rem] leading-[1.08] font-normal tracking-[-0.015em] text-fg sm:text-4xl lg:text-5xl lg:leading-[1.04]">
              {greeting(now)}
              {firstName ? `, ${firstName}` : ""}
            </h1>
          </div>

          <div className="mt-5 animate-fade-up sm:mt-7" style={{ animationDelay: "90ms" }}>
            {tip && visual ? (
              <>
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                  <visual.Icon className={cn("h-4 w-4 shrink-0", visual.color)} aria-hidden />
                  {firstTime ? "Il primo passo" : "Consigliato adesso"}, circa {fmt.minutes(tip.minutes)}
                </p>
                <p className="mt-2 max-w-[34ch] text-balance text-xl font-medium leading-snug tracking-[-0.01em] text-fg sm:text-2xl sm:leading-tight">{tip.title}</p>
                <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-fg-muted">{tip.reason}</p>
              </>
            ) : (
              <>
                <p className="max-w-[34ch] text-xl font-medium leading-snug text-fg sm:text-2xl">Scegli una materia e un argomento</p>
                <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-fg-muted">Hai già avviato tutti gli argomenti: scegli tu cosa ripassare e in quale modalità.</p>
              </>
            )}
          </div>

          <div className="mt-6 flex animate-fade-up flex-col gap-2 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center" style={{ animationDelay: "180ms" }}>
            {tip ? (
              <Button variant="primary" size="lg" href={suggestionHref(tip)} className="w-full sm:w-auto">
                <Play className="h-4 w-4 fill-current" aria-hidden />
                {tip.cta}
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={() => openStartStudy()} className="w-full sm:w-auto">
                <Play className="h-4 w-4 fill-current" aria-hidden />
                Inizia a studiare
              </Button>
            )}
            {resume && (
              <Link
                href={`/studio/${resume.ref.topic.id}?mode=${resume.mode}`}
                className={buttonClasses("secondary", "lg", "h-auto min-h-12 w-full min-w-0 justify-start py-1.5 text-left sm:w-auto sm:max-w-[17rem]")}
              >
                <RotateCcw className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                <span className="min-w-0 leading-tight">
                  <span className="block text-sm">Riprendi in {MODE_LABEL[resume.mode]}</span>
                  <span className="block truncate text-xs font-normal text-fg-muted">{resume.ref.topic.title}</span>
                </span>
              </Link>
            )}
            {tip && (
              <Button variant="ghost" size="lg" onClick={() => openStartStudy()} className="w-full sm:w-auto" aria-label="Scegli tu cosa studiare">
                <Compass className="h-4 w-4" aria-hidden />
                Scegli tu
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.07] px-5 py-6 sm:px-8 sm:py-7 xl:border-l xl:border-t-0 xl:px-8 xl:py-9">
          <TodayPlan items={planItems} done={planDone} hasPlan={hasPlan} restDay={restDay} />
        </div>
      </div>
    </section>
  );
}

// ── Today's plan: a route along the meridian ──────────────────

/** Where each kind of plan item leads (same destinations as the calendar). */
function actionFor(it: PlanItem): string | null {
  const first = it.topicIds[0] ? getTopicRef(it.topicIds[0]) : undefined;
  switch (it.kind) {
    case "apprendimento":
    case "recupero":
      return first ? `/studio/${first.topic.id}?mode=${it.kind === "recupero" ? "ultra" : "deep"}` : null;
    case "esercizi":
      return first ? `/materie/${first.subject.id}/${first.topic.id}#esempi` : null;
    case "ripasso":
      return "/flashcard/ripasso";
    case "interleaving":
      return "/quiz";
    case "simulazione":
      return it.subject ? `/quiz/simulazione?materia=${it.subject}` : "/quiz/simulazione";
    case "rielaborazione":
      return "/academy/cornell";
    default:
      return null;
  }
}

/** "Studio · La replicazione del DNA" → "La replicazione del DNA" (the kind is shown on its own line). */
function shortTitle(it: PlanItem) {
  return it.title.includes(" · ") ? it.title.split(" · ").slice(1).join(", ") : it.title;
}

// The meridian fills segment by segment on first render: part of the block's one entrance.
const SEGMENT_DELAY = [
  "[&_.meridian-fill]:[animation-delay:320ms]",
  "[&_.meridian-fill]:[animation-delay:440ms]",
  "[&_.meridian-fill]:[animation-delay:560ms]",
  "[&_.meridian-fill]:[animation-delay:680ms]",
  "[&_.meridian-fill]:[animation-delay:800ms]",
  "[&_.meridian-fill]:[animation-delay:920ms]",
  "[&_.meridian-fill]:[animation-delay:1040ms]",
  "[&_.meridian-fill]:[animation-delay:1160ms]",
];

const MAX_ITEMS = 6;

function TodayPlan({ items, done, hasPlan, restDay }: { items: PlanItem[]; done: string[]; hasPlan: boolean; restDay: boolean }) {
  const toggle = useAtlas((s) => s.togglePlanItem);
  const progress = useAtlas((s) => s.progress);
  const doneSet = new Set(done);
  const shown = items.slice(0, MAX_ITEMS);
  const doneCount = items.filter((i) => doneSet.has(i.id)).length;
  const nextId = items.find((i) => !doneSet.has(i.id))?.id;
  const remaining = items.filter((i) => !doneSet.has(i.id)).reduce((a, i) => a + i.minutes, 0);

  const onToggle = (it: PlanItem) => {
    const wasDone = doneSet.has(it.id);
    toggle(it.id);
    if (wasDone) {
      toast("Segnata come da fare", { tone: "info" });
      return;
    }
    const id = it.topicIds[0];
    const p = id ? progress[id] : undefined;
    const needsCheck = (it.kind === "apprendimento" || it.kind === "recupero") && !p?.quiz.length && !p?.recall.length;
    toast("Segnata come svolta", needsCheck ? { tone: "info", description: "Per considerare l’argomento appreso serve una verifica: fai il quiz o il richiamo attivo." } : {});
  };

  const header = (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold tracking-[-0.005em] text-fg">Piano di oggi</h2>
      {items.length > 0 && (
        <span className="text-sm text-fg-muted">
          {doneCount === items.length ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
              Completato
            </span>
          ) : (
            `${doneCount} di ${items.length} svolte`
          )}
        </span>
      )}
    </div>
  );

  if (!hasPlan || !items.length) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="mt-5 flex gap-3">
          <div className="relative flex w-8 shrink-0 justify-center" aria-hidden>
            <Meridian orientation="vertical" value={0} className="absolute left-[15px] top-4 h-[calc(100%-1rem)]" />
            <span className="relative mt-[3px] h-3.5 w-3.5 rounded-full border-2 border-white/25 bg-ink-800" />
          </div>
          <div className="min-w-0 pb-1">
            {!hasPlan ? (
              <>
                <p className="text-base font-medium leading-snug text-fg">Non hai ancora un piano di studio</p>
                <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-fg-muted">
                  Indica giorni e ore disponibili: ATLAS distribuisce studio, ripassi e simulazioni fino all’esame, partendo dai tuoi progressi reali.
                </p>
                <Button variant="secondary" href="/calendario" className="mt-4 h-11 sm:h-10">
                  <CalendarPlus className="h-4 w-4" aria-hidden />
                  Crea il piano
                </Button>
              </>
            ) : restDay ? (
              <>
                <p className="flex items-center gap-2 text-base font-medium leading-snug text-fg">
                  <Coffee className="h-4 w-4 text-fg-muted" aria-hidden />
                  Oggi è un giorno di recupero
                </p>
                <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-fg-muted">Il riposo consolida la memoria. Se vuoi comunque studiare, il consiglio di oggi resta valido.</p>
                <CalendarLink className="mt-2">Apri il calendario</CalendarLink>
              </>
            ) : (
              <>
                <p className="text-base font-medium leading-snug text-fg">Nessuna attività prevista oggi</p>
                <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-fg-muted">Il piano non ha attività per questa data. Ricalcolalo dal calendario se le tue disponibilità sono cambiate.</p>
                <CalendarLink className="mt-2">Apri il calendario</CalendarLink>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {header}
      <ol className="mt-5" aria-label="Attività di oggi">
        {shown.map((it, i) => {
          const isDone = doneSet.has(it.id);
          const isNext = it.id === nextId;
          const href = isDone ? null : actionFor(it);
          const title = shortTitle(it);
          const last = i === shown.length - 1;
          const body = (
            <>
              <span className={cn("block text-xs", isNext ? "font-medium text-azure-300" : "text-fg-subtle")}>
                {isNext && <span className="sr-only">Prossima attività: </span>}
                {KIND_META[it.kind].label}
                {it.minutes > 0 && `, ${fmt.minutes(it.minutes)}`}
              </span>
              <span className={cn("mt-0.5 block text-sm leading-snug", isDone ? "text-fg-muted line-through decoration-white/25" : "text-fg", isNext && "font-medium")}>{title}</span>
            </>
          );
          return (
            <li key={it.id} className={cn("relative flex gap-3", !last && "pb-2")}>
              {!last && (
                <Meridian
                  orientation="vertical"
                  value={isDone ? 1 : 0}
                  className={cn("absolute left-[15px] top-[26px] h-[calc(100%-8px)]", SEGMENT_DELAY[i] ?? SEGMENT_DELAY[SEGMENT_DELAY.length - 1])}
                />
              )}
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-label={`Svolta: ${KIND_META[it.kind].label}, ${title}`}
                onClick={() => onToggle(it)}
                className="group relative z-10 mt-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full before:absolute before:-inset-1.5 before:content-['']"
              >
                <span
                  className={cn(
                    "grid place-items-center rounded-full transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-active:scale-90",
                    isDone
                      ? "h-[18px] w-[18px] bg-azure-400 text-ink-950"
                      : isNext
                        ? "h-[18px] w-[18px] border-2 border-azure-300 bg-ink-800 shadow-[0_0_0_4px_rgb(61_139_255/0.16)] group-hover:bg-azure-500/30"
                        : "h-4 w-4 border-2 border-white/25 bg-ink-800 group-hover:border-white/50",
                  )}
                  aria-hidden
                >
                  {isDone && <Check className="h-3 w-3 animate-pop-in" strokeWidth={3} />}
                </span>
              </button>
              {href ? (
                <Link href={href} className="group flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.04]">
                  <span className="min-w-0 flex-1">{body}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" aria-hidden />
                </Link>
              ) : (
                <div className="min-h-11 min-w-0 flex-1 px-2 py-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-5 text-sm">
        <span className="text-fg-muted">{remaining > 0 ? `Restano ${fmt.minutes(remaining)}` : "Hai completato il piano di oggi"}</span>
        <CalendarLink>{items.length > MAX_ITEMS ? `Altre ${items.length - MAX_ITEMS} attività nel calendario` : "Apri il calendario"}</CalendarLink>
      </div>
    </div>
  );
}

function CalendarLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Link href="/calendario" className={cn("inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-medium text-azure-300 transition-colors hover:text-azure-200", className)}>
      {children}
      <ChevronRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
