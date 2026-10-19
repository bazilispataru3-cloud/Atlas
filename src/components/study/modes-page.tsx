"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Compass, Info, Play, Scale, Sparkles } from "lucide-react";
import type { StudyMode } from "@/lib/types";
import { MODE_INFO, TECHNIQUES, type Goal } from "@/data/academy";
import { allTopicRefs, getTopicRef, SUBJECTS } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { ModeCard } from "./mode-card";
import { MODE_SEQUENCE, STEP_LABEL, ULTRA_RATIONALE, ULTRA_SEQUENCE, ultraKind, type UltraKind } from "./steps";
import { Badge, Button, Card, PageHeader, SectionTitle, Select } from "@/components/ui/primitives";
import { MODE_TONE, TONE } from "@/components/ui/tone";
import { useUI } from "@/lib/ui-store";
import { useAtlas } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { cn, fmt, DAY_MS } from "@/lib/utils";

const MODES: StudyMode[] = ["fast", "deep", "ultra"];

/** How well each mode serves a goal. Deliberately relative: no mode is "best" in general. */
const FIT: { goal: string; note: string; fit: Record<StudyMode, 0 | 1 | 2> }[] = [
  {
    goal: "Primo contatto con un argomento",
    note: "Serve un quadro d’insieme prima dei dettagli; Fast lo dà in poco tempo, Deep lo costruisce con più contesto.",
    fit: { fast: 2, deep: 2, ultra: 1 },
  },
  {
    goal: "Comprensione di meccanismi e cause",
    note: "Spiegazione strutturata, esempi ed elaborazione dei perché richiedono tempo: Deep e Ultra sono più adatte.",
    fit: { fast: 0, deep: 2, ultra: 2 },
  },
  {
    goal: "Memorizzazione di termini e sequenze",
    note: "Flashcard e recupero attivo funzionano in tutte; il palazzo della memoria (Ultra) aiuta con sequenze ordinate.",
    fit: { fast: 1, deep: 1, ultra: 2 },
  },
  {
    goal: "Problem solving (fisica, stechiometria, pH)",
    note: "Problemi guidati e auto-spiegazione di esempi svolti sono in Deep e Ultra; Fast ha solo un quiz breve.",
    fit: { fast: 0, deep: 2, ultra: 2 },
  },
  {
    goal: "Ripasso rapido prima di una prova",
    note: "Con poco tempo conviene il recupero attivo mirato: Fast oppure il ripasso flashcard.",
    fit: { fast: 2, deep: 1, ultra: 0 },
  },
  {
    goal: "Esposizione orale e spiegazione a parole tue",
    note: "Feynman e simulazione orale sono nel percorso Ultra.",
    fit: { fast: 0, deep: 1, ultra: 2 },
  },
];

const FIT_LABEL = ["Poco adatta", "Utile", "Indicata"] as const;

const KIND_EXAMPLE: Record<UltraKind, { label: string; topicId: string }> = {
  meccanistico: { label: "Biologia: meccanismi e sequenze", topicId: "bio-replicazione-dna" },
  misto: { label: "Chimica: concetti e calcoli", topicId: "chim-tamponi" },
  quantitativo: { label: "Fisica: leggi e problemi", topicId: "fis-idrodinamica" },
};

function FitDots({ n, mode }: { n: 0 | 1 | 2; mode: StudyMode }) {
  return (
    <span className="inline-flex items-center gap-2" title={FIT_LABEL[n]}>
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-2 w-2 rounded-full", i <= n ? TONE[MODE_TONE[mode]].dot : "bg-white/10")} />
        ))}
      </span>
      <span className="text-[12px] text-fg-muted">{FIT_LABEL[n]}</span>
    </span>
  );
}

