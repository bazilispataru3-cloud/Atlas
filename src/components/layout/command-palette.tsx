"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, BookOpen, GraduationCap, CornerDownLeft, Play, GalleryVerticalEnd, Target, Sparkles, type LucideIcon } from "lucide-react";
import { NAV } from "./nav";
import { searchTopics, norm } from "@/lib/search";
import { TECHNIQUES } from "@/data/academy";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import { Badge, Kbd, useDialog } from "@/components/ui/primitives";
import { useUI } from "@/lib/ui-store";

type Kind = "azione" | "argomento" | "tecnica" | "sezione";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  kind: Kind;
  href?: string;
  run?: () => void;
  icon: LucideIcon;
  tone?: keyof typeof TONE;
  advanced?: boolean;
}

const KIND_LABEL: Record<Kind, string> = { azione: "Azione", argomento: "Argomento", tecnica: "Tecnica", sezione: "Sezione" };

/** Quick search over the syllabus, the study techniques and the sections (combobox + listbox). */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const openStartStudy = useUI((s) => s.openStartStudy);
  const openProfessor = useUI((s) => s.openProfessor);
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const ref = useDialog(open, onClose);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIndex(0);
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const nq = norm(q);
    const actions: Entry[] = [
      { id: "start", label: "Inizia a studiare", hint: "Scegli materia, argomento e modalità", kind: "azione", run: () => openStartStudy(), icon: Play },
      { id: "review", label: "Ripassa le flashcard in scadenza", kind: "azione", href: "/flashcard/ripasso", icon: GalleryVerticalEnd },
      { id: "sim", label: "Nuova simulazione d’esame", kind: "azione", href: "/quiz/simulazione", icon: Target },
      { id: "prof", label: "Chiedi all’AI Professor", kind: "azione", run: () => openProfessor(q ? { prompt: q } : undefined), icon: Sparkles },
    ].filter((a) => !nq || norm(a.label).includes(nq)) as Entry[];
    const sections: Entry[] = NAV.filter((n) => !nq || norm(n.label).includes(nq)).map((n) => ({
      id: n.id,
      label: n.label,
      href: n.href,
      kind: "sezione",
      icon: n.icon,
    }));
    const techniques: Entry[] = TECHNIQUES.filter((t) => nq && (norm(t.name).includes(nq) || norm(t.tagline).includes(nq))).map((t) => ({
      id: t.id,
      label: t.name,
      hint: t.tagline,
      href: `/academy/${t.id}`,
      kind: "tecnica",
      icon: GraduationCap,
    }));
    const topics: Entry[] = searchTopics(q, 8).map(({ ref }) => ({
      id: ref.topic.id,
      label: ref.topic.title,
      hint: `${ref.subject.name}, unità ${ref.unit.number}: ${ref.unit.title}`,
      href: `/materie/${ref.subject.id}/${ref.topic.id}`,
      kind: "argomento",
      icon: BookOpen,
      tone: SUBJECT_TONE[ref.subject.id],
      advanced: ref.topic.advanced,
    }));
    return nq ? [...topics, ...techniques, ...actions, ...sections].slice(0, 14) : [...actions, ...sections];
  }, [q, openStartStudy, openProfessor]);

  if (!open || typeof document === "undefined") return null;

  const go = (e: Entry) => {
    onClose();
    if (e.run) e.run();
    else if (e.href) router.push(e.href);
  };
  const optionId = (i: number) => `${listId}-opt-${i}`;
  const active = Math.min(index, entries.length - 1);

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-3 pt-[max(12px,10vh)] sm:px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] animate-fade-in" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Ricerca rapida" tabIndex={-1} className="surface-overlay relative w-full max-w-xl overflow-hidden rounded-panel outline-none animate-pop-in">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(entries.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && entries[active]) {
                e.preventDefault();
                go(entries[active]);
              }
            }}
            placeholder="Cerca: ciclo di Krebs, Bernoulli, tamponi, Feynman…"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle focus:outline-none"
            role="combobox"
            aria-label="Cerca nel syllabus, nelle tecniche e nelle sezioni"
            aria-expanded={entries.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={entries.length ? optionId(active) : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <Kbd className="hidden sm:inline-flex">Esc</Kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="Risultati" className="max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain p-2">
          {entries.length === 0 && (
            <li className="px-3 py-10 text-center text-sm text-fg-muted" role="presentation">
              Nessun risultato per “{q}”. Prova con un termine più breve o chiedi all’AI Professor.
            </li>
          )}
          {entries.map((e, i) => {
            const Icon = e.icon;
            const selected = i === active;
            return (
              <li
                key={`${e.kind}-${e.id}`}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                onMouseMove={() => setIndex(i)}
                onClick={() => go(e)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5", selected ? "bg-white/[0.07]" : "")}
              >
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.05]", e.tone ? TONE[e.tone].text : e.kind === "azione" ? "text-azure-300" : "text-fg-muted")}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{e.label}</span>
                  {e.hint && <span className="block truncate text-xs text-fg-subtle">{e.hint}</span>}
                </span>
                {e.advanced && <Badge tone="muted">Approfondimento</Badge>}
                {selected ? <CornerDownLeft className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden /> : <span className="hidden shrink-0 text-xs text-fg-subtle sm:inline">{KIND_LABEL[e.kind]}</span>}
              </li>
            );
          })}
        </ul>
        <div className="hidden items-center gap-4 border-t border-white/[0.07] px-4 py-2 text-xs text-fg-subtle sm:flex">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> per scegliere
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Invio</Kbd> per aprire
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
