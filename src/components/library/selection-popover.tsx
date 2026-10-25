"use client";

import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { GalleryVerticalEnd, Sparkles } from "lucide-react";
import type { HighlightColor } from "@/lib/library";
import { cn } from "@/lib/utils";
import { HL, HL_COLORS } from "./shared";

/**
 * Actions on the selected passage, anchored to the selection: above it with a
 * mouse, below it on touch screens (where the system menu sits above).
 * Buttons keep the selection alive (no focus steal on mouse down).
 */
export const SelectionPopover = forwardRef<
  HTMLDivElement,
  {
    rect: DOMRect;
    coarse: boolean;
    topInset: number;
    bottomInset?: number;
    onColor: (c: HighlightColor) => void;
    onExplain: () => void;
    onCard: () => void;
    onPointerDownInside: () => void;
  }
>(function SelectionPopover({ rect, coarse, topInset, bottomInset = 8, onColor, onExplain, onCard, onPointerDownInside }, ref) {
  const inner = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight - bottomInset;
    const left = Math.max(8, Math.min(vw - w - 8, rect.left + rect.width / 2 - w / 2));
    const above = rect.top - h - 10;
    const below = rect.bottom + 10;
    let top = coarse ? below : above;
    if (!coarse && above < topInset + 4) top = below;
    if (coarse && below + h > vh - 8) top = Math.max(topInset + 4, above);
    top = Math.max(topInset + 4, Math.min(vh - h - 8, top));
    setPos({ left, top });
  }, [rect, coarse, topInset, bottomInset]);

  const keep = (e: React.MouseEvent) => e.preventDefault();
  const btn = coarse ? "h-11 min-w-11" : "h-9 min-w-9";

  return (
    <div
      ref={(node) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role="group"
      data-own-arrows
      aria-label="Azioni sul testo selezionato"
      onMouseDown={keep}
      onPointerDown={onPointerDownInside}
      className="surface-overlay fixed z-[45] flex items-center gap-0.5 rounded-control p-1 shadow-overlay animate-pop-in"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      {HL_COLORS.map((c, i) => (
        <button
          key={c}
          type="button"
          onClick={() => onColor(c)}
          className={cn("grid place-items-center rounded-lg transition-colors hover:bg-white/[0.08]", btn)}
          aria-label={`Evidenzia in ${HL[c].label}`}
          title={`Evidenzia in ${HL[c].label} (${i + 1})`}
        >
          <span className="h-[18px] w-[18px] rounded-full ring-1 ring-inset ring-white/25" style={{ background: HL[c].swatch }} aria-hidden />
        </button>
      ))}
      <span className="mx-1 h-6 w-px bg-white/[0.1]" aria-hidden />
      <button
        type="button"
        onClick={onCard}
        aria-label={coarse ? "Crea flashcard" : undefined}
        title="Crea una flashcard dal passaggio"
        className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 text-ui font-medium text-fg-muted transition-colors hover:bg-white/[0.08] hover:text-fg", btn)}
      >
        <GalleryVerticalEnd className="h-4 w-4" aria-hidden />
        {!coarse && "Flashcard"}
      </button>
      <button type="button" onClick={onExplain} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 text-ui font-medium text-azure-200 transition-colors hover:bg-azure-500/15", btn)}>
        <Sparkles className="h-4 w-4" aria-hidden /> Spiega
      </button>
    </div>
  );
});
