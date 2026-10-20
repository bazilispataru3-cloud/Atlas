"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { Modal, Button, Input, Label, Segmented } from "@/components/ui/primitives";
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
    <Modal open={open} onClose={() => finish(false)} size="md" ariaLabel="Benvenuto in ATLAS STUDY">
      <form
        className="pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          finish(false);
        }}
      >
        <LogoMark className="h-11 w-11" />
        <h2 className="mt-5 font-display text-[2rem] leading-[1.1] text-fg sm:text-4xl">Benvenuto in ATLAS STUDY</h2>
        <p className="mt-3 text-base leading-relaxed text-fg-muted">
          Il tuo spazio per il semestre filtro di Medicina e Chirurgia 2026/27: programma ufficiale MUR, tre modalità di studio, flashcard, simulazioni e risorse verificate.
        </p>

        <div className="mt-7 space-y-5">
          <div>
            <Label htmlFor="ob-name">Come ti chiami?</Label>
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome" autoComplete="given-name" autoFocus />
          </div>
          <div>
            <Label id="ob-target">Appello obiettivo</Label>
            <Segmented
              ariaLabel="Appello obiettivo"
              value={target}
              onChange={setTarget}
              options={EXAM_DATES.map((e) => ({ value: e.id, label: `${e.label}, ${fmt.dateShort(e.date)}` }))}
            />
          </div>
          <div>
            <Label id="ob-goal">Obiettivo di studio giornaliero</Label>
            <Segmented
              ariaLabel="Obiettivo di studio giornaliero"
              value={goal}
              onChange={setGoal}
              options={[
                { value: "120", label: "2 ore" },
                { value: "180", label: "3 ore" },
                { value: "240", label: "4 ore" },
                { value: "300", label: "5 ore" },
              ]}
            />
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-fg-muted">
          I progressi restano salvati in questo browser. Nessun dato lascia il dispositivo senza una tua azione esplicita.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" variant="primary" size="lg" className="w-full sm:flex-1">
            Inizia da zero
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:flex-1" onClick={() => finish(true)}>
            <FlaskConical className="h-4 w-4" aria-hidden /> Prova con dati demo
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-fg-subtle">I dati demo sono segnalati in alto e si cancellano da Profilo, sezione Dati.</p>
      </form>
    </Modal>
  );
}
