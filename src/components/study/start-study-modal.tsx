"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Search, BookOpenCheck, Microscope, FlaskConical, Atom } from "lucide-react";
import { Modal, Button, Badge, ProgressBar } from "@/components/ui/primitives";
import { ModeCard } from "./mode-card";
import { useUI } from "@/lib/ui-store";
import { SUBJECTS, getTopicRef } from "@/data/syllabus";
import { hasLesson } from "@/data/lessons";
import { useTopicStates } from "@/lib/hooks";
import { STATUS_LABEL } from "@/lib/progress";
import type { StudyMode, SubjectId } from "@/lib/types";
import { SUBJECT_TONE, TONE } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import { norm } from "@/lib/search";

export const SUBJECT_ICON = { biologia: Microscope, chimica: FlaskConical, fisica: Atom } as const;

type Step = 1 | 2 | 3;

export function StartStudyModal() {
  const router = useRouter();
  const open = useUI((s) => s.startStudyOpen);
  const preset = useUI((s) => s.startStudyPreset);
  const close = useUI((s) => s.closeStartStudy);
  const [step, setStep] = useState<Step>(1);
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [mode, setMode] = useState<StudyMode>("deep");
  const [q, setQ] = useState("");
  const states = useTopicStates();

  useEffect(() => {
    if (!open) return;
    const ref = preset?.topicId ? getTopicRef(preset.topicId) : undefined;
    setSubject(ref?.subject.id ?? preset?.subject ?? null);
    setTopicId(ref?.topic.id ?? null);
    setMode(preset?.mode ?? "deep");
    setQ("");
    setStep(ref ? 3 : preset?.subject ? 2 : 1);
  }, [open, preset]);

  const stateById = useMemo(() => new Map(states.map((s) => [s.ref.topic.id, s])), [states]);
  const subjectData = SUBJECTS.find((s) => s.id === subject);

  const filteredUnits = useMemo(() => {
    if (!subjectData) return [];
    const nq = norm(q);
    return subjectData.units
      .map((u) => ({
        unit: u,
        topics: u.chapters.flatMap((c) => c.topics).filter((t) => !nq || norm(`${t.title} ${t.syllabusText} ${(t.keywords ?? []).join(" ")}`).includes(nq)),
      }))
      .filter((u) => u.topics.length);
  }, [subjectData, q]);

  const start = () => {
    if (!topicId) return;
    close();
    router.push(`/studio/${topicId}?mode=${mode}`);
  };

  const topicRef = topicId ? getTopicRef(topicId) : undefined;

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title={
        <span className="flex items-center gap-3">
          Inizia a studiare
          <span className="flex items-center gap-1.5" aria-label={`Passo ${step} di 3`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={cn("h-1.5 rounded-full transition-all", n <= step ? "w-6 bg-azure-400" : "w-3 bg-white/15")} />
            ))}
          </span>
        </span>
      }
      description={step === 1 ? "Scegli la materia" : step === 2 ? "Scegli l’argomento del syllabus" : "Scegli come vuoi studiare"}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => (step === 1 ? close() : setStep((s) => (s - 1) as Step))}>
            <ArrowLeft className="h-4 w-4" /> {step === 1 ? "Annulla" : "Indietro"}
          </Button>
          <div className="hidden min-w-0 flex-1 truncate text-center text-[13px] text-fg-subtle md:block">
            {topicRef ? `${topicRef.subject.name} · ${topicRef.topic.title}` : subjectData?.name}
          </div>
          {step < 3 ? (
            <Button variant="primary" disabled={(step === 1 && !subject) || (step === 2 && !topicId)} onClick={() => setStep((s) => (s + 1) as Step)}>
              Avanti <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="primary" onClick={start} disabled={!topicId}>
              Inizia sessione <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      }
    >
      {step === 1 && (
        <div className="grid gap-3 md:grid-cols-3">
          {SUBJECTS.map((s) => {
            const tone = SUBJECT_TONE[s.id];
            const Icon = SUBJECT_ICON[s.id];
            const list = states.filter((x) => x.ref.subject.id === s.id);
            const mastery = list.reduce((a, b) => a + b.mastery, 0) / Math.max(1, list.length);
            const selected = subject === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setSubject(s.id);
                  setTopicId(null);
                  setStep(2);
                }}
                className={cn(
                  "group rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5",
                  selected ? `${TONE[tone].border} bg-white/[0.05]` : "border-white/[0.08] bg-white/[0.02] hover:border-white/15",
                )}
              >
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl", TONE[tone].bg, TONE[tone].text)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-base font-semibold text-fg">{s.name}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-fg-subtle">{s.tagline}</div>
                <div className="mt-4 flex items-center justify-between text-[12px] text-fg-subtle">
                  <span>{s.cfu} CFU · {list.length} argomenti</span>
                  <span className="font-mono text-fg-muted">{Math.round(mastery * 100)}%</span>
                </div>
                <ProgressBar value={mastery} tone={tone} className="mt-2" />
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && subjectData && (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Cerca in ${subjectData.name}…`}
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle focus:border-azure-400/60 focus:outline-none"
              aria-label="Cerca argomento"
            />
          </div>
          <div className="mt-4 max-h-[46vh] space-y-5 overflow-y-auto pr-1">
            {filteredUnits.map(({ unit, topics }) => (
              <section key={unit.id}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h4 className="text-[12px] font-medium uppercase tracking-[0.12em] text-fg-subtle">
                    Unità {unit.number} · {unit.title}
                  </h4>
                  <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{unit.cfu} CFU</span>
                </div>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {topics.map((t) => {
                    const st = stateById.get(t.id);
                    const selected = topicId === t.id;
                    return (
                      <li key={t.id}>
                        <button
                          onClick={() => setTopicId(t.id)}
                          onDoubleClick={() => {
                            setTopicId(t.id);
                            setStep(3);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                            selected ? "border-azure-400/50 bg-azure-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15",
                          )}
                        >
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", st?.status === "consolidato" ? "bg-emerald-400" : st?.status === "da-consolidare" ? "bg-amber-400" : st?.status === "in-corso" ? "bg-azure-400" : "bg-white/20")} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] leading-snug text-fg">{t.title}</span>
                            <span className="mt-0.5 block text-[11.5px] text-fg-subtle">{st ? STATUS_LABEL[st.status] : "Da iniziare"}</span>
                          </span>
                          {hasLesson(t.id) && (
                            <span title="Lezione completa disponibile" className="mt-0.5 text-azure-300">
                              <BookOpenCheck className="h-4 w-4" />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-fg-subtle">
            <BookOpenCheck className="mr-1 inline h-3.5 w-3.5 text-azure-300" /> lezione completa scritta da ATLAS. Gli altri argomenti offrono obiettivi ufficiali, risorse e verifica; la lezione è in preparazione.
          </p>
        </div>
      )}

      {step === 3 && (
        <div>
          {topicRef && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={SUBJECT_TONE[topicRef.subject.id]} dot>
                {topicRef.subject.name}
              </Badge>
              <span className="text-fg">{topicRef.topic.title}</span>
              {!hasLesson(topicRef.topic.id) && <Badge tone="warning">Lezione in preparazione</Badge>}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            {(["fast", "deep", "ultra"] as StudyMode[]).map((m) => (
              <ModeCard key={m} mode={m} selected={mode === m} onSelect={() => setMode(m)} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