function Path({ steps, tone }: { steps: string[]; tone: StudyMode }) {
  return (
    <ol className="relative space-y-2.5 pl-6">
      <span className="absolute bottom-2 left-[9px] top-2 w-px bg-white/10" aria-hidden />
      {steps.map((s, i) => (
        <li key={s} className="relative flex items-center gap-3 text-[13.5px] text-fg-muted">
          <span className={cn("absolute -left-6 grid h-[19px] w-[19px] place-items-center rounded-full border bg-ink-900 font-mono text-[10px]", TONE[MODE_TONE[tone]].border, TONE[MODE_TONE[tone]].text)}>
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

export function ModesPage() {
  const openStartStudy = useUI((s) => s.openStartStudy);
  const sessions = useAtlas((s) => s.sessions);
  const hydrated = useHydrated();
  const [mode, setMode] = useState<StudyMode>("deep");
  const [ultraTopic, setUltraTopic] = useState("bio-mitocondri");
  const ultraRef = getTopicRef(ultraTopic);
  const kind = ultraRef ? ultraKind(ultraRef) : "meccanistico";

  const usage = useMemo(() => {
    const since = Date.now() - 30 * DAY_MS;
    const out: Record<StudyMode, { minutes: number; count: number }> = { fast: { minutes: 0, count: 0 }, deep: { minutes: 0, count: 0 }, ultra: { minutes: 0, count: 0 } };
    if (!hydrated) return out;
    for (const s of sessions) {
      if ((s.mode === "fast" || s.mode === "deep" || s.mode === "ultra") && new Date(s.start).getTime() >= since) {
        out[s.mode].minutes += s.minutes;
        out[s.mode].count += 1;
      }
    }
    return out;
  }, [sessions, hydrated]);

  const goalsForMode = (m: StudyMode) => {
    const counts = new Map<Goal, number>();
    for (const t of TECHNIQUES) if (t.modes.includes(m)) for (const g of t.goals) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  };

  const sequence = mode === "ultra" ? ULTRA_SEQUENCE[kind] : MODE_SEQUENCE[mode];
  const info = MODE_INFO[mode];
  const techniques = TECHNIQUES.filter((t) => t.modes.includes(mode));

  return (
    <div className="pb-16">
      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><Compass className="h-3.5 w-3.5" /> Study Modes</span>}
        title={<>Tre modi di studiare. <span className="italic text-fg-muted">Scegli in base all’obiettivo.</span></>}
        description="Fast, Deep e Ultra non sono livelli di difficoltà: sono percorsi diversi per obiettivi diversi. Nessuna modalità è sempre superiore alle altre — dipende da quanto tempo hai, da cosa devi saper fare e da quanto conosci già l’argomento."
        actions={
          <Button variant="primary" size="lg" onClick={() => openStartStudy({ mode })}>
            <Play className="h-4 w-4 fill-current" /> Inizia in {info.name}
          </Button>
        }
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {MODES.map((m) => (
          <ModeCard key={m} mode={m} selected={m === mode} onSelect={() => setMode(m)} />
        ))}
      </div>

      {/* Selected mode detail */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          <SectionTitle
            title={<>Il percorso {info.name}</>}
            icon={<Sparkles className="h-4 w-4" />}
            action={<Badge tone={MODE_TONE[mode]}>{info.time}</Badge>}
          />
          {mode === "ultra" && (
            <div className="mb-4 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/[0.05] p-3.5 text-[13px] leading-relaxed text-fg-muted">
              Il percorso Ultra cambia con l’argomento. Ora è mostrato per <strong className="text-fg">{ultraRef?.topic.title}</strong> ({kind}).
              <div className="mt-2.5">
                <Select value={ultraTopic} onChange={(e) => setUltraTopic(e.target.value)} aria-label="Argomento per il percorso Ultra" className="h-9 text-[13px]">
                  {SUBJECTS.map((s) => (
                    <optgroup key={s.id} label={s.name}>
                      {allTopicRefs()
                        .filter((r) => r.subject.id === s.id)
                        .map((r) => (
                          <option key={r.topic.id} value={r.topic.id}>
                            {r.topic.title}
                            {hasLesson(r.topic.id) ? " ★" : ""}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <Path steps={sequence.map((k) => STEP_LABEL[k])} tone={mode} />
          {mode === "ultra" && <p className="mt-4 text-[13px] leading-relaxed text-fg-subtle">{ULTRA_RATIONALE[kind]}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => openStartStudy(mode === "ultra" ? { mode, topicId: ultraTopic, subject: ultraRef?.subject.id } : { mode })}>
              <Play className="h-4 w-4 fill-current" /> Scegli argomento e inizia
            </Button>
            {mode === "ultra" && ultraRef && (
              <Button variant="secondary" className="h-auto min-h-10 whitespace-normal py-2 text-left" href={`/studio/${ultraTopic}?mode=ultra`}>
                Apri il percorso su «{ultraRef.topic.title}» <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">
            ★ = argomento con lezione completa ATLAS. Per gli altri argomenti la sessione usa obiettivi ufficiali, risorse verificate, spiegazione dell’AI Professor (se configurato), recall e quiz.
          </p>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <SectionTitle title="Tecniche usate in questa modalità" icon={<Brain className="h-4 w-4" />} />
            <div className="grid gap-2 sm:grid-cols-2">
              {techniques.map((t) => (
                <Link key={t.id} href={`/academy/${t.id}`} className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-medium text-fg">{t.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-fg-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
                  </div>
                  <div className="mt-1 text-[12px] text-fg-subtle">Evidenza: {t.evidence.level}</div>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-fg-subtle">Obiettivi principali: {goalsForMode(mode).join(", ")}.</p>
          </Card>
          <Card className="p-6">
            <SectionTitle title="Le tue sessioni (ultimi 30 giorni)" />
            <div className="grid grid-cols-3 gap-3">
              {MODES.map((m) => (
                <div key={m} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", TONE[MODE_TONE[m]].text)}>{MODE_INFO[m].name.split(" ")[0]}</div>
                  <div className="mt-1 whitespace-nowrap font-mono text-lg text-fg">{fmt.minutes(usage[m].minutes)}</div>
                  <div className="text-[12px] text-fg-subtle">{usage[m].count} {usage[m].count === 1 ? "sessione" : "sessioni"}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-fg-subtle">Conta solo il tempo con la scheda visibile e il timer non in pausa.</p>
          </Card>
        </div>
      </div>

      {/* Goal matrix */}
      <section className="mt-12">
        <SectionTitle title="Quale modalità per quale obiettivo" icon={<Scale className="h-4 w-4" />} />
        <div className="space-y-3 md:hidden">
          {FIT.map((row) => (
            <Card key={row.goal} className="p-4">
              <div className="text-[14px] font-medium text-fg">{row.goal}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-fg-subtle">{row.note}</div>
              <div className="mt-3 space-y-1.5">
                {MODES.map((m) => (
                  <div key={m} className="flex items-center justify-between gap-3">
                    <span className={cn("text-[12.5px] font-medium", TONE[MODE_TONE[m]].text)}>{MODE_INFO[m].name}</span>
                    <FitDots n={row.fit[m]} mode={m} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <Card className="hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11.5px] uppercase tracking-[0.14em] text-fg-subtle">
                  <th className="px-5 py-3 font-medium">Obiettivo</th>
                  {MODES.map((m) => (
                    <th key={m} className={cn("px-4 py-3 font-medium", TONE[MODE_TONE[m]].text)}>{MODE_INFO[m].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIT.map((row) => (
                  <tr key={row.goal} className="border-b border-white/[0.04] align-top last:border-0">
                    <td className="px-5 py-4">
                      <div className="text-[14px] font-medium text-fg">{row.goal}</div>
                      <div className="mt-1 max-w-md text-[12.5px] leading-relaxed text-fg-subtle">{row.note}</div>
                    </td>
                    {MODES.map((m) => (
                      <td key={m} className="px-4 py-4">
                        <FitDots n={row.fit[m]} mode={m} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="mt-3 flex gap-2 text-[12.5px] leading-relaxed text-fg-subtle">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Indicazioni pratiche, non una classifica. Le tecniche con l’evidenza più solida in letteratura (recupero attivo e ripetizione dilazionata; Dunlosky et al., 2013) sono presenti in tutte e tre le modalità e nel ripasso flashcard.
        </p>
      </section>

      {/* Ultra kinds */}
      <section className="mt-12">
        <SectionTitle title="Come Ultra costruisce il percorso" icon={<Brain className="h-4 w-4" />} />
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(ULTRA_SEQUENCE) as UltraKind[]).map((k) => (
            <Card key={k} className="flex flex-col p-5">
              <Badge tone="ultra" className="self-start capitalize">{k}</Badge>
              <div className="mt-3 text-[15px] font-semibold text-fg">{KIND_EXAMPLE[k].label}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{ULTRA_RATIONALE[k]}</p>
              <div className="mt-4">
                <Path steps={ULTRA_SEQUENCE[k].map((s) => STEP_LABEL[s])} tone="ultra" />
              </div>
              <div className="mt-auto pt-5">
                <Button variant="secondary" size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 text-left" href={`/studio/${KIND_EXAMPLE[k].topicId}?mode=ultra`}>
                  Prova con «{getTopicRef(KIND_EXAMPLE[k].topicId)?.topic.title}» <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
