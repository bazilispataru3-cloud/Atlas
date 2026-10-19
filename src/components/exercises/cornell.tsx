"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import { Button, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas } from "@/lib/store";
import { fmt } from "@/lib/utils";

/** Cornell notes: cue column, notes column, summary. Autosaves per topic. */
export function CornellEditor({ topicId, seedCues }: { topicId: string; seedCues?: string[] }) {
  const saved = useAtlas((s) => s.cornell[topicId]);
  const save = useAtlas((s) => s.saveCornell);
  const [cues, setCues] = useState(saved?.cues ?? (seedCues ?? []).map((c) => `• ${c}`).join("\n"));
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const [summary, setSummary] = useState(saved?.summary ?? "");
  const [hideNotes, setHideNotes] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => save(topicId, { cues, notes, summary }), 800);
    return () => clearTimeout(t);
  }, [cues, notes, summary, topicId, save]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-fg-subtle">
          A destra prendi appunti; a sinistra scrivi le domande guida; in basso la sintesi. Per ripassare, nascondi gli appunti e rispondi alle domande.
        </p>
        <div className="flex items-center gap-2">
          {saved?.updatedAt && <span className="text-[11.5px] text-fg-subtle">Salvato {fmt.dateShort(saved.updatedAt)}</span>}
          <Button size="sm" variant="ghost" onClick={() => setHideNotes((v) => !v)}>
            {hideNotes ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {hideNotes ? "Mostra appunti" : "Modalità ripasso"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { save(topicId, { cues, notes, summary }); toast("Note Cornell salvate"); }}>
            <Save className="h-4 w-4" /> Salva
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d12]">
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="border-b border-white/10 md:border-b-0 md:border-r">
            <div className="px-4 pt-3 text-[11px] uppercase tracking-wide text-indigo-300/80">Domande guida</div>
            <textarea value={cues} onChange={(e) => setCues(e.target.value)} rows={12} className="w-full resize-y bg-transparent px-4 py-2 text-[13.5px] leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none" placeholder="Perché il ciclo si ferma senza O₂?" aria-label="Domande guida" />
          </div>
          <div className="relative">
            <div className="px-4 pt-3 text-[11px] uppercase tracking-wide text-indigo-300/80">Appunti</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={12} className="w-full resize-y bg-transparent px-4 py-2 text-[13.5px] leading-relaxed text-fg placeholder:text-fg-subtle focus:outline-none" placeholder="Appunti della lezione o della lettura…" aria-label="Appunti" />
            {hideNotes && <div className="absolute inset-0 grid place-items-center bg-[#0d0d12]/95 text-[13px] text-fg-subtle backdrop-blur-sm">Appunti nascosti: rispondi alle domande guida a voce o per iscritto.</div>}
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="px-4 pt-3 text-[11px] uppercase tracking-wide text-indigo-300/80">Sintesi</div>
          <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded-none border-0 bg-transparent focus:ring-0" placeholder="3–5 righe con parole tue." aria-label="Sintesi" />
        </div>
      </div>
    </div>
  );
}
