"use client";

import { useId, useState } from "react";
import { Check, CheckCircle2, CircleHelp, X } from "lucide-react";
import type { StepCheck as StepCheckData } from "./guide";
import { cn } from "@/lib/utils";

/**
 * "Prova tu": one quick question per tutorial step. A wrong choice shakes and
 * invites another try; the right one confirms and explains why, then calls
 * `onCorrect` (the guide moves focus to "Passo successivo").
 */
export function StepCheck({ check, onCorrect }: { check: StepCheckData; onCorrect?: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const id = useId();

  const pick = (k: number) => {
    if (solved) return;
    setPicked(k);
    if (k === check.answer) {
      setSolved(true);
      onCorrect?.();
    }
  };

  return (
    <div role="group" aria-labelledby={`${id}-q`} className="mt-5 rounded-card border border-azure-400/20 bg-azure-500/[0.04] p-4">
      <p id={`${id}-q`} className="flex gap-2 text-sm leading-relaxed">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-azure-300" aria-hidden />
        <span>
          <span className="font-semibold text-azure-200">Prova tu. </span>
          <span className="text-fg">{check.q}</span>
        </span>
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {check.options.map((o, k) => {
          const isPicked = picked === k;
          const correct = k === check.answer;
          const state = solved && correct ? "correct" : isPicked && !correct ? "wrong" : "idle";
          return (
            <button
              key={k}
              type="button"
              aria-pressed={isPicked}
              aria-disabled={solved || undefined}
              onClick={() => pick(k)}
              className={cn(
                "flex min-h-11 items-center gap-2.5 rounded-control border px-3.5 py-2 text-left text-sm transition-colors duration-150",
                state === "correct" && "animate-correct border-success/45 bg-success/[0.08] text-fg",
                state === "wrong" && "animate-shake border-warning/45 bg-warning/[0.07] text-fg",
                state === "idle" && "border-white/[0.1] bg-white/[0.03] text-fg-muted hover:border-white/[0.2] hover:text-fg",
                solved && !correct && "opacity-60",
                solved && "cursor-default",
              )}
            >
              {state === "correct" ? (
                <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : state === "wrong" ? (
                <X className="h-4 w-4 shrink-0 text-warning" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-white/25" aria-hidden />
              )}
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      <div role="status" className="text-sm leading-relaxed">
        {picked !== null &&
          (picked === check.answer ? (
            <p className="mt-3 flex max-w-[65ch] gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span>
                <span className="font-medium text-fg">Esatto. </span>
                <span className="text-fg-muted">{check.why}</span>
              </span>
            </p>
          ) : (
            <p className="mt-3 flex max-w-[65ch] gap-2">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-medium text-fg">Non proprio. </span>
                <span className="text-fg-muted">Rileggi il passo e scegli un’altra risposta.</span>
              </span>
            </p>
          ))}
      </div>
    </div>
  );
}
