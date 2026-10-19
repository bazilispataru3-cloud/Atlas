"use client";

import { useMemo, useState } from "react";
import { Footprints, Hammer, Wand2, Check, X, Trash2, Plus, Castle } from "lucide-react";
import { Badge, Button, Card, Input, Notice, Select, Segmented, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas, type Palace } from "@/lib/store";
import { getLesson, LESSONS } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import { tokens } from "@/lib/search";
import { cn, uid } from "@/lib/utils";

interface Locus {
  id: string;
  room: string;
  name: string;
  x: number;
  y: number;
}

const ROOMS = [
  { id: "ingresso", name: "Ingresso", x: 20, y: 250, w: 170, h: 150, color: "#3987e5" },
  { id: "cucina", name: "Cucina", x: 20, y: 20, w: 250, h: 210, color: "#199e70" },
  { id: "soggiorno", name: "Soggiorno", x: 210, y: 250, w: 300, h: 150, color: "#d95926" },
  { id: "studio", name: "Studio", x: 290, y: 20, w: 220, h: 210, color: "#9085e9" },
  { id: "camera", name: "Camera", x: 530, y: 20, w: 210, h: 230, color: "#e879f9" },
  { id: "balcone", name: "Balcone", x: 530, y: 270, w: 210, h: 130, color: "#efc55c" },
];

/** The fixed route: always walked in this order. */
export const LOCI: Locus[] = [
  { id: "l1", room: "ingresso", name: "Porta d’ingresso", x: 60, y: 375 },
  { id: "l2", room: "ingresso", name: "Attaccapanni", x: 150, y: 290 },
  { id: "l3", room: "cucina", name: "Frigorifero", x: 60, y: 70 },
  { id: "l4", room: "cucina", name: "Fornelli", x: 160, y: 60 },
  { id: "l5", room: "cucina", name: "Tavolo", x: 200, y: 170 },
  { id: "l6", room: "studio", name: "Scrivania", x: 340, y: 160 },
  { id: "l7", room: "studio", name: "Libreria", x: 460, y: 60 },
  { id: "l8", room: "soggiorno", name: "Divano", x: 290, y: 360 },
  { id: "l9", room: "soggiorno", name: "Camino", x: 450, y: 300 },
  { id: "l10", room: "camera", name: "Letto", x: 600, y: 120 },
  { id: "l11", room: "camera", name: "Armadio", x: 700, y: 210 },
  { id: "l12", room: "balcone", name: "Vaso di piante", x: 640, y: 345 },
];

