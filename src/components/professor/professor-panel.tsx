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
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-azure-500/15 text-azure-300">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-fg">AI Professor</div>
            <div className="text-[11.5px] text-fg-subtle">Tutor universitario · fonti citabili</div>
          </div>
        </div>
      }
      headerExtra={
        <Link href="/professor" onClick={close} className="rounded-lg p-1.5 text-fg-subtle hover:bg-white/5 hover:text-fg" aria-label="Apri a schermo intero">
          <Maximize2 className="h-4 w-4" />
        </Link>
      }
    >
      <div className="h-full">{open && <ProfessorChat initialTopicId={topicId} initialPrompt={ctx?.prompt} compact />}</div>
    </Sheet>
  );
}
