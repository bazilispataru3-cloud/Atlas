"use client";

import { useEffect, useSyncExternalStore, type ComponentType } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  BookOpen,
  Calculator,
  Check,
  Circle,
  ClipboardCheck,
  Coffee,
  GraduationCap,
  Layers,
  Moon,
  NotebookPen,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import type { SubjectId } from "@/lib/types";
import { getTopicRef } from "@/data/syllabus";
import { buttonClasses } from "@/components/ui/primitives";
import { SUBJECT_TONE, TONE, type Tone } from "@/components/ui/tone";
import { KIND_META, type PlanItem, type PlanItemKind } from "@/lib/planner";
import { capFirst, fmt, pluralize } from "@/lib/utils";

// `clsx` (not `cn`) where a custom font size such as `text-ui` meets a text colour:
// tailwind-merge does not know `text-ui` and would drop it.
const cx = clsx;

export const SUBJECT_NAME: Record<SubjectId, string> = { biologia: "Biologia", chimica: "Chimica", fisica: "Fisica" };

export const KIND_ICON: Record<PlanItemKind, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  apprendimento: BookOpen,
  esercizi: Calculator,
  ripasso: Layers,
  recupero: RotateCcw,
  interleaving: Shuffle,
  simulazione: ClipboardCheck,
  rielaborazione: NotebookPen,
  pausa: Coffee,
  riposo: Moon,
  esame: GraduationCap,
};

export const kindTone = (kind: PlanItemKind) => KIND_META[kind].tone as Tone;
export const isCheckable = (it: Pick<PlanItem, "kind">) => it.kind !== "riposo" && it.kind !== "esame" && it.kind !== "pausa";

/** The families shown in the legend, in reading order, with one representative kind each. */
export const LEGEND: { label: string; kind: PlanItemKind }[] = [
  { label: "Studio", kind: "apprendimento" },
  { label: "Recupero", kind: "recupero" },
  { label: "Ripasso", kind: "ripasso" },
  { label: "Pratica: esercizi, quiz misti e simulazioni", kind: "simulazione" },
  { label: "Cornell e riposo", kind: "rielaborazione" },
  { label: "Esame", kind: "esame" },
];

/**
 * Title without the kind prefix ("Recupero · Osmosi" → "Osmosi"): the kind is
 * shown as its own label. When the rest is just the subject ("Ripasso
 * dilazionato · Biologia") the subject has its own chip, so the first part stays.
 */
export function itemTitle(it: PlanItem): string {
  const [head, ...rest] = it.title.split(" · ");
  if (!rest.length) return it.title;
  const tail = rest.join(", ");
  if (Object.values(SUBJECT_NAME).includes(tail)) return head;
  return tail;
}

/** Where each kind of plan item leads. */
export function actionFor(it: PlanItem): { href: string; label: string } | null {
  const first = it.topicIds[0] ? getTopicRef(it.topicIds[0]) : undefined;
  switch (it.kind) {
    case "apprendimento":
    case "recupero":
      return first ? { href: `/studio/${first.topic.id}?mode=${it.kind === "recupero" ? "ultra" : "deep"}`, label: "Inizia la sessione" } : null;
    case "esercizi":
      return first ? { href: `/materie/${first.subject.id}/${first.topic.id}#esempi`, label: "Apri gli esercizi" } : null;
    case "ripasso":
      return { href: "/flashcard/ripasso", label: "Ripassa le flashcard" };
    case "interleaving":
      return { href: "/quiz", label: "Fai un quiz misto" };
    case "simulazione":
      return { href: it.subject ? `/quiz/simulazione?materia=${it.subject}` : "/quiz/simulazione", label: "Avvia la simulazione" };
    case "rielaborazione":
      return { href: "/academy/cornell", label: "Apri il metodo Cornell" };
    default:
      return null;
  }
}

/** "4 attività, 2 h 25 min" for a day. */
export function daySummary(list: PlanItem[]): string {
  const work = list.filter((i) => i.kind !== "pausa");
  if (!work.length) return "Nessuna attività";
  if (work.every((i) => i.kind === "riposo")) return "Giorno di riposo";
  if (work.some((i) => i.kind === "esame")) return "Giorno dell’esame";
  const checkable = work.filter(isCheckable);
  const minutes = checkable.reduce((a, i) => a + i.minutes, 0);
  return `${pluralize(checkable.length, "attività", "attività")}, ${fmt.minutes(minutes)}`;
}

