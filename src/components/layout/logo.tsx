"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/** ATLAS mark: an "A" drawn as two meridians of a sphere crossed by an orbit. */
export function LogoMark({ className }: { className?: string }) {
  // Unique gradient ids: several marks can coexist (one may sit in a hidden sidebar).
  const uid = useId().replace(/:/g, "");
  const g = `atlas-g-${uid}`;
  const r = `atlas-r-${uid}`;
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4e0ff" />
          <stop offset="55%" stopColor="#56a6ff" />
          <stop offset="100%" stopColor="#1b6ee6" />
        </linearGradient>
        <radialGradient id={r} cx="0.3" cy="0.25" r="0.9">
          <stop offset="0%" stopColor="#2f8bff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2f8bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#0c0c10" stroke="rgba(255,255,255,0.09)" />
      <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${r})`} />
      <path d="M12 29 L20 10 L28 29" fill="none" stroke={`url(#${g})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="20" cy="22.5" rx="12.5" ry="4.2" fill="none" stroke={`url(#${g})`} strokeWidth="1.4" opacity="0.85" transform="rotate(-12 20 22.5)" />
      <circle cx="31.2" cy="19.6" r="1.6" fill="#efc55c" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-[0.22em] text-fg">ATLAS</div>
          <div className="mt-1 text-[9.5px] font-medium tracking-[0.32em] text-fg-subtle">STUDY</div>
        </div>
      )}
    </div>
  );
}
