"use client";

import Link from "next/link";
import { ExternalLink, XCircle } from "lucide-react";
import { type Technique } from "@/data/academy";
import { TechniqueArt } from "./technique-art";
import { ACADEMY_GROUPS, ACADEMY_ORDER, STARTER_IDS } from "./guide";
import { Badge, Button, PageHeader } from "@/components/ui/primitives";
import { TONE, type Tone } from "@/components/ui/tone";
import { useDueCards, useHydrated } from "@/lib/hooks";
import { useAtlas } from "@/lib/store";
import { cn, pluralize } from "@/lib/utils";

export const EVIDENCE_TONE: Record<"alta" | "moderata" | "limitata" | "indiretta", Tone> = {
  alta: "success",
  moderata: "azure",
  limitata: "warning",
  indiretta: "muted",
};

/** Evidence level as a coloured dot plus words (never colour alone). */
export function EvidenceLevel({ level, className }: { level: Technique["evidence"]["level"]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-fg-muted", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[EVIDENCE_TONE[level]].dot)} aria-hidden />
      Evidenza {level}
    </span>
  );
}

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

/** What the student has already done with a technique, read from their own data. */
function useTechniqueStatus(): Record<string, string> {
  const hydrated = useHydrated();
  const feynman = useAtlas((s) => s.feynman);
  const palaces = useAtlas((s) => s.palaces);
  const cornell = useAtlas((s) => s.cornell);
  const cards = useAtlas((s) => s.cards);
  const due = useDueCards();
  if (!hydrated) return {};
  const out: Record<string, string> = {};
  const lastFeynman = feynman.at(-1);
  if (lastFeynman) out.feynman = `Ultima spiegazione: ${lastFeynman.score}/100`;
  const loci = Math.max(0, ...palaces.map((p) => p.placements.length));
  if (loci > 0) out["palazzo-memoria"] = `Il tuo palazzo ha ${pluralize(loci, "luogo", "luoghi")}`;
  const notes = Object.values(cornell).filter((c) => c.cues.trim() || c.notes.trim() || c.summary.trim()).length;
  if (notes > 0) out.cornell = `Note Cornell su ${pluralize(notes, "argomento", "argomenti")}`;
  if (cards.length > 0) out["spaced-repetition"] = due.length ? `${pluralize(due.length, "flashcard", "flashcard")} da ripassare oggi` : "Nessuna flashcard in scadenza oggi";
  return out;
}

function TechniqueCard({ t, status }: { t: Technique; status?: string }) {
  const starter = STARTER_IDS.includes(t.id);
  return (
    <li className="min-w-0">
      <Link
        href={`/academy/${t.id}`}
        className="card card-hover group flex h-full flex-col rounded-card"
      >
        <div className="aspect-[16/9] overflow-hidden rounded-t-card border-b border-white/[0.06] bg-ink-900/70">
          <TechniqueArt icon={t.icon} className="h-full w-full" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          {starter && (
            <Badge tone="azure" className="mb-2.5 self-start">
              Consigliata per iniziare
            </Badge>
          )}
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-fg text-balance">{t.name}</h3>
          <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-fg-muted">{t.tagline}</p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4">
            <EvidenceLevel level={t.evidence.level} />
            {status && <span className="text-xs text-azure-300">{status}</span>}
          </div>
        </div>
      </Link>
    </li>
  );
}

export function AcademyIndex() {
  const status = useTechniqueStatus();
  const byId = new Map(ACADEMY_ORDER.map((t) => [t.id, t]));

  return (
    <div className="pb-16">
      <PageHeader
        title="Impara a studiare con metodo"
        description="Undici tecniche spiegate passo per passo, ognuna con un esercizio sulle lezioni di ATLAS. Per ciascuna trovi quanto è solida la ricerca che la sostiene."
        actions={
          <Button variant="primary" size="lg" href="/academy/active-recall">
            Inizia da Active Recall
          </Button>
        }
      />

      <div className="mt-8 flex flex-col gap-4 border-y border-white/[0.07] py-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Obiettivi">
          <ul className="flex flex-wrap gap-2">
            {ACADEMY_GROUPS.map((g) => (
              <li key={g.id}>
                <a
                  href={`#${g.id}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-control border border-white/[0.09] bg-white/[0.03] px-3.5 text-ui font-medium text-fg-muted transition-colors duration-150 hover:border-white/[0.16] hover:text-fg"
                >
                  {g.label}
                  <span className="text-xs tabular-nums text-fg-subtle">{g.ids.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span>Quanto è solida la ricerca:</span>
          {(["alta", "moderata", "limitata", "indiretta"] as const).map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", TONE[EVIDENCE_TONE[l]].dot)} aria-hidden />
              {l}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-10 space-y-14">
        {ACADEMY_GROUPS.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="scroll-mt-20 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10">
            <div className="mb-5 lg:mb-0 lg:pt-1">
              <h2 id={`${g.id}-title`} className="text-xl font-semibold tracking-[-0.01em] text-fg">
                {g.title}
              </h2>
              <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-fg-muted">{g.description}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {g.ids.map((id) => {
                const t = byId.get(id);
                return t ? <TechniqueCard key={id} t={t} status={status[id]} /> : null;
              })}
            </ul>
          </section>
        ))}
      </div>

      <section aria-labelledby="miti-title" className="mt-16 border-t border-white/[0.07] pt-10 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10">
        <div className="mb-5 lg:mb-0">
          <h2 id="miti-title" className="text-xl font-semibold tracking-[-0.01em] text-fg">
            Tre convinzioni che la ricerca non conferma
          </h2>
          <p className="mt-1.5 max-w-[48ch] text-sm leading-relaxed text-fg-muted">Abitudini diffuse tra gli studenti che fanno sentire preparati più di quanto si è.</p>
        </div>
        <ul className="divide-y divide-white/[0.07]">
          {MYTHS.map((m) => (
            <li key={m.myth} className="flex gap-3 py-5 first:pt-0 last:pb-0">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" aria-hidden />
              <div className="min-w-0">
                <p className="max-w-[65ch] text-base font-medium text-fg">«{m.myth}»</p>
                <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-fg-muted">{m.fact}</p>
                <a
                  href={`https://doi.org/${m.source.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm text-azure-300 hover:text-azure-200 hover:underline sm:min-h-8"
                >
                  {m.source.label}, leggi lo studio
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">(si apre in una nuova scheda)</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
