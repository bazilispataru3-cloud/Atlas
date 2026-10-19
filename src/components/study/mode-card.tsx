"use client";

import { Zap, Layers, BrainCircuit, Clock, Check } from "lucide-react";
import type { StudyMode } from "@/lib/types";
import { MODE_INFO } from "@/data/academy";
import { cn } from "@/lib/utils";

const ICON = { fast: Zap, deep: Layers, ultra: BrainCircuit } as const;

const STYLE: Record<StudyMode, { ring: string; glow: string; text: string; chip: string; grad: string }> = {
  fast: {
    ring: "hover:border-teal-300/40 data-[selected=true]:border-teal-300/60",
    glow: "data-[selected=true]:shadow-[0_0_0_1px_rgba(94,234,212,0.35),0_20px_60px_-20px_rgba(45,212,191,0.55)] hover:shadow-[0_20px_60px_-24px_rgba(45,212,191,0.45)]",
    text: "text-teal-300",
    chip: "border-teal-300/20 bg-teal-300/[0.07] text-teal-100",
    grad: "from-teal-400/20 via-teal-400/5 to-transparent",
  },
  deep: {
    ring: "hover:border-indigo-300/40 data-[selected=true]:border-indigo-300/60",
    glow: "data-[selected=true]:shadow-[0_0_0_1px_rgba(165,180,252,0.35),0_20px_60px_-20px_rgba(107,140,255,0.6)] hover:shadow-[0_20px_60px_-24px_rgba(107,140,255,0.5)]",
    text: "text-indigo-300",
    chip: "border-indigo-300/20 bg-indigo-300/[0.07] text-indigo-100",
    grad: "from-indigo-400/20 via-indigo-400/5 to-transparent",
  },
  ultra: {
    ring: "hover:border-fuchsia-300/40 data-[selected=true]:border-fuchsia-300/60",
    glow: "data-[selected=true]:shadow-[0_0_0_1px_rgba(240,171,252,0.35),0_20px_60px_-20px_rgba(232,121,249,0.55)] hover:shadow-[0_20px_60px_-24px_rgba(232,121,249,0.45)]",
    text: "text-fuchsia-300",
    chip: "border-fuchsia-300/20 bg-fuchsia-300/[0.07] text-fuchsia-100",
    grad: "from-fuchsia-400/20 via-fuchsia-400/5 to-transparent",
  },
};

/** Decorative motif: speed lines (fast), stacked strata (deep), constellation (ultra). */
function ModeArt({ mode }: { mode: StudyMode }) {
  if (mode === "fast")
    return (
      <svg viewBox="0 0 200 120" className="absolute right-0 top-0 h-32 w-56 opacity-70" aria-hidden>
        {[18, 34, 50, 66, 82].map((y, i) => (
          <line key={y} x1={60 + i * 12} y1={y} x2={196} y2={y} stroke="#2dd4bf" strokeOpacity={0.12 + i * 0.07} strokeWidth={2} strokeLinecap="round" />
        ))}
        <path d="M150 14 L128 58 L146 58 L134 100 L170 46 L151 46 L164 14 Z" fill="#2dd4bf" fillOpacity="0.18" stroke="#5eead4" strokeOpacity="0.5" />
      </svg>
    );
  if (mode === "deep")
    return (
      <svg viewBox="0 0 200 120" className="absolute right-0 top-0 h-32 w-56 opacity-80" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M${70 + i * 6} ${30 + i * 16} L${140 + i * 6} ${14 + i * 16} L${196} ${30 + i * 16} L${126 + i * 0} ${46 + i * 16} Z`}
            fill="#6b8cff"
            fillOpacity={0.06 + i * 0.05}
            stroke="#a5b4fc"
            strokeOpacity={0.15 + i * 0.1}
          />
        ))}
      </svg>
    );
  const pts = [
    [120, 20], [150, 34], [178, 18], [168, 60], [136, 70], [190, 84], [112, 52], [150, 100],
  ];
  const links = [[0, 1], [1, 2], [1, 3], [3, 4], [4, 6], [6, 0], [3, 5], [4, 7], [5, 7]];
  return (
    <svg viewBox="0 0 200 120" className="absolute right-0 top-0 h-32 w-56 opacity-80" aria-hidden>
      {links.map(([a, b], i) => (
        <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]} stroke="#f0abfc" strokeOpacity="0.22" />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3.2 : 2.2} fill="#e879f9" fillOpacity={0.4 + (i % 3) * 0.2} />
      ))}
    </svg>
  );
}

export function ModeCard({
  mode,
  selected,
  onSelect,
  compact,
}: {
  mode: StudyMode;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const info = MODE_INFO[mode];
  const s = STYLE[mode];
  const Icon = ICON[mode];
  return (
    <button
      type="button"
      onClick={onSelect}
      data-selected={!!selected}
      aria-pressed={!!selected}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-850/80 p-6 text-left transition-all duration-300 hover:-translate-y-0.5",
        s.ring,
        s.glow,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", s.grad)} />
      <ModeArt mode={mode} />
      <div className="relative">
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/30", s.text)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={cn("mt-5 text-[11px] font-semibold uppercase tracking-[0.2em]", s.text)}>{info.claim}</div>
        <h3 className="mt-1 font-display text-[2rem] leading-none text-fg">{info.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">{info.description}</p>
      </div>
      {!compact && (
        <ul className="relative mt-5 flex flex-wrap gap-1.5">
          {info.techniques.map((t) => (
            <li key={t} className={cn("rounded-full border px-2.5 py-1 text-[11.5px]", s.chip)}>
              {t}
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-auto flex items-center justify-between gap-3 pt-6 text-[12.5px] text-fg-subtle">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {info.time}
        </span>
        <span className="truncate">{info.bestFor}</span>
      </div>
      {selected && (
        <span className={cn("absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-white text-ink-950")}>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
