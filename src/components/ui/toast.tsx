"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "warning" | "danger";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

const DURATION = 4200;

const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items.slice(-2), { ...t, id: Date.now() + Math.random() }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export function toast(title: string, opts: { description?: string; tone?: ToastTone } = {}) {
  useToasts.getState().push({ title, description: opts.description, tone: opts.tone ?? "success" });
}

const ICON = { success: CheckCircle2, info: Info, warning: AlertTriangle, danger: XCircle } as const;
const ICON_TONE = { success: "text-success", info: "text-azure-300", warning: "text-warning", danger: "text-danger" } as const;

/** One toast: closes itself after DURATION, pauses while hovered or focused. */
function ToastCard({ t, onDismiss }: { t: ToastItem; onDismiss: () => void }) {
  const remaining = useRef(DURATION);
  const started = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  const start = () => {
    started.current = Date.now();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => dismissRef.current(), remaining.current);
  };
  const pause = () => {
    window.clearTimeout(timer.current);
    remaining.current = Math.max(800, remaining.current - (Date.now() - started.current));
  };

  useEffect(() => {
    start();
    return () => window.clearTimeout(timer.current);
  }, []);

  const Icon = ICON[t.tone];
  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
      className="surface-overlay pointer-events-auto flex w-full items-start gap-3 rounded-card py-3 pl-4 pr-2 animate-pop-in"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ICON_TONE[t.tone])} aria-hidden />
      <div className="min-w-0 flex-1 py-px">
        <div className="text-sm font-medium text-fg">{t.title}</div>
        {t.description && <div className="mt-0.5 text-ui text-fg-muted">{t.description}</div>}
      </div>
      <button type="button" onClick={onDismiss} className="-my-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg" aria-label="Chiudi notifica">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** Just under the top bar (right-aligned from `sm`): never over the tab bar or the premium "$" button. */
export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-[90] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end lg:top-[4.5rem]"
      aria-live="polite"
    >
      {items.map((t) => (
        <div key={t.id} className="w-full max-w-sm">
          <ToastCard t={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
