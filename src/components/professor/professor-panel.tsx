"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize2, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/primitives";
import { useUI } from "@/lib/ui-store";
import { ProfessorChat } from "./chat";

/** Infers the topic in view from the URL (/materie/[subject]/[topic] or /studio/[topic]). */
function topicFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/materie\/[^/]+\/([^/?#]+)/) ?? pathname.match(/^\/studio\/([^/?#]+)/);
  return m?.[1];
}

export function ProfessorPanel() {
  const open = useUI((s) => s.professorOpen);
  const ctx = useUI((s) => s.professorContext);
  const close = useUI((s) => s.closeProfessor);
  const pathname = usePathname();
  const topicId = ctx?.topicId ?? topicFromPath(pathname);

  return (
    <Sheet
      open={open}
      onClose={close}
      width="max-w-xl"
      title={
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-azure-400/20 bg-azure-500/[0.08] text-azure-300" aria-hidden>
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">AI Professor</h2>
            <p className="truncate text-xs text-fg-subtle">Tutor universitario con fonti citabili</p>
          </div>
        </div>
      }
      headerExtra={
        pathname !== "/professor" && (
          <Link
            href="/professor"
            onClick={close}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
            aria-label="Apri a pagina intera"
            title="Apri a pagina intera"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </Link>
        )
      }
    >
      <div className="h-full">{open && <ProfessorChat initialTopicId={topicId} initialPrompt={ctx?.prompt} initialDocId={ctx?.docId} compact />}</div>
    </Sheet>
  );
}
