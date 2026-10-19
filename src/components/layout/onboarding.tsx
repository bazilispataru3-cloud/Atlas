"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FlaskConical, Sparkles } from "lucide-react";
import { Modal, Button, Input, Label, Segmented, Notice } from "@/components/ui/primitives";
import { LogoMark } from "./logo";
import { useAtlas } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { buildDemoData } from "@/lib/demo";
import { EXAM_DATES } from "@/data/exam";
import { fmt } from "@/lib/utils";

export function Onboarding() {
  const hydrated = useHydrated();
  const profile = useAtlas((s) => s.profile);
  const updateProfile = useAtlas((s) => s.updateProfile);
  const loadDemo = useAtlas((s) => s.loadDemo);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<"appello-1" | "appello-2">("appello-1");
  const [goal, setGoal] = useState("180");

  useEffect(() => {
    if (hydrated && !profile.onboarded) setOpen(true);
  }, [hydrated, profile.onboarded]);

  const finish = (demo: boolean) => {
    updateProfile({ name: name.trim(), examTarget: target, dailyGoalMinutes: Number(goal), onboarded: true });
    if (demo) loadDemo(buildDemoData());
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={() => finish(false)} size="md">
      <div className="pt-2">
        <LogoMark className="h-11 w-11" />
        <h2 className="mt-5 font-display text-4xl leading-tight text-fg">Benvenuto in ATLAS STUDY</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
          Il tuo spazio per il semestre filtro di Medicina e Chirurgia 2026/27: syllabus ufficiale MUR, tre modalità di studio, flashcard, simulazioni e risorse verificate.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="ob-name">Come ti chiami?</Label>
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome" autoFocus />
          </div>
          <div>
            <Label>Appello obiettivo</Label>
            <Segmented
              value={target}
              onChange={setTarget}
              options={EXAM_DATES.map((e) => ({ value: e.id, label: `${e.label} · ${fmt.dateShort(e.date)}` }))}
            />
          </div>
          <div>
            <Label>Obiettivo di studio giornaliero</Label>
            <Segmented
              value={goal}
              onChange={setGoal}
              options={[
                { value: "120", label: "2 h" },
                { value: "180", label: "3 h" },
                { value: "240", label: "4 h" },
                { value: "300", label: "5 h" },
              ]}
            />
          </div>
        </div>

        <Notice tone="info" className="mt-6">
          I tuoi progressi restano salvati in questo browser. Nessun dato viene inviato a server esterni senza una tua azione esplicita.
        </Notice>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" className="flex-1" onClick={() => finish(false)}>
            <Sparkles className="h-4 w-4" /> Inizia da zero <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" className="flex-1" onClick={() => finish(true)}>
            <FlaskConical className="h-4 w-4" /> Esplora con dati demo
          </Button>
        </div>
        <p className="mt-3 text-center text-[12px] text-fg-subtle">I dati dimostrativi sono segnalati in ogni schermata e si eliminano da Profilo → Dati.</p>
      </div>
    </Modal>
  );
}