/** "Oggi", "Domani" or "Giovedì 22 ottobre". */
export function dayName(key: string, today: string, tomorrow: string): string {
  if (key === today) return "Oggi";
  if (key === tomorrow) return "Domani";
  return capFirst(`${fmt.weekday(key)} ${fmt.date(key)}`);
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** After `tick` changes: scrolls to the top and moves focus to the page title (never lost to <body>). */
export function useFocusTitle(tick: number, reduceMotion: boolean) {
  useEffect(() => {
    if (!tick) return;
    const id = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      const h = document.querySelector<HTMLElement>("#contenuto h1");
      if (h) {
        h.tabIndex = -1;
        h.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);
}

function CheckButton({ done, title, onToggle, size = "md" }: { done: boolean; title: string; onToggle: () => void; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={done}
      aria-label={`Svolto: ${title}`}
      className={cx(
        "grid shrink-0 place-items-center rounded-lg transition-colors duration-150 hover:bg-white/[0.07]",
        size === "sm" ? "-m-1 h-7 w-7" : "-my-1.5 -ml-2 h-10 w-10 sm:h-9 sm:w-9",
      )}
    >
      {done ? (
        <span key="on" className="grid h-5 w-5 place-items-center rounded-full bg-success text-ink-950 animate-pop-in" aria-hidden>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : (
        <Circle key="off" className="h-5 w-5 text-fg-subtle" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

/** Kind (icon in its colour + label), subject (dot + name) and duration: identity never rests on colour alone. */
export function ItemMeta({ it, className }: { it: PlanItem; className?: string }) {
  const Icon = KIND_ICON[it.kind];
  const t = TONE[kindTone(it.kind)];
  return (
    <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted", className)}>
      <span className="inline-flex items-center gap-1.5">
        <Icon className={cx("h-3.5 w-3.5", t.text)} aria-hidden />
        {KIND_META[it.kind].label}
      </span>
      {it.subject && (
        <span className="inline-flex items-center gap-1.5">
          <span className={cx("h-2 w-2 rounded-full", TONE[SUBJECT_TONE[it.subject]].dot)} aria-hidden />
          {SUBJECT_NAME[it.subject]}
        </span>
      )}
      {it.minutes > 0 && <span className="tabular-nums text-fg-subtle">{fmt.minutes(it.minutes)}</span>}
    </div>
  );
}

/** One activity in a list (day panel and agenda). */
export function ItemRow({
  it,
  done,
  onToggle,
  detail,
  primary,
}: {
  it: PlanItem;
  done: boolean;
  onToggle: () => void;
  /** Shows the "how to do it" description. */
  detail?: boolean;
  /** The next thing to do: its action becomes the page's primary button. */
  primary?: boolean;
}) {
  const act = actionFor(it);
  const title = itemTitle(it);
  const Icon = KIND_ICON[it.kind];
  return (
    <li className="flex gap-3 py-3">
      {isCheckable(it) ? (
        <CheckButton done={done} title={title} onToggle={onToggle} />
      ) : (
        <span className="-my-1.5 -ml-2 grid h-10 w-10 shrink-0 place-items-center sm:h-9 sm:w-9" aria-hidden>
          <Icon className={cx("h-[18px] w-[18px]", TONE[kindTone(it.kind)].text)} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-medium leading-snug", done ? "text-fg-muted line-through decoration-fg-subtle" : "text-fg")}>{title}</p>
        <ItemMeta it={it} className="mt-1" />
        {detail && it.detail && <p className="mt-1.5 max-w-[60ch] text-ui leading-relaxed text-fg-subtle">{it.detail}</p>}
        {act && !done && (
          <Link
            href={act.href}
            className={
              primary
                ? buttonClasses("primary", "sm", "mt-2.5")
                : "mt-1 -ml-1 inline-flex h-8 items-center rounded-lg px-1 text-ui font-medium text-azure-300 underline-offset-4 hover:text-azure-200 hover:underline"
            }
          >
            {act.label}
          </Link>
        )}
      </div>
    </li>
  );
}

/** A compact block inside a week column. */
export function WeekItem({ it, done, onToggle }: { it: PlanItem; done: boolean; onToggle: () => void }) {
  const Icon = KIND_ICON[it.kind];
  const t = TONE[kindTone(it.kind)];
  const title = itemTitle(it);
  return (
    <li
      className={cx("rounded-lg border border-white/[0.06] py-1.5 pl-2.5 pr-1.5", done ? "bg-transparent" : "bg-white/[0.025]")}
      style={{ boxShadow: `inset 2px 0 0 ${t.hex}` }}
    >
      <div className="flex items-start gap-1">
        <span className="flex min-w-0 flex-1 items-center gap-1 pt-0.5 text-xs text-fg-muted">
          <Icon className={cx("h-3 w-3 shrink-0", t.text)} aria-hidden />
          <span className="truncate">{KIND_META[it.kind].label}</span>
        </span>
        {isCheckable(it) && <CheckButton size="sm" done={done} title={title} onToggle={onToggle} />}
      </div>
      <p className={cx("mt-1 line-clamp-3 text-xs leading-snug [overflow-wrap:anywhere]", done ? "text-fg-muted line-through" : "text-fg")} title={title}>
        {title}
      </p>
      {(it.subject || it.minutes > 0) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
          {it.subject && <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", TONE[SUBJECT_TONE[it.subject]].dot)} aria-hidden />}
          {it.subject && <span className="sr-only">{SUBJECT_NAME[it.subject]}, </span>}
          {it.minutes > 0 && <span className="tabular-nums">{fmt.minutes(it.minutes)}</span>}
        </div>
      )}
    </li>
  );
}
