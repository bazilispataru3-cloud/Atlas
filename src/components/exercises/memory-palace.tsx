"use client";

import { useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Check, Footprints, Hammer, Lightbulb, Plus, RotateCcw, Trash2, Wand2, X } from "lucide-react";
import { Button, Input, Label, Modal, Notice, ProgressBar, Segmented, Select, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAtlas, type Palace } from "@/lib/store";
import { getLesson, LESSONS } from "@/data/lessons";
import { getTopicRef } from "@/data/syllabus";
import { tokens } from "@/lib/search";
import { cn, pluralize, uid } from "@/lib/utils";

interface Locus {
  id: string;
  room: string;
  name: string;
  x: number;
  y: number;
  /** Where the name sits around the marker on the floor plan. */
  label: "above" | "below" | "left" | "right";
}

// Floor plan 760 × 420: two rows of rooms. The route snakes through doors,
// so consecutive places are always in the same or in an adjacent room.
const W = 760;
const H = 420;

const ROOMS = [
  { id: "cucina", name: "Cucina", x: 20, y: 20, w: 240, h: 180 },
  { id: "studio", name: "Studio", x: 260, y: 20, w: 250, h: 180 },
  { id: "balcone", name: "Balcone", x: 510, y: 20, w: 230, h: 180 },
  { id: "ingresso", name: "Ingresso", x: 20, y: 200, w: 240, h: 200 },
  { id: "soggiorno", name: "Soggiorno", x: 260, y: 200, w: 250, h: 200 },
  { id: "camera", name: "Camera", x: 510, y: 200, w: 230, h: 200 },
];

/** Door openings: [x, y, orientation of the wall]. */
const DOORS: [number, number, "h" | "v"][] = [
  [90, 400, "h"],
  [170, 200, "h"],
  [260, 70, "v"],
  [440, 200, "h"],
  [510, 350, "v"],
  [690, 200, "h"],
];

/** The fixed route: always walked in this order (ids and names are stored in saved palaces). */
export const LOCI: Locus[] = [
  { id: "l1", room: "ingresso", name: "Porta d’ingresso", x: 90, y: 360, label: "above" },
  { id: "l2", room: "ingresso", name: "Attaccapanni", x: 170, y: 280, label: "left" },
  { id: "l3", room: "cucina", name: "Frigorifero", x: 170, y: 140, label: "above" },
  { id: "l4", room: "cucina", name: "Fornelli", x: 100, y: 140, label: "below" },
  { id: "l5", room: "cucina", name: "Tavolo", x: 100, y: 70, label: "left" },
  { id: "l6", room: "studio", name: "Scrivania", x: 330, y: 70, label: "below" },
  { id: "l7", room: "studio", name: "Libreria", x: 440, y: 70, label: "above" },
  { id: "l8", room: "soggiorno", name: "Divano", x: 360, y: 290, label: "right" },
  { id: "l9", room: "soggiorno", name: "Camino", x: 440, y: 350, label: "above" },
  { id: "l10", room: "camera", name: "Letto", x: 600, y: 350, label: "below" },
  { id: "l11", room: "camera", name: "Armadio", x: 690, y: 280, label: "left" },
  { id: "l12", room: "balcone", name: "Vaso di piante", x: 690, y: 110, label: "left" },
];

/** Route corners between the places (orthogonal, through the doors). */
const ROUTE: { x: number; y: number; locus?: string }[] = [
  { x: 90, y: 412 },
  { x: 90, y: 360, locus: "l1" },
  { x: 170, y: 360 },
  { x: 170, y: 280, locus: "l2" },
  { x: 170, y: 140, locus: "l3" },
  { x: 100, y: 140, locus: "l4" },
  { x: 100, y: 70, locus: "l5" },
  { x: 330, y: 70, locus: "l6" },
  { x: 440, y: 70, locus: "l7" },
  { x: 440, y: 240 },
  { x: 360, y: 240 },
  { x: 360, y: 290, locus: "l8" },
  { x: 360, y: 350 },
  { x: 440, y: 350, locus: "l9" },
  { x: 600, y: 350, locus: "l10" },
  { x: 690, y: 350 },
  { x: 690, y: 280, locus: "l11" },
  { x: 690, y: 110, locus: "l12" },
];

