"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, CornerDownLeft, BookOpen, GraduationCap } from "lucide-react";
import { NAV } from "./nav";
import { searchTopics, norm } from "@/lib/search";
import { TECHNIQUES } from "@/data/academy";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  href: string;
  kind: "sezione" | "argomento" | "tecnica";
  tone?: keyof typeof TONE;
  official?: boolean;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const nq = norm(q);
    const sections: Entry[] = NAV.filter((n) => !nq || norm(n.label).includes(nq)).map((n) => ({
      id: n.id,
      label: n.label,
      href: n.href,
      kind: "sezione",
    }));
    const techniques: Entry[] = TECHNIQUES.filter((t) => nq && (norm(t.name).includes(nq) || norm(t.tagline).includes(nq))).map((t) => ({
      id: t.id,
      label: t.name,
      hint: t.tagline,
      href: `/academy/${t.id}`,
      kind: "tecnica",
    }));
    const topics: Entry[] = searchTopics(q, 8).map(({ ref }) => ({
      id: ref.topic.id,
      label: ref.topic.title,
      hint: `${ref.subject.name} · Unità ${ref.unit.number}`,
      href: `/materie/${ref.subject.id}/${ref.topic.id}`,
      kind: "argomento",
      tone: SUBJECT_TONE[ref.subject.id],
      official: !ref.topic.advanced,
    }));
    return [...topics, ...techniques, ...sections].slice(0, 14);
  }, [q]);

  useEffect(() => setIndex(0), [q]);

  if (!open || typeof document === "undefined") return null;

  const go = (e: Entry) => {
    onClose();
    router.push(e.href);
  };

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Ricerca">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-ink-850/95 shadow-2xl backdrop-blur-xl animate-fade-up">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(entries.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter" && entries[index]) go(entries[index]);
            }}
            placeholder="Es. ciclo di Krebs, Bernoulli, tamponi, Feynman…"
            className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
            aria-label="Cerca"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {entries.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-subtle">Nessun risultato nel syllabus per “{q}”.</li>}
          {entries.map((e, i) => (
            <li key={`${e.kind}-${e.id}`} role="option" aria-selected={i === index}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(e)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === index ? "bg-white/[0.07]" : "hover:bg-white/[0.04]")}
              >
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.05]", e.tone ? TONE[e.tone].text : "text-fg-muted")}>
                  {e.kind === "argomento" ? <BookOpen className="h-4 w-4" /> : e.kind === "tecnica" ? <GraduationCap className="h-4 w-4" /> : <CornerDownLeft className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{e.label}</span>
                  {e.hint && <span className="block truncate text-[12px] text-fg-subtle">{e.hint}</span>}
                </span>
                {e.kind === "argomento" && e.official && <Badge tone="azure">Programma ufficiale</Badge>}
                {e.kind !== "argomento" && <span className="text-[11px] capitalize text-fg-subtle">{e.kind}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
