"use client";

import { useEffect } from "react";
import { Atom, FlaskConical, Microscope, Telescope } from "lucide-react";
import type { SubjectId } from "@/lib/types";
import type { TopicState } from "@/lib/hooks";
import { STATUS_LABEL, type TopicStatus } from "@/lib/progress";
import { STATUS_FILL } from "@/components/ui/status";
import { cn } from "@/lib/utils";

export const SUBJECT_ICONS = { biologia: Microscope, chimica: FlaskConical, fisica: Atom } as const satisfies Record<SubjectId, unknown>;

/** Order in which statuses are listed (most advanced first). */
export const STATUS_ORDER: TopicStatus[] = ["consolidato", "da-consolidare", "in-corso", "nuovo"];

/** Plural labels for counts ("3 da consolidare", "1 consolidato"). */
export function statusCount(status: TopicStatus, n: number): string {
  const word: Record<TopicStatus, [string, string]> = {
    consolidato: ["consolidato", "consolidati"],
    "da-consolidare": ["da consolidare", "da consolidare"],
    "in-corso": ["in studio", "in studio"],
    nuovo: ["da iniziare", "da iniziare"],
  };
  return `${n} ${word[status][n === 1 ? 0 : 1]}`;
}

/** "0,75 CFU": Italian decimal comma for official credit values. */
export function cfu(n: number): string {
  return `${n.toLocaleString("it-IT", { maximumFractionDigits: 2 })} CFU`;
}

/**
 * Status dot. "Da iniziare" is an empty ring (visible, but quiet): the shared
 * fill for that status is meant for dense strips, not for a single marker.
 */
export function StatusDot({ status, className }: { status: TopicStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        status === "nuovo" ? "border border-white/30" : STATUS_FILL[status],
        className,
      )}
    />
  );
}

/** Strip fill per status; "da iniziare" gets a visible track (the shared fill is ~1.2:1). */
export const STRIP_FILL: Record<TopicStatus, string> = { ...STATUS_FILL, nuovo: "bg-white/[0.14]" };

/** Legend of status counts as text (the colour dots are decoration). */
export function StatusCounts({ states, className }: { states: Pick<TopicState, "status">[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-ui text-fg-muted", className)}>
      {STATUS_ORDER.map((st) => {
        const n = states.filter((s) => s.status === st).length;
        return (
          <li key={st} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <StatusDot status={st} className="h-2 w-2" />
            <span>
              <span className="tabular-nums text-fg">{n}</span> {statusCount(st, n).slice(String(n).length + 1)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** One tick per topic in syllabus order: where the student has already been. */
export function TopicStrip({ states, className }: { states: Pick<TopicState, "status">[]; className?: string }) {
  return (
    <div className={cn("flex gap-[3px]", className)} aria-hidden>
      {states.map((x, i) => (
        <span key={i} className={cn("h-1.5 min-w-0 flex-1 rounded-full", STRIP_FILL[x.status])} />
      ))}
    </div>
  );
}

/**
 * Marks content beyond the official syllabus. Neutral with an indigo hint and
 * a dashed outline ("outside the line"); never gold, which means premium.
 */
export function AdvancedBadge({ className, children = "Approfondimento" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-chip border border-dashed border-indigo-300/40 bg-indigo-400/[0.06] px-2 text-xs font-medium text-indigo-200",
        className,
      )}
    >
      <Telescope className="h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}

/** Topic to work on next: first "da consolidare", then "in studio", then "da iniziare" (syllabus order). */
export function nextOf<T extends Pick<TopicState, "status">>(list: T[]): T | undefined {
  return list.find((x) => x.status === "da-consolidare") ?? list.find((x) => x.status === "in-corso") ?? list.find((x) => x.status === "nuovo");
}

export const STATUS_RANK: Record<TopicStatus, number> = { "da-consolidare": 0, "in-corso": 1, nuovo: 2, consolidato: 3 };

export { STATUS_LABEL };

/**
 * While mounted, anchors and keyboard focus stop below the top bar AND the
 * page's own sticky bar (WCAG 2.4.11), instead of the shell default (4.5rem).
 */
export function useScrollPaddingTop(rem: number) {
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollPaddingTop;
    html.style.scrollPaddingTop = `${rem}rem`;
    return () => {
      html.style.scrollPaddingTop = prev;
    };
  }, [rem]);
}
