"use client";

import { create } from "zustand";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "info" | "warning";
}

const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 3800);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export function toast(title: string, opts: { description?: string; tone?: ToastItem["tone"] } = {}) {
  useToasts.getState().push({ title, description: opts.description, tone: opts.tone ?? "success" });
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "warning" ? AlertTriangle : Info;
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3 text-left shadow-2xl backdrop-blur-xl animate-fade-up"
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                t.tone === "success" && "text-emerald-300",
                t.tone === "info" && "text-azure-300",
                t.tone === "warning" && "text-amber-300",
              )}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-fg">{t.title}</div>
              {t.description && <div className="mt-0.5 text-[13px] text-fg-muted">{t.description}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