const ROUTE_D = ROUTE.slice(1)
  .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
  .join(" ");

/** Path along the route from one place (or the entrance) to another. */
function routeBetween(fromLocus: string | null, toLocus: string) {
  const start = fromLocus ? ROUTE.findIndex((p) => p.locus === fromLocus) : 0;
  const end = ROUTE.findIndex((p) => p.locus === toLocus);
  if (end < 0) return null;
  const pts = ROUTE.slice(Math.max(0, start), end + 1);
  if (pts.length < 2) return null;
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
}

const roomName = (id: string) => ROOMS.find((r) => r.id === id)?.name ?? "";

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const LABEL_POS: Record<Locus["label"], string> = {
  above: "-translate-x-1/2 -translate-y-[calc(100%+22px)]",
  below: "-translate-x-1/2 translate-y-[22px]",
  left: "-translate-x-[calc(100%+22px)] -translate-y-1/2",
  right: "translate-x-[22px] -translate-y-1/2",
};

function FloorPlan({
  placements,
  active,
  onPick,
  walking,
  walkFrom,
}: {
  placements: Palace["placements"];
  active: string | null;
  onPick: (id: string) => void;
  walking?: boolean;
  /** In walk mode: the previous place, so the marker walks from there. */
  walkFrom?: string | null;
}) {
  const filled = new Set(placements.map((p) => p.locusId));
  const walkPath = walking && active ? routeBetween(walkFrom ?? null, active) : null;
  const pct = (x: number, y: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  return (
    <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {ROOMS.map((r) => (
          <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(196,210,255,0.03)" stroke="rgba(196,210,255,0.22)" strokeWidth="2" />
        ))}
        {DOORS.map(([x, y, o], i) =>
          o === "h" ? <line key={i} x1={x - 24} y1={y} x2={x + 24} y2={y} stroke="#0b0d12" strokeWidth="4" /> : <line key={i} x1={x} y1={y - 24} x2={x} y2={y + 24} stroke="#0b0d12" strokeWidth="4" />,
        )}
        <path d={ROUTE_D} fill="none" stroke="rgba(141,185,255,0.45)" strokeWidth="2" strokeDasharray="6 7" strokeLinejoin="round" />
        {walkPath && (
          <circle
            key={`${walkFrom}-${active}`}
            r="9"
            fill="#3d8bff"
            stroke="#cfe2ff"
            strokeWidth="2"
            style={{ offsetPath: `path("${walkPath}")`, offsetRotate: "0deg", animation: "atlas-walk 700ms cubic-bezier(0.22,1,0.36,1) both" } as CSSProperties}
          />
        )}
      </svg>
      {ROOMS.map((r) => (
        <span key={r.id} className="pointer-events-none absolute text-xs font-medium text-fg-subtle" style={{ left: `${((r.x + 12) / W) * 100}%`, top: `${((r.y + 10) / H) * 100}%` }}>
          {r.name}
        </span>
      ))}
      {LOCI.map((l, i) => {
        const isActive = active === l.id;
        const has = filled.has(l.id);
        const dot = (
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold tabular-nums transition-colors duration-150",
              isActive ? "border-azure-200 bg-azure-500 text-white" : has ? "border-azure-400/70 bg-azure-500/30 text-fg" : "border-white/30 bg-ink-900 text-fg-muted",
            )}
          >
            {i + 1}
          </span>
        );
        return (
          <div key={l.id} className="absolute" style={pct(l.x, l.y)}>
            {walking ? (
              <span className={cn("absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center", isActive && "opacity-0")}>{dot}</span>
            ) : (
              <button
                type="button"
                onClick={() => onPick(l.id)}
                aria-pressed={isActive}
                aria-label={`Luogo ${i + 1}: ${l.name}, ${has ? "occupato" : "libero"}`}
                className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
              >
                {dot}
              </button>
            )}
            <span aria-hidden className={cn("pointer-events-none absolute whitespace-nowrap rounded-md bg-ink-900/85 px-1.5 py-0.5 text-xs leading-4", isActive ? "text-fg" : "text-fg-muted", LABEL_POS[l.label])}>
              {l.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Phones: the same route as a vertical path, room by room. */
function RouteList({ placements, active, onPick, editor }: { placements: Palace["placements"]; active: string | null; onPick: (id: string) => void; editor: ReactNode }) {
  const rooms = ROOMS.filter((r) => LOCI.some((l) => l.room === r.id)).sort((a, b) => LOCI.findIndex((l) => l.room === a.id) - LOCI.findIndex((l) => l.room === b.id));
  return (
    <ol className="relative space-y-4 border-l border-dashed border-azure-300/35 pl-5" aria-label="Percorso del palazzo">
      {rooms.map((r) => (
        <li key={r.id}>
          <span className="text-xs font-medium text-fg-subtle">{r.name}</span>
          <ol className="mt-1.5 space-y-1.5">
            {LOCI.filter((l) => l.room === r.id).map((l) => {
              const n = LOCI.indexOf(l) + 1;
              const p = placements.find((x) => x.locusId === l.id);
              const isActive = active === l.id;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onPick(l.id)}
                    aria-expanded={isActive}
                    className={cn(
                      "relative flex min-h-12 w-full items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors duration-150",
                      isActive ? "border-azure-400/50 bg-azure-500/[0.08]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]",
                    )}
                  >
                    <span aria-hidden className={cn("absolute -left-[27px] h-3 w-3 rounded-full border-2 border-ink-950", p ? "bg-azure-400" : "bg-ink-600")} />
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums", p ? "border-azure-400/70 bg-azure-500/30 text-fg" : "border-white/25 text-fg-muted")}>{n}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg">{l.name}</span>
                      <span className={cn("block truncate text-xs", p ? "text-fg-muted" : "text-fg-subtle")}>{p ? p.concept : "Libero"}</span>
                    </span>
                  </button>
                  {isActive && <div className="mt-2">{editor}</div>}
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function similar(a: string, b: string): boolean {
  const ta = new Set(tokens(a));
  const tb = tokens(b);
  if (!tb.length || !ta.size) return false;
  const hit = tb.filter((t) => ta.has(t) || [...ta].some((x) => x.length > 4 && (x.startsWith(t.slice(0, 5)) || t.startsWith(x.slice(0, 5))))).length;
  return hit / tb.length >= 0.5;
}

const newPalace = (name: string, topicId?: string): Palace => ({ id: uid("pal"), name, topicId, createdAt: new Date().toISOString(), placements: [], walks: [] });
const palaceName = (tid?: string) => (tid ? `Palazzo: ${getTopicRef(tid)?.topic.title ?? ""}` : "Il mio palazzo");

export function MemoryPalace({ topicId: initialTopic }: { topicId?: string }) {
  const palaces = useAtlas((s) => s.palaces);
  const savePalace = useAtlas((s) => s.savePalace);
  const deletePalace = useAtlas((s) => s.deletePalace);
  const recordWalk = useAtlas((s) => s.recordPalaceWalk);
  const wide = useMediaQuery("(min-width: 768px)");
  const ids = useId();

  const existing = initialTopic ? palaces.find((p) => p.topicId === initialTopic) : palaces[0];
  const [palaceId, setPalaceId] = useState<string | null>(existing?.id ?? null);
  const palace = palaces.find((p) => p.id === palaceId) ?? null;
  const [draft, setDraft] = useState<Palace>(() => existing ?? newPalace(palaceName(initialTopic), initialTopic));
  const current = palace ?? draft;
  const [mode, setMode] = useState<"build" | "walk">("build");
  const [active, setActive] = useState<string | null>(() => LOCI.find((l) => !(existing?.placements ?? []).some((p) => p.locusId === l.id))?.id ?? LOCI[0].id);
  const initial = existing?.placements.find((p) => p.locusId === active);
  const [concept, setConcept] = useState(initial?.concept ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [suggestTopic, setSuggestTopic] = useState(initialTopic && getLesson(initialTopic) ? initialTopic : LESSONS[0]?.topicId ?? "");
  const [confirmFill, setConfirmFill] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const conceptRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Walk state
  const ordered = useMemo(() => LOCI.filter((l) => current.placements.some((p) => p.locusId === l.id)), [current.placements]);
  const [step, setStep] = useState(0);
  const [guess, setGuess] = useState("");
  const [results, setResults] = useState<(boolean | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const guessRef = useRef<HTMLInputElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const persist = (p: Palace) => {
    savePalace(p);
    setPalaceId(p.id);
    setDraft(p);
  };

  /** Selects a place and loads what is stored there (from `placements`, which may be newer than `current`). */
  const pick = (id: string, placements: Palace["placements"] = current.placements, focus = false) => {
    setActive(id);
    const pl = placements.find((p) => p.locusId === id);
    setConcept(pl?.concept ?? "");
    setImage(pl?.image ?? "");
    if (focus) requestAnimationFrame(() => conceptRef.current?.focus());
  };

  const place = () => {
    if (!active || !concept.trim()) return;
    const placements = [...current.placements.filter((p) => p.locusId !== active), { locusId: active, concept: concept.trim(), image: image.trim() }];
    persist({ ...current, placements });
    const idx = LOCI.findIndex((l) => l.id === active);
    const next = LOCI.slice(idx + 1).find((l) => !placements.some((p) => p.locusId === l.id));
    toast("Concetto collocato", { description: `${LOCI[idx].name}: ${concept.trim()}`, tone: "success" });
    if (next) pick(next.id, placements, true);
  };

  const clearLocus = () => {
    if (!active) return;
    const placements = current.placements.filter((p) => p.locusId !== active);
    persist({ ...current, placements });
    pick(active, placements, true);
  };

  /** Fills the palace with the lesson's suggestions: everywhere, or only in the free places. */
  const fillSuggestions = (onlyFree: boolean) => {
    const lesson = getLesson(suggestTopic);
    setConfirmFill(false);
    if (!lesson) return;
    let placements: Palace["placements"];
    if (onlyFree) {
      const free = LOCI.filter((l) => !current.placements.some((p) => p.locusId === l.id));
      const used = new Set(current.placements.map((p) => p.concept.toLowerCase()));
      const fresh = lesson.palaceSuggestions.filter((s) => !used.has(s.concept.toLowerCase()));
      placements = [...current.placements, ...fresh.slice(0, free.length).map((s, i) => ({ locusId: free[i].id, concept: s.concept, image: s.image }))];
    } else {
      placements = lesson.palaceSuggestions.slice(0, LOCI.length).map((s, i) => ({ locusId: LOCI[i].id, concept: s.concept, image: s.image }));
    }
    const name = current.placements.length && onlyFree ? current.name : palaceName(suggestTopic);
    persist({ ...current, topicId: onlyFree ? current.topicId ?? suggestTopic : suggestTopic, name, placements });
    const firstNew = LOCI.find((l) => placements.some((p) => p.locusId === l.id) && !current.placements.some((p) => p.locusId === l.id)) ?? LOCI[0];
    pick(firstNew.id, placements, true);
    toast("Suggerimenti inseriti", { description: "Rendi ogni immagine più tua: più è strana, più si ricorda.", tone: "success" });
  };

  const askFill = () => (current.placements.length ? setConfirmFill(true) : fillSuggestions(false));

  const startWalk = () => {
    setMode("walk");
    setStep(0);
    setGuess("");
    setResults(ordered.map(() => null));
    setRevealed(false);
    requestAnimationFrame(() => guessRef.current?.focus());
  };

  const reveal = () => {
    setRevealed(true);
    requestAnimationFrame(() => revealRef.current?.focus());
  };

  const answer = (ok: boolean) => {
    const next = results.map((r, i) => (i === step ? ok : r));
    setResults(next);
    setRevealed(false);
    setGuess("");
    if (step < ordered.length - 1) {
      setStep(step + 1);
      requestAnimationFrame(() => guessRef.current?.focus());
    } else {
      const recalled = next.filter(Boolean).length;
      recordWalk(current.id, recalled, ordered.length);
      setStep(ordered.length);
      requestAnimationFrame(() => doneRef.current?.focus());
    }
  };

  const walkLocus = ordered[step];
  const walkPlacement = walkLocus ? current.placements.find((p) => p.locusId === walkLocus.id) : undefined;
  const walkDone = mode === "walk" && step >= ordered.length;
  const activeLocus = LOCI.find((l) => l.id === active);
  const activePlaced = current.placements.some((p) => p.locusId === active);
  const match = revealed && guess.trim() ? similar(guess, walkPlacement?.concept ?? "") : null;

  const editor = activeLocus && (
    <div className="space-y-3 rounded-card border border-white/[0.08] bg-white/[0.025] p-4">
      <p className="text-sm text-fg-muted">
        Luogo {LOCI.indexOf(activeLocus) + 1} di {LOCI.length}, {roomName(activeLocus.room)}: <span className="font-medium text-fg">{activeLocus.name}</span>
      </p>
      <div>
        <Label htmlFor={`${ids}-concept`}>Concetto da ricordare</Label>
        <Input ref={conceptRef} id={`${ids}-concept`} value={concept} onChange={(e) => setConcept(e.target.value)} onKeyDown={(e) => e.key === "Enter" && concept.trim() && place()} placeholder="es. 3 NADH per giro" />
      </div>
      <div>
        <Label htmlFor={`${ids}-image`}>Immagine mentale</Label>
        <Textarea id={`${ids}-image`} rows={3} value={image} onChange={(e) => setImage(e.target.value)} placeholder="Una scena vivida e strana che fa qualcosa con il luogo…" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={!concept.trim()} onClick={place}>
          <Wand2 className="h-4 w-4" aria-hidden /> {activePlaced ? "Aggiorna" : "Colloca"}
        </Button>
        {activePlaced && (
          <Button variant="ghost" onClick={clearLocus}>
            Libera il luogo
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Modalità del palazzo"
          value={mode}
          onChange={(m) => (m === "walk" ? startWalk() : setMode("build"))}
          options={[
            { value: "build", label: <span className="flex items-center gap-1.5"><Hammer className="h-3.5 w-3.5" aria-hidden /> Costruisci</span> },
            { value: "walk", label: <span className="flex items-center gap-1.5"><Footprints className="h-3.5 w-3.5" aria-hidden /> Percorri</span> },
          ]}
        />
        {palaces.length > 0 && (
          <Select
            value={palaceId ?? ""}
            onChange={(e) => {
              const p = palaces.find((x) => x.id === e.target.value);
              if (p) {
                setPalaceId(p.id);
                setDraft(p);
                setMode("build");
                pick(LOCI.find((l) => !p.placements.some((x) => x.locusId === l.id))?.id ?? LOCI[0].id, p.placements);
              }
            }}
            className="w-auto max-w-[16rem]"
            aria-label="Palazzo salvato"
          >
            {!palace && <option value="">Nuovo palazzo</option>}
            {palaces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setPalaceId(null);
            setDraft(newPalace("Nuovo palazzo"));
            setMode("build");
            pick(LOCI[0].id, []);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden /> Nuovo
        </Button>
        {palace && (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden /> Elimina
          </Button>
        )}
      </div>

      <div className={cn("grid gap-5", wide && "xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start")}>
        {wide && (
          <div className="rounded-card border border-white/[0.07] bg-ink-950/40 p-3 sm:p-4 xl:sticky xl:top-32">
            <FloorPlan
              placements={current.placements}
              active={mode === "walk" ? (walkDone ? null : walkLocus?.id ?? null) : active}
              onPick={(id) => pick(id, current.placements, true)}
              walking={mode === "walk"}
              walkFrom={mode === "walk" ? (step > 0 ? ordered[step - 1]?.id ?? null : null) : null}
            />
          </div>
        )}

        {mode === "build" ? (
          <div className="min-w-0 space-y-4">
            <div>
              <label htmlFor={`${ids}-name`} className="sr-only">
                Nome del palazzo
              </label>
              <input
                ref={nameRef}
                id={`${ids}-name`}
                value={current.name}
                onChange={(e) => (palace ? persist({ ...current, name: e.target.value }) : setDraft({ ...current, name: e.target.value }))}
                className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 -mx-2 text-xl font-semibold tracking-[-0.01em] text-fg transition-colors hover:border-white/[0.12] focus:border-azure-400/70 focus:outline-none focus:ring-[3px] focus:ring-azure-500/25"
              />
              <p className="mt-1 text-sm text-fg-muted">
                {pluralize(current.placements.length, "luogo occupato", "luoghi occupati")} su {LOCI.length}
                {current.walks.length > 0 && `. Ultimi percorsi: ${current.walks.slice(-3).map((w) => `${w.recalled} su ${w.total}`).join(", ")}`}
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-card border border-white/[0.07] p-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Label htmlFor={`${ids}-sugg`} className="flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-azure-300" aria-hidden /> Parti dai suggerimenti di una lezione
                </Label>
                <Select id={`${ids}-sugg`} value={suggestTopic} onChange={(e) => setSuggestTopic(e.target.value)}>
                  {LESSONS.map((l) => (
                    <option key={l.topicId} value={l.topicId}>
                      {getTopicRef(l.topicId)?.topic.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="secondary" onClick={askFill} disabled={!suggestTopic}>
                Inserisci
              </Button>
            </div>

            {wide ? editor : <RouteList placements={current.placements} active={active} onPick={(id) => pick(id, current.placements, true)} editor={editor} />}

            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-4">
              <Button variant="secondary" disabled={current.placements.length < 3} onClick={startWalk}>
                <Footprints className="h-4 w-4" aria-hidden /> Percorri il palazzo
              </Button>
              {current.placements.length < 3 && <span className="text-sm text-fg-muted">Colloca almeno 3 concetti per percorrerlo.</span>}
            </div>
          </div>
        ) : (
          <div className="min-w-0 space-y-4">
            {ordered.length < 3 ? (
              <Notice tone="info" action={<Button size="sm" variant="secondary" onClick={() => setMode("build")}>Costruisci</Button>}>
                Colloca almeno 3 concetti prima di percorrere il palazzo.
              </Notice>
            ) : walkDone ? (
              <div className="space-y-4">
                <h3 ref={doneRef} tabIndex={-1} className="text-3xl font-semibold tracking-[-0.02em] text-fg tabular-nums focus-visible:outline-offset-4">
                  {results.filter(Boolean).length} su {ordered.length} ricordati
                </h3>
                <p className="max-w-[60ch] text-base text-fg-muted">Ripercorri il palazzo domani e tra qualche giorno: il ricordo dei luoghi si consolida con la ripetizione dilazionata.</p>
                <ul className="divide-y divide-white/[0.07]">
                  {ordered.map((l, i) => (
                    <li key={l.id} className="flex items-start gap-2.5 py-2 text-sm">
                      {results[i] ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />}
                      <span>
                        <span className="sr-only">{results[i] ? "Ricordato: " : "Non ricordato: "}</span>
                        <span className="text-fg-muted">{l.name}</span> <span className="text-fg">{current.placements.find((p) => p.locusId === l.id)?.concept}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" onClick={startWalk}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> Ripeti il percorso
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-fg-muted">
                    Luogo {step + 1} di {ordered.length}
                  </p>
                  <ProgressBar value={step / ordered.length} className="mt-2" label="Avanzamento del percorso" />
                </div>
                <h3 className="text-xl font-semibold text-fg">
                  {walkLocus?.name} <span className="text-base font-normal text-fg-muted">in {roomName(walkLocus?.room ?? "").toLowerCase()}</span>
                </h3>
                <div>
                  <Label htmlFor={`${ids}-guess`}>Visualizza la scena. Quale concetto avevi collocato qui?</Label>
                  <Input
                    ref={guessRef}
                    id={`${ids}-guess`}
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && guess.trim() && !revealed && reveal()}
                    placeholder="Scrivi il concetto…"
                    readOnly={revealed}
                  />
                </div>
                {!revealed ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" disabled={!guess.trim()} onClick={reveal}>
                      Verifica
                    </Button>
                    <Button variant="ghost" onClick={reveal}>
                      Non ricordo
                    </Button>
                  </div>
                ) : (
                  <div className="animate-fade-in space-y-3">
                    <div ref={revealRef} tabIndex={-1} role="status" className={cn("rounded-card border p-4 focus-visible:outline-offset-2", match ? "border-success/35 bg-success/[0.06]" : "border-white/[0.1] bg-white/[0.03]")}>
                      <p className={cn("flex items-center gap-2 text-sm font-medium", match ? "text-green-300" : "text-fg-muted")}>
                        {match ? <Check className="h-4 w-4" aria-hidden /> : null}
                        {match === null ? "Ecco il concetto che avevi collocato:" : match ? "Corrisponde a ciò che avevi collocato." : "Non corrisponde: confronta con ciò che avevi collocato."}
                      </p>
                      <p className="mt-2 text-base text-fg">{walkPlacement?.concept}</p>
                      {walkPlacement?.image && <p className="mt-1 text-sm text-fg-muted">{walkPlacement.image}</p>}
                    </div>
                    <p className="text-sm text-fg-muted">Sii onesto: conta solo se lo avevi davvero richiamato.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" onClick={() => answer(true)}>
                        <Check className="h-4 w-4" aria-hidden /> L’ho ricordato
                      </Button>
                      <Button variant="secondary" onClick={() => answer(false)}>
                        <X className="h-4 w-4" aria-hidden /> Non ricordato
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        open={confirmFill}
        onClose={() => setConfirmFill(false)}
        title="Il palazzo ha già dei concetti"
        description={`${pluralize(current.placements.length, "luogo è già occupato", "luoghi sono già occupati")}. Puoi riempire solo quelli liberi o sostituire tutto con i suggerimenti della lezione.`}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmFill(false)}>
              Annulla
            </Button>
            <Button variant="danger" onClick={() => fillSuggestions(false)}>
              Sostituisci tutto
            </Button>
            <Button variant="primary" onClick={() => fillSuggestions(true)} data-autofocus>
              Riempi i luoghi liberi
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">I concetti che hai scritto tu restano al loro posto se scegli di riempire solo i luoghi liberi.</p>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Eliminare «${current.name}»?`}
        description="Perderai i concetti collocati e lo storico dei percorsi. Non si può annullare."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} data-autofocus>
              Annulla
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (palace) deletePalace(palace.id);
                setConfirmDelete(false);
                setPalaceId(null);
                setDraft(newPalace("Il mio palazzo"));
                setMode("build");
                pick(LOCI[0].id, []);
                toast("Palazzo eliminato");
                requestAnimationFrame(() => nameRef.current?.focus());
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Elimina
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">{pluralize(current.placements.length, "luogo collocato", "luoghi collocati")}.</p>
      </Modal>
    </div>
  );
}
