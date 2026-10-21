"use client";

import { useId, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import type { StudyMode } from "@/lib/types";
import { MODE_TONE, TONE } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import { ModeArt } from "./mode-art";
import { DEPTH_LABELS, MODE_META, sequenceFor, toolsSentence, ULTRA_KIND_SUBJECT, type UltraKind } from "./paths";

/** Depth as a labelled three-step scale (essenziale, approfondita, completa): how far the path goes, not how hard it is. */
export function DepthScale({ mode, compact }: { mode: StudyMode; compact?: boolean }) {
  const level = MODE_META[mode].depth;
  const fill = TONE[MODE_TONE[mode]].dot;
  return (
    <div>
      {compact ? (
        <div className="flex items-baseline gap-1.5 text-xs">
          <span className="text-fg-subtle">Profondità</span>
          <span className="font-medium text-fg">{DEPTH_LABELS[level - 1].toLowerCase()}</span>
        </div>
      ) : (
        <div className="text-ui text-fg-subtle">Profondità</div>
      )}
      <div className="mt-1.5 grid grid-cols-3 gap-1" aria-hidden>
        {DEPTH_LABELS.map((l, i) => (
          <span key={l} className={cn("h-1 rounded-full", i < level ? fill : "bg-white/[0.08]")} />
        ))}
      </div>
      {!compact && (
        <div className="mt-1.5 grid grid-cols-3 gap-1 text-xs" aria-hidden>
          {DEPTH_LABELS.map((l, i) => (
            <span key={l} className={cn(i === 2 && "text-right", i === 1 && "text-center", i === level - 1 ? "font-medium text-fg" : "text-fg-subtle")}>
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RadioMark({ selected, mode }: { selected: boolean; mode: StudyMode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors duration-150",
        selected ? cn("border-transparent text-ink-950", TONE[MODE_TONE[mode]].dot) : "border-white/25 bg-transparent group-hover:border-white/40",
      )}
    >
      {selected && <Check className="h-3.5 w-3.5 animate-pop-in" strokeWidth={3} />}
    </span>
  );
}

const SELECTED_BORDER: Record<StudyMode, string> = {
  fast: "border-fast/55",
  deep: "border-deep/60",
  ultra: "border-ultra/55",
};

/**
 * One study mode, as an option of a radio group (`name` groups the cards: arrow keys
 * move between them, Space selects, Enter confirms when `onConfirm` is given).
 * Shows the goal, the depth scale, the duration and the tools the path really uses.
 */
export function ModeCard({
  mode,
  selected,
  onSelect,
  onConfirm,
  compact,
  layout,
  name = "study-mode",
  ultraKind = "meccanistico",
  animateArt,
  headingLevel = 3,
}: {
  mode: StudyMode;
  selected?: boolean;
  onSelect?: () => void;
  /** Enter on the focused option (e.g. start the session). */
  onConfirm?: () => void;
  /** Short horizontal layout. Kept for compatibility: same as `layout="compact"`. */
  compact?: boolean;
  /** `responsive` is compact on phones and full from `md`. */
  layout?: "full" | "compact" | "responsive";
  name?: string;
  /** Which Ultra path to describe (it depends on the topic). */
  ultraKind?: UltraKind;
  animateArt?: boolean;
  headingLevel?: 2 | 3;
}) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  const tone = TONE[MODE_TONE[mode]];
  const lay = layout ?? (compact ? "compact" : "full");
  const seq = sequenceFor(mode, ultraKind);
  const id = useId();
  const H = headingLevel === 2 ? "h2" : "h3";
  const isSel = !!selected;

  // Literal class sets per layout (Tailwind needs whole class names).
  const k = <T extends string>(full: T, compactCls: T, responsive: T) => (lay === "full" ? full : lay === "compact" ? compactCls : responsive);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onConfirm) {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <div
      onClick={() => onSelect?.()}
      className={cn(
        "card group relative flex h-full cursor-pointer overflow-hidden text-left transition-[border-color,background-color] duration-150",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-azure-400",
        k("flex-col", "flex-row", "flex-row md:flex-col"),
        isSel ? cn(SELECTED_BORDER[mode], "bg-white/[0.03]") : "hover:border-white/[0.16]",
      )}
    >
      <input
        type="radio"
        name={name}
        value={mode}
        checked={isSel}
        onChange={() => onSelect?.()}
        onKeyDown={onKeyDown}
        className="sr-only"
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-g ${id}-s`}
      />

      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          k("h-24 w-full border-b border-white/[0.05]", "w-[5.5rem] border-r border-white/[0.05]", "w-[5.5rem] border-r border-white/[0.05] md:h-24 md:w-full md:border-b md:border-r-0"),
        )}
      >
        <ModeArt mode={mode} active={isSel} animate={animateArt} />
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", k("p-5", "p-3.5", "p-3.5 md:p-5"))}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn("grid shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]", tone.text, k("h-8 w-8", "h-7 w-7", "h-7 w-7 md:h-8 md:w-8"))} aria-hidden>
              <Icon className="h-4 w-4" />
            </span>
            <H id={`${id}-t`} className={cn("font-display leading-none text-fg", k("text-3xl", "text-xl", "text-xl md:text-3xl"))}>
              {meta.name}
            </H>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("whitespace-nowrap text-ui text-fg-muted", k("hidden", "inline", "inline md:hidden"))}>{meta.time}</span>
            <RadioMark selected={isSel} mode={mode} />
          </div>
        </div>

        <p id={`${id}-g`} className={cn("leading-relaxed text-fg-muted", k("mt-3 text-sm", "mt-1.5 text-ui", "mt-1.5 text-ui md:mt-3 md:text-sm"))}>
          {meta.goal}
        </p>

        <span id={`${id}-s`} className="sr-only">
          Profondità {DEPTH_LABELS[meta.depth - 1].toLowerCase()}, livello {meta.depth} di 3. Durata {meta.time.replace("–", " - ")}. {seq.length} passi: {toolsSentence(seq)}.
        </span>

        <div className={cn(k("mt-5", "mt-3", "mt-3 md:mt-5"))}>
          <div className={cn(k("block", "hidden", "hidden md:block"))}>
            <DepthScale mode={mode} />
          </div>
          <div className={cn(k("hidden", "block", "block md:hidden"))}>
            <DepthScale mode={mode} compact />
          </div>
        </div>

        <dl className={cn("text-ui", k("mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/[0.06] pt-4", "hidden", "hidden md:mt-5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-4 md:border-t md:border-white/[0.06] md:pt-4"))} aria-hidden>
          <div>
            <dt className="text-fg-subtle">Durata</dt>
            <dd className="mt-0.5 text-sm font-medium text-fg">{meta.time}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Passi</dt>
            <dd className="mt-0.5 text-sm font-medium text-fg">{seq.length}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-fg-subtle">
              Strumenti{mode === "ultra" && <span> (percorso per {ULTRA_KIND_SUBJECT[ultraKind].subject.toLowerCase()})</span>}
            </dt>
            <dd className="mt-1 leading-relaxed text-fg-muted">{toolsSentence(seq)}</dd>
          </div>
        </dl>

        <p className={cn("text-xs leading-relaxed text-fg-subtle", k("hidden", "mt-2 line-clamp-2", "mt-2 line-clamp-2 md:hidden"))} aria-hidden>
          {seq.length} passi: {toolsSentence(seq, false)}
        </p>
      </div>
    </div>
  );
}
