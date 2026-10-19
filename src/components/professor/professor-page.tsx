"use client";

import { useState } from "react";
import { BookOpenCheck, MessageSquare, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { useAtlas } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { useIntegrations } from "@/lib/ai-client";
import { cn, fmt } from "@/lib/utils";
import { ProfessorChat } from "./chat";

export function ProfessorPage() {
  const hydrated = useHydrated();
  const chats = useAtlas((s) => s.chats);
  const deleteChat = useAtlas((s) => s.deleteChat);
  const integrations = useIntegrations();
  const [active, setActive] = useState<string | null>(null);
  const [session, setSession] = useState(0); // remounts the chat when switching threads

  const threads = hydrated ? [...chats].sort((a, b) => (b.messages.at(-1)?.createdAt ?? b.createdAt).localeCompare(a.messages.at(-1)?.createdAt ?? a.createdAt)) : [];
  const open = (id: string | null) => {
    setActive(id);
    setSession((n) => n + 1);
  };

  return (
    <div className="grid h-[calc(100dvh-8.5rem)] min-h-[560px] gap-4 pb-4 lg:h-[calc(100dvh-7rem)] lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px]">
      {/* Threads */}
      <aside className="hidden min-h-0 flex-col lg:flex">
        <Button variant="primary" onClick={() => open(null)}>
          <Plus className="h-4 w-4" /> Nuova conversazione
        </Button>
        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {threads.length === 0 && <p className="px-2 py-4 text-[12.5px] text-fg-subtle">Le conversazioni restano salvate in questo browser.</p>}
          {threads.map((t) => (
            <div key={t.id} className={cn("group flex items-center gap-1 rounded-xl px-2 transition", active === t.id ? "bg-white/[0.07]" : "hover:bg-white/[0.04]")}>
              <button onClick={() => open(t.id)} className="min-w-0 flex-1 py-2 text-left">
                <div className="truncate text-[13px] text-fg">{t.title}</div>
                <div className="text-[11px] text-fg-subtle">{fmt.dateShort(t.messages.at(-1)?.createdAt ?? t.createdAt)} · {t.messages.length} messaggi</div>
              </button>
              <button
                onClick={() => {
                  deleteChat(t.id);
                  if (active === t.id) open(null);
                }}
                className="rounded-lg p-1.5 text-fg-subtle opacity-0 transition hover:text-fg group-hover:opacity-100 focus:opacity-100"
                aria-label={`Elimina la conversazione ${t.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div className="min-h-0">
        <ProfessorChat key={session} initialThreadId={active} onThreadChange={setActive} />
      </div>

      {/* About */}
      <aside className="hidden min-h-0 space-y-4 overflow-y-auto xl:block">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-fg"><Sparkles className="h-4 w-4 text-azure-300" /> Il tuo AI Professor</div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
            Spiega a tre livelli (introduttivo, universitario, avanzato), interroga, corregge le tue spiegazioni, genera domande e usa i tuoi documenti citando le pagine.
          </p>
          <div className="mt-3">
            {integrations === null ? null : integrations.ai ? (
              <Badge tone="success" dot>AI attiva</Badge>
            ) : (
              <Badge tone="warning" dot>AI non configurata: risposte dalla base ATLAS</Badge>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-fg"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Regole di affidabilità</div>
          <ul className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-fg-muted">
            <li>• Distingue fatti consolidati, interpretazioni e punti incerti.</li>
            <li>• Cita solo fonti presenti nel contesto (lezioni ATLAS, syllabus, tuoi documenti) e non inventa link.</li>
            <li>• Le informazioni sull’esame vengono dalle fonti ministeriali verificate.</li>
            <li>• Non sostituisce il docente né il libro di testo: verifica sempre i passaggi importanti.</li>
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-fg"><BookOpenCheck className="h-4 w-4 text-gold-300" /> Suggerimento</div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
            Prima di chiedere una spiegazione, prova a spiegare tu e chiedi «Correggi la mia spiegazione»: generare la risposta da soli fissa meglio i concetti.
          </p>
        </Card>
        <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-fg-subtle"><MessageSquare className="h-3.5 w-3.5" /> Le conversazioni restano solo in questo browser.</p>
      </aside>
    </div>
  );
}