function FloorPlan({ placements, active, onPick, walking }: { placements: Palace["placements"]; active: string | null; onPick: (id: string) => void; walking?: boolean }) {
  const filled = new Set(placements.map((p) => p.locusId));
  return (
    <svg viewBox="0 0 760 420" className="w-full" role="img" aria-label="Pianta del palazzo della memoria con 12 luoghi lungo un percorso">
      {ROOMS.map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="16" fill={r.color} fillOpacity="0.07" stroke={r.color} strokeOpacity="0.35" />
          <text x={r.x + 14} y={r.y + 24} fontSize="12" fill={r.color} fillOpacity="0.9" fontWeight="600" letterSpacing="0.06em">
            {r.name.toUpperCase()}
          </text>
        </g>
      ))}
      <path d={LOCI.map((l, i) => `${i ? "L" : "M"}${l.x},${l.y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="5 6" />
      {LOCI.map((l, i) => {
        const isActive = active === l.id;
        const has = filled.has(l.id);
        return (
          <g key={l.id} onClick={() => !walking && onPick(l.id)} className={walking ? "" : "cursor-pointer"} role={walking ? undefined : "button"} aria-label={`${i + 1}. ${l.name}${has ? ", occupato" : ""}`}>
            {isActive && <circle cx={l.x} cy={l.y} r="26" fill="#56a6ff" fillOpacity="0.15" className="animate-pulse" />}
            <circle cx={l.x} cy={l.y} r="17" fill={has ? "#1554b0" : "#111116"} stroke={isActive ? "#c4e0ff" : has ? "#56a6ff" : "rgba(255,255,255,0.3)"} strokeWidth={isActive ? 2.5 : 1.5} />
            <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize="11.5" fill="#f5f5f7" fontFamily="var(--font-mono)">
              {i + 1}
            </text>
            <text x={l.x} y={l.y + 32} textAnchor="middle" fontSize="10.5" fill="rgba(245,245,247,0.6)">
              {l.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function similar(a: string, b: string): boolean {
  const ta = new Set(tokens(a));
  const tb = tokens(b);
  if (!tb.length || !ta.size) return false;
  const hit = tb.filter((t) => ta.has(t) || [...ta].some((x) => x.length > 4 && (x.startsWith(t.slice(0, 5)) || t.startsWith(x.slice(0, 5))))).length;
  return hit / tb.length >= 0.5;
}

export function MemoryPalace({ topicId: initialTopic }: { topicId?: string }) {
  const palaces = useAtlas((s) => s.palaces);
  const savePalace = useAtlas((s) => s.savePalace);
  const deletePalace = useAtlas((s) => s.deletePalace);
  const recordWalk = useAtlas((s) => s.recordPalaceWalk);

  const existing = initialTopic ? palaces.find((p) => p.topicId === initialTopic) : palaces[0];
  const [palaceId, setPalaceId] = useState<string | null>(existing?.id ?? null);
  const palace = palaces.find((p) => p.id === palaceId) ?? null;
  const [draft, setDraft] = useState<Palace>(() => existing ?? { id: uid("pal"), name: initialTopic ? `Palazzo · ${getTopicRef(initialTopic)?.topic.title ?? ""}` : "Il mio palazzo", topicId: initialTopic, createdAt: new Date().toISOString(), placements: [], walks: [] });
  const current = palace ?? draft;
  const [mode, setMode] = useState<"build" | "walk">("build");
  const [active, setActive] = useState<string | null>(LOCI[0].id);
  const [concept, setConcept] = useState("");
  const [image, setImage] = useState("");

  // Walk state
  const ordered = useMemo(() => LOCI.filter((l) => current.placements.some((p) => p.locusId === l.id)), [current.placements]);
  const [step, setStep] = useState(0);
  const [guess, setGuess] = useState("");
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const [revealed, setRevealed] = useState(false);

  const persist = (p: Palace) => {
    savePalace(p);
    setPalaceId(p.id);
    setDraft(p);
  };

  const pick = (id: string) => {
    setActive(id);
    const pl = current.placements.find((p) => p.locusId === id);
    setConcept(pl?.concept ?? "");
    setImage(pl?.image ?? "");
  };

  const place = () => {
    if (!active || !concept.trim()) return;
    const placements = [...current.placements.filter((p) => p.locusId !== active), { locusId: active, concept: concept.trim(), image: image.trim() }];
    persist({ ...current, placements });
    const idx = LOCI.findIndex((l) => l.id === active);
    const next = LOCI.slice(idx + 1).find((l) => !placements.some((p) => p.locusId === l.id));
    if (next) pick(next.id);
    toast("Concetto collocato nel palazzo");
  };

  const fillSuggestions = (tid: string) => {
    const lesson = getLesson(tid);
    if (!lesson) return;
    const placements = lesson.palaceSuggestions.slice(0, LOCI.length).map((s, i) => ({ locusId: LOCI[i].id, concept: s.concept, image: s.image }));
    persist({ ...current, topicId: tid, name: `Palazzo · ${getTopicRef(tid)?.topic.title ?? ""}`, placements });
    pick(LOCI[0].id);
  };

  const startWalk = () => {
    setMode("walk");
    setStep(0);
    setGuess("");
    setResults(ordered.map(() => null));
    setRevealed(false);
  };

  const answer = (ok: boolean) => {
    const next = results.map((r, i) => (i === step ? ok : r));
    setResults(next);
    setRevealed(false);
    setGuess("");
    if (step < ordered.length - 1) setStep(step + 1);
    else {
      const recalled = next.filter(Boolean).length;
      recordWalk(current.id, recalled, ordered.length);
      setStep(ordered.length);
    }
  };

  const walkLocus = ordered[step];
  const walkPlacement = walkLocus ? current.placements.find((p) => p.locusId === walkLocus.id) : undefined;
  const walkDone = mode === "walk" && step >= ordered.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={mode} onChange={(m) => (m === "walk" ? startWalk() : setMode("build"))} options={[{ value: "build", label: <span className="flex items-center gap-1.5"><Hammer className="h-3.5 w-3.5" /> Costruisci</span> }, { value: "walk", label: <span className="flex items-center gap-1.5"><Footprints className="h-3.5 w-3.5" /> Percorri</span> }]} />
        {palaces.length > 0 && (
          <Select value={palaceId ?? ""} onChange={(e) => { const p = palaces.find((x) => x.id === e.target.value); if (p) { setPalaceId(p.id); setDraft(p); setMode("build"); } }} className="max-w-xs" aria-label="Palazzo salvato">
            {!palace && <option value="">Nuovo palazzo</option>}
            {palaces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}
        <Button size="sm" variant="ghost" onClick={() => { const p: Palace = { id: uid("pal"), name: "Nuovo palazzo", createdAt: new Date().toISOString(), placements: [], walks: [] }; setPalaceId(null); setDraft(p); setMode("build"); pick(LOCI[0].id); }}>
          <Plus className="h-4 w-4" /> Nuovo
        </Button>
        {palace && (
          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Eliminare questo palazzo?")) { deletePalace(palace.id); setPalaceId(null); setDraft({ id: uid("pal"), name: "Il mio palazzo", createdAt: new Date().toISOString(), placements: [], walks: [] }); } }}>
            <Trash2 className="h-4 w-4" /> Elimina
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-3 sm:p-4">
          <FloorPlan placements={current.placements} active={mode === "walk" ? walkLocus?.id ?? null : active} onPick={pick} walking={mode === "walk"} />
        </Card>

        {mode === "build" ? (
          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-[15px] font-medium text-fg"><Castle className="h-4 w-4 text-fuchsia-300" /> {current.name}</div>
            <Input value={current.name} onChange={(e) => (palace ? persist({ ...current, name: e.target.value }) : setDraft({ ...current, name: e.target.value }))} aria-label="Nome del palazzo" />
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-fg-subtle">
              Suggerimenti da una lezione:
              <Select className="h-8 max-w-[15rem] text-[12.5px]" defaultValue="" onChange={(e) => e.target.value && fillSuggestions(e.target.value)} aria-label="Riempi con suggerimenti">
                <option value="">Scegli argomento…</option>
                {LESSONS.map((l) => <option key={l.topicId} value={l.topicId}>{getTopicRef(l.topicId)?.topic.title}</option>)}
              </Select>
            </div>
            {active && (
              <div className="space-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="text-[12px] text-fg-subtle">
                  Luogo {LOCI.findIndex((l) => l.id === active) + 1}: <span className="text-fg">{LOCI.find((l) => l.id === active)?.name}</span>
                </div>
                <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concetto da ricordare (es. 3 NADH per giro)" aria-label="Concetto" />
                <Textarea rows={3} value={image} onChange={(e) => setImage(e.target.value)} placeholder="Immagine vivida e bizzarra che interagisce con il luogo…" aria-label="Immagine mentale" />
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" disabled={!concept.trim()} onClick={place}>
                    <Wand2 className="h-4 w-4" /> Colloca
                  </Button>
                </div>
              </div>
            )}
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {LOCI.map((l, i) => {
                const p = current.placements.find((x) => x.locusId === l.id);
                return p ? (
                  <li key={l.id} className="text-[12.5px]">
                    <button onClick={() => pick(l.id)} className="w-full rounded-lg px-2 py-1 text-left hover:bg-white/[0.04]">
                      <span className="font-mono text-fg-subtle">{i + 1}.</span> <span className="text-fg-muted">{l.name}:</span> <span className="text-fg">{p.concept}</span>
                    </button>
                  </li>
                ) : null;
              })}
            </ul>
            <Button variant="secondary" className="w-full" disabled={current.placements.length < 3} onClick={startWalk}>
              <Footprints className="h-4 w-4" /> Percorri il palazzo ({current.placements.length} luoghi)
            </Button>
            {current.walks.length > 0 && <p className="text-[12px] text-fg-subtle">Ultimi percorsi: {current.walks.slice(-4).map((w) => `${w.recalled}/${w.total}`).join(" · ")}</p>}
          </Card>
        ) : (
          <Card className="space-y-4 p-5">
            {ordered.length < 3 ? (
              <Notice tone="info">Colloca almeno 3 concetti prima di percorrere il palazzo.</Notice>
            ) : walkDone ? (
              <div className="space-y-3">
                <div className="font-display text-3xl text-fg">{results.filter(Boolean).length}/{ordered.length} ricordati</div>
                <p className="text-[13.5px] text-fg-muted">Ripercorri il palazzo domani e tra qualche giorno: il ricordo dei luoghi si consolida con la ripetizione dilazionata.</p>
                <ul className="space-y-1 text-[13px]">
                  {ordered.map((l, i) => (
                    <li key={l.id} className="flex items-center gap-2">
                      {results[i] ? <Check className="h-4 w-4 text-emerald-300" /> : <X className="h-4 w-4 text-red-300" />}
                      <span className="text-fg-muted">{l.name}:</span> <span className="text-fg">{current.placements.find((p) => p.locusId === l.id)?.concept}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" onClick={startWalk}>Ripeti il percorso</Button>
              </div>
            ) : (
              <>
                <Badge tone="ultra">Luogo {step + 1} di {ordered.length}</Badge>
                <div className="text-[18px] text-fg">Sei davanti a: <span className="font-display text-2xl">{walkLocus?.name}</span></div>
                <p className="text-[13px] text-fg-subtle">Visualizza la scena. Quale concetto avevi collocato qui?</p>
                <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Scrivi il concetto…" disabled={revealed} aria-label="Concetto ricordato" />
                {!revealed ? (
                  <div className="flex gap-2">
                    <Button variant="primary" disabled={!guess.trim()} onClick={() => setRevealed(true)}>Verifica</Button>
                    <Button variant="ghost" onClick={() => setRevealed(true)}>Non ricordo</Button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <div className={cn("rounded-xl border p-3", similar(guess, walkPlacement?.concept ?? "") ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-white/10 bg-white/[0.03]")}>
                      <div className="text-[13px] text-fg">{walkPlacement?.concept}</div>
                      {walkPlacement?.image && <div className="mt-1 text-[12.5px] italic text-fg-subtle">{walkPlacement.image}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => answer(true)}><Check className="h-4 w-4" /> L’ho ricordato</Button>
                      <Button variant="secondary" size="sm" onClick={() => answer(false)}><X className="h-4 w-4" /> Non ricordato</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
