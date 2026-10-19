"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FlaskConical, GraduationCap, Info, XCircle } from "lucide-react";
import { TECHNIQUES, MODE_INFO, type Goal } from "@/data/academy";
import { TechniqueArt } from "./technique-art";
import { Badge, Card, PageHeader, Segmented } from "@/components/ui/primitives";
import { MODE_TONE } from "@/components/ui/tone";
import type { Tone } from "@/components/ui/tone";

export const EVIDENCE_TONE: Record<"alta" | "moderata" | "limitata" | "indiretta", Tone> = {
  alta: "success",
  moderata: "azure",
  limitata: "warning",
  indiretta: "muted",
};

const GOALS: (Goal | "tutti")[] = ["tutti", "comprensione", "memorizzazione", "problem solving", "esposizione orale"];

/** Common beliefs that the research does not support (with sources). */
const MYTHS = [
  {
    myth: "Rileggere e sottolineare più volte è il modo migliore per prepararsi.",
    fact: "Danno una sensazione di familiarità ma producono poco apprendimento duraturo rispetto al recupero attivo e alla ripetizione dilazionata.",
    source: { label: "Dunlosky et al., 2013", doi: "10.1177/1529100612453266" },
  },
  {
    myth: "Si impara meglio rispettando il proprio «stile di apprendimento» (visivo, uditivo…).",
    fact: "Non ci sono prove che adattare l’insegnamento allo stile dichiarato migliori i risultati. Conta adattare la forma al contenuto (es. diagrammi per strutture spaziali).",
    source: { label: "Pashler et al., 2008", doi: "10.1111/j.1539-6053.2009.01038.x" },
  },
  {
    myth: "Studiare tutto il giorno prima (massed practice) è efficiente.",
    fact: "Funziona per il giorno dopo, ma si dimentica rapidamente: distribuire lo stesso tempo su più giorni produce ricordi più stabili.",
    source: { label: "Cepeda et al., 2006", doi: "10.1037/0033-2909.132.3.354" },
  },
];

export function AcademyIndex() {
  const [goal, setGoal] = useState<Goal | "tutti">("tutti");
  const list = TECHNIQUES.filter((t) => goal === "tutti" || t.goals.includes(goal));
  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> Study Academy</span>}
        title={<>Impara a studiare, <span className="italic text-gradient-azure">con le prove</span>.</>}
        description="Ogni tecnica ha una pagina con principi cognitivi, tutorial, esempio universitario, esercizio interattivo, limiti e fonti scientifiche verificabili. Il livello di evidenza indica quanto è solida la ricerca, non quanto la tecnica è «di moda»."
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Segmented
          value={goal}
          onChange={setGoal}
          options={GOALS.map((g) => ({ value: g, label: g === "tutti" ? "Tutte" : g.charAt(0).toUpperCase() + g.slice(1) }))}
        />
        <span className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
          <Info className="h-3.5 w-3.5" /> Evidenza:
          <Badge tone="success">alta</Badge>
          <Badge tone="azure">moderata</Badge>
          <Badge tone="warning">limitata</Badge>
          <Badge tone="muted">indiretta</Badge>
        </span>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => (
          <Card key={t.id} hover className="group flex flex-col overflow-hidden">
            <Link href={`/academy/${t.id}`} className="absolute inset-0 z-10 rounded-[inherit]" aria-label={`Apri ${t.name}`} />
            <div className="relative aspect-[16/9] border-b border-white/[0.06] bg-ink-900">
              <TechniqueArt icon={t.icon} className="h-full w-full" />
              <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-fg-subtle backdrop-blur transition group-hover:text-fg">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={EVIDENCE_TONE[t.evidence.level]}>Evidenza {t.evidence.level}</Badge>
                {t.modes.map((m) => (
                  <Badge key={m} tone={MODE_TONE[m]}>{MODE_INFO[m].name.split(" ")[0]}</Badge>
                ))}
              </div>
              <h2 className="mt-3 text-[17px] font-semibold text-fg">{t.name}</h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{t.tagline}</p>
              <div className="mt-auto pt-4 text-[12px] text-fg-subtle">Per: {t.goals.join(" · ")}</div>
            </div>
          </Card>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-fg"><FlaskConical className="h-4 w-4 text-fg-subtle" /> Tre convinzioni diffuse che la ricerca non conferma</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {MYTHS.map((m) => (
            <Card key={m.myth} className="p-5">
              <div className="flex gap-2 text-[14px] font-medium text-fg">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> «{m.myth}»
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{m.fact}</p>
              <a href={`https://doi.org/${m.source.doi}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[12px] text-azure-300 hover:underline">
                {m.source.label} · doi:{m.source.doi}
              </a>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
