"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, CircleHelp, Minus, Plus, Trash2 } from "lucide-react";
import type { ConceptMap } from "@/lib/types";
import { Button, Input, Label, Notice, Select } from "@/components/ui/primitives";
import { useAtlas } from "@/lib/store";
import { cn } from "@/lib/utils";

// ── Layout ─────────────────────────────────────────────────────
// The map is drawn at its real pixel width (no viewBox scaling), so text stays
// 12–13px at any size. Each `group` becomes a row; long rows wrap. Node labels
// wrap inside the node, relation labels sit on their line with a dark halo and
// are nudged away from nodes and other labels. Below 560px the map becomes a
// list of relations, which is also the text alternative on wide screens.

const NODE_FONT = 13;
const NODE_LH = 17;
const NODE_CHAR = 6.9;
const NODE_PAD = 12;
const NODE_MIN_H = 40;
const NODE_PREF_W = 156;
const GAP_X_MIN = 108;
const GAP_Y = 86;
const EDGE_FONT = 12;
const EDGE_LH = 15;
const EDGE_CHAR = 6.4;
const HALO = "#0d1015";
const NARROW = 560;

export type EdgeStatus = "default" | "user" | "found" | "missing" | "extra";

const EDGE_STYLE: Record<EdgeStatus, { stroke: string; dash?: string; marker: string; prefix: string }> = {
  default: { stroke: "rgba(196,210,255,0.42)", marker: "muted", prefix: "" },
  user: { stroke: "#3d8bff", marker: "azure", prefix: "" },
  found: { stroke: "#4ade80", marker: "success", prefix: "✓ " },
  missing: { stroke: "#868d9e", dash: "5 5", marker: "subtle", prefix: "manca: " },
  extra: { stroke: "#fb923c", dash: "2 4", marker: "warning", prefix: "? " },
};

const STATUS_TEXT: Record<EdgeStatus, string> = {
  default: "",
  user: "",
  found: "Trovato",
  missing: "Mancante",
  extra: "Non nella mappa di riferimento",
};

interface NodeBox {
  id: string;
  lines: string[];
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  col: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  // Hard-break single words longer than the line (formulas without spaces).
  return lines.flatMap((l) => (l.length <= maxChars + 2 ? [l] : l.match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [l]));
}

interface Pt {
  x: number;
  y: number;
}

/** Area shared by two rectangles (0 when they do not touch). */
const overlapArea = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** Point at `t` on a cubic Bézier curve. */
function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return { x: k[0] * p0.x + k[1] * p1.x + k[2] * p2.x + k[3] * p3.x, y: k[0] * p0.y + k[1] * p1.y + k[2] * p2.y + k[3] * p3.y };
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

/**
 * Reorders the nodes inside each row (rows themselves keep their order) so that
 * linked nodes in the same row sit side by side and links between rows run as
 * straight as possible: fewer crossings, shorter lines, more room for labels.
 */
function orderRows(rows: string[][], edges: ConceptMap["edges"]) {
  const rowOf = new Map<string, number>();
  rows.forEach((ids, r) => ids.forEach((id) => rowOf.set(id, r)));
  const frac = (id: string) => {
    const ids = rows[rowOf.get(id)!];
    return (ids.indexOf(id) + 0.5) / ids.length;
  };
  for (let pass = 0; pass < 2; pass++) {
    rows.forEach((ids, r) => {
      if (ids.length < 2 || ids.length > 5) return;
      let best = ids;
      let bestCost = Infinity;
      for (const perm of permutations(ids)) {
        const pos = (id: string) => (perm.indexOf(id) + 0.5) / perm.length;
        let cost = 0;
        for (const e of edges) {
          const ra = rowOf.get(e.from);
          const rb = rowOf.get(e.to);
          if (ra === undefined || rb === undefined || e.from === e.to) continue;
          // Same row: side by side, and left to right (reading order) unless that costs a lot elsewhere.
          if (ra === r && rb === r) cost += (Math.abs(perm.indexOf(e.from) - perm.indexOf(e.to)) > 1 ? 10 : 0) + (perm.indexOf(e.from) > perm.indexOf(e.to) ? 4 : 0);
          else if (ra === r) cost += Math.abs(pos(e.from) - frac(e.to)) * 3;
          else if (rb === r) cost += Math.abs(pos(e.to) - frac(e.from)) * 3;
        }
        if (cost < bestCost - 1e-9) {
          best = perm;
          bestCost = cost;
        }
      }
      rows[r] = best;
    });
  }
}

function computeLayout(map: ConceptMap, W: number, prefixes?: string[]) {
  const groups = new Map<number, string[]>();
  for (const n of map.nodes) {
    const g = n.group ?? 0;
    groups.set(g, [...(groups.get(g) ?? []), n.id]);
  }
  const cap = Math.max(1, Math.floor((W + GAP_X_MIN) / (NODE_PREF_W + GAP_X_MIN)));
  const rows: string[][] = [];
  for (const g of [...groups.keys()].sort((a, b) => a - b)) {
    const ids = groups.get(g)!;
    for (let i = 0; i < ids.length; i += cap) rows.push(ids.slice(i, i + cap));
  }
  orderRows(rows, map.edges);
  const label = new Map(map.nodes.map((n) => [n.id, n.label]));
  const boxes = new Map<string, NodeBox>();
  const gaps: number[] = [];
  let y = 6;
  rows.forEach((ids, r) => {
    const k = ids.length;
    const w = Math.min(196, Math.max(112, k === 1 ? 196 : (W - (k - 1) * GAP_X_MIN) / k));
    const gap = k > 1 ? Math.min(250, (W - k * w) / (k - 1)) : 0;
    gaps[r] = gap;
    const x0 = (W - (k * w + (k - 1) * gap)) / 2;
    const maxChars = Math.max(8, Math.floor((w - 2 * NODE_PAD) / NODE_CHAR));
    const items = ids.map((id, c) => {
      const lines = wrap(label.get(id) ?? id, maxChars);
      return { id, lines, c, h: Math.max(NODE_MIN_H, lines.length * NODE_LH + 18) };
    });
    const rowH = Math.max(...items.map((i) => i.h));
    for (const it of items) boxes.set(it.id, { id: it.id, lines: it.lines, x: x0 + it.c * (w + gap), y: y + (rowH - it.h) / 2, w, h: it.h, row: r, col: it.c });
    y += rowH + GAP_Y;
  });
  let height = y - GAP_Y + 6;

  const placed: Rect[] = [...boxes.values()].map((b) => ({ x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 }));
  const edges = map.edges
    .map((e, i) => {
      const a = boxes.get(e.from);
      const b = boxes.get(e.to);
      if (!a || !b || a === b) return null;
      let d: string;
      let at: (t: number) => Pt;
      let maxChars = 20;
      // Fallback vertical nudges around the middle of the edge.
      let shifts = [-20, 20, -40, 40];
      // Positions along the edge tried first, so a label always sits on its own line.
      let ts = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78];
      if (a.row === b.row) {
        const cy = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
        if (Math.abs(a.col - b.col) === 1) {
          const rightward = a.col < b.col;
          const x1 = rightward ? a.x + a.w : a.x;
          const x2 = rightward ? b.x : b.x + b.w;
          d = `M${x1},${cy} L${x2 + (rightward ? -2 : 2)},${cy}`;
          at = (t) => ({ x: x1 + (x2 - x1) * t, y: cy });
          maxChars = Math.max(8, Math.floor((gaps[a.row] - 14) / EDGE_CHAR));
          shifts = [-24, 24];
          ts = [0.5];
        } else {
          const x1 = a.x + a.w / 2;
          const x2 = b.x + b.w / 2;
          const bottom = Math.max(a.y + a.h, b.y + b.h);
          const p0 = { x: x1, y: a.y + a.h };
          const p3 = { x: x2, y: b.y + b.h + 2 };
          d = `M${p0.x},${p0.y} C${x1},${bottom + 52} ${x2},${bottom + 52} ${p3.x},${p3.y}`;
          at = (t) => cubic(p0, { x: x1, y: bottom + 52 }, { x: x2, y: bottom + 52 }, p3, t);
          maxChars = 24;
          shifts = [18, -18, 36];
        }
      } else {
        const down = a.row < b.row;
        const p0 = { x: a.x + a.w / 2, y: down ? a.y + a.h : a.y };
        const p3 = { x: b.x + b.w / 2, y: down ? b.y - 2 : b.y + b.h + 2 };
        const my = (p0.y + p3.y) / 2;
        d = `M${p0.x},${p0.y} C${p0.x},${my} ${p3.x},${my} ${p3.x},${p3.y}`;
        at = (t) => cubic(p0, { x: p0.x, y: my }, { x: p3.x, y: my }, p3, t);
      }
      return { e, i, d, at, maxChars, shifts, ts };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  // Labels: the first free spot along the edge, then small nudges; if every spot
  // is taken, the one that overlaps least. The status prefix counts in the width.
  const labels = edges.map((g) => {
    const lines = wrap(`${prefixes?.[g.i] ?? ""}${g.e.label}`, g.maxChars);
    const w = Math.max(...lines.map((l) => l.length)) * EDGE_CHAR + 10;
    const h = lines.length * EDGE_LH + 4;
    const mid = g.at(0.5);
    const candidates = [...g.ts.map((t) => g.at(t)), ...g.shifts.map((s) => ({ x: mid.x, y: mid.y + s }))];
    let best = { x: mid.x, y: mid.y };
    let bestCost = Infinity;
    for (const c of candidates) {
      const cx = Math.min(W - w / 2 - 2, Math.max(w / 2 + 2, c.x));
      const r = { x: cx - w / 2, y: c.y - h / 2, w, h };
      const cost = placed.reduce((sum, p) => sum + overlapArea(p, r), 0);
      if (cost < bestCost) {
        best = { x: cx, y: c.y };
        bestCost = cost;
      }
      if (cost === 0) break;
    }
    const rect = { x: best.x - w / 2, y: best.y - h / 2, w, h };
    placed.push(rect);
    height = Math.max(height, rect.y + rect.h + 4);
    return { lines, x: best.x, y: best.y };
  });

  return { boxes: [...boxes.values()], edges, labels, height: Math.ceil(height) };
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function RelationList({ map, statuses, className }: { map: ConceptMap; statuses?: EdgeStatus[]; className?: string }) {
  const name = new Map(map.nodes.map((n) => [n.id, n.label]));
  return (
    <ol className={cn("space-y-2", className)}>
      {map.edges.map((e, i) => {
        const st = statuses?.[i] ?? "default";
        return (
          <li key={`${e.from}-${e.to}-${i}`} className={cn("rounded-control border px-3.5 py-2.5", st === "missing" ? "border-dashed border-white/[0.14]" : st === "extra" ? "border-warning/30" : st === "found" ? "border-success/30" : "border-white/[0.07]", "bg-white/[0.02]")}>
            {STATUS_TEXT[st] && (
              <span className={cn("mb-1 flex items-center gap-1.5 text-xs font-medium", st === "found" ? "text-green-300" : st === "extra" ? "text-orange-300" : "text-fg-muted")}>
                {st === "found" ? <Check className="h-3.5 w-3.5" aria-hidden /> : st === "extra" ? <CircleHelp className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                {STATUS_TEXT[st]}
              </span>
            )}
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="font-medium text-fg">{name.get(e.from) ?? e.from}</span>
              <span className="inline-flex items-center gap-1.5 text-fg-muted">
                {e.label}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
              </span>
              <span className="sr-only">verso</span>
              <span className="font-medium text-fg">{name.get(e.to) ?? e.to}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Concept map with labelled relations. `edgeStatus[i]` styles `map.edges[i]`
 * (line style plus a text prefix, never colour alone).
 */
export function ConceptMapView({ map, edgeStatus, label, className }: { map: ConceptMap; edgeStatus?: EdgeStatus[]; label?: string; className?: string }) {
  const [ref, width] = useWidth();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const layout = useMemo(
    () => (width && width >= NARROW ? computeLayout(map, width, edgeStatus?.map((st) => EDGE_STYLE[st].prefix)) : null),
    [map, width, edgeStatus],
  );
  const summary = `${label ?? "Mappa concettuale"}: ${map.nodes.length} concetti, ${map.edges.length} relazioni`;
  const markers: [string, string][] = [
    ["muted", "rgba(196,210,255,0.55)"],
    ["azure", "#3d8bff"],
    ["success", "#4ade80"],
    ["subtle", "#868d9e"],
    ["warning", "#fb923c"],
  ];

  return (
    <div ref={ref} className={cn("min-w-0", className)}>
      {width === null ? (
        <div className="h-24" aria-hidden />
      ) : !layout ? (
        <RelationList map={map} statuses={edgeStatus} />
      ) : (
        <>
          <svg width={width} height={layout.height} viewBox={`0 0 ${width} ${layout.height}`} className="block max-w-full" role="img" aria-label={`${summary}. L’elenco delle relazioni è qui sotto.`}>
            <defs>
              {markers.map(([k, c]) => (
                <marker key={k} id={`${uid}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={c} />
                </marker>
              ))}
            </defs>
            {layout.edges.map((g) => {
              const st = EDGE_STYLE[edgeStatus?.[g.i] ?? "default"];
              return <path key={g.i} d={g.d} fill="none" stroke={st.stroke} strokeWidth="1.6" strokeDasharray={st.dash} markerEnd={`url(#${uid}-${st.marker})`} />;
            })}
            {layout.boxes.map((b) => (
              <g key={b.id}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" fill="#151922" stroke="rgba(196,210,255,0.18)" />
                <text x={b.x + b.w / 2} y={b.y + b.h / 2 - ((b.lines.length - 1) * NODE_LH) / 2 + 4.5} textAnchor="middle" fontSize={NODE_FONT} fill="#eceef3">
                  {b.lines.map((l, k) => (
                    <tspan key={k} x={b.x + b.w / 2} dy={k === 0 ? 0 : NODE_LH}>
                      {l}
                    </tspan>
                  ))}
                </text>
              </g>
            ))}
            {layout.edges.map((g, k) => {
              const lab = layout.labels[k];
              const lines = lab.lines;
              return (
                <text
                  key={g.i}
                  x={lab.x}
                  y={lab.y - ((lines.length - 1) * EDGE_LH) / 2 + 4}
                  textAnchor="middle"
                  fontSize={EDGE_FONT}
                  fill="#a7adbb"
                  stroke={HALO}
                  strokeWidth="5"
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  {lines.map((l, j) => (
                    <tspan key={j} x={lab.x} dy={j === 0 ? 0 : EDGE_LH}>
                      {l}
                    </tspan>
                  ))}
                </text>
              );
            })}
          </svg>
          <details className="group mt-3">
            <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-control px-1 text-sm text-fg-muted hover:text-fg">Leggi la mappa come elenco</summary>
            <RelationList map={map} statuses={edgeStatus} className="mt-2" />
          </details>
        </>
      )}
    </div>
  );
}

// ── Builder ────────────────────────────────────────────────────

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/** Build the map from memory (drawn live), then compare with the reference. */
export function ConceptMapBuilder({ reference, topicId }: { reference: ConceptMap; topicId?: string }) {
  const recordRecall = useAtlas((s) => s.recordRecallScore);
  const [edges, setEdges] = useState<{ from: string; to: string; label: string }[]>([]);
  const [from, setFrom] = useState(reference.nodes[0]?.id ?? "");
  const [to, setTo] = useState(reference.nodes[1]?.id ?? "");
  const [rel, setRel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [checked, setChecked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const focusFrom = () => formRef.current?.querySelector("select")?.focus();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const ids = useId();
  const name = useMemo(() => new Map(reference.nodes.map((n) => [n.id, n.label])), [reference]);

  const refByKey = useMemo(() => new Map(reference.edges.map((e) => [pairKey(e.from, e.to), e])), [reference]);
  const userKeys = new Set(edges.map((e) => pairKey(e.from, e.to)));
  const found = edges.filter((e) => refByKey.has(pairKey(e.from, e.to)));
  const extra = edges.filter((e) => !refByKey.has(pairKey(e.from, e.to)));

  const userMap: ConceptMap = useMemo(() => {
    const used = new Set(edges.flatMap((e) => [e.from, e.to]));
    return { nodes: reference.nodes.filter((n) => used.has(n.id)), edges };
  }, [edges, reference]);

  const compared = useMemo(() => {
    const refEdges = reference.edges.map((e) => ({ ...e, status: (userKeys.has(pairKey(e.from, e.to)) ? "found" : "missing") as EdgeStatus }));
    const extraEdges = extra.map((e) => ({ ...e, status: "extra" as EdgeStatus }));
    const all = [...refEdges, ...extraEdges];
    return { map: { nodes: reference.nodes, edges: all.map(({ from, to, label }) => ({ from, to, label })) }, statuses: all.map((e) => e.status) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, reference]);

  const add = (ev: FormEvent) => {
    ev.preventDefault();
    if (from === to) return setError("Scegli due concetti diversi.");
    if (!rel.trim()) return setError("Scrivi la relazione: un verbo o una frase breve, per esempio «produce».");
    if (userKeys.has(pairKey(from, to))) return setError("Hai già collegato questi due concetti: rimuovi il collegamento se vuoi cambiarlo.");
    const e = { from, to, label: rel.trim() };
    setEdges([...edges, e]);
    setRel("");
    setError(null);
    setChecked(false);
    setAnnounce(`Collegamento aggiunto: ${name.get(from)} ${e.label} ${name.get(to)}.`);
    focusFrom();
  };

  const remove = (i: number) => {
    const e = edges[i];
    setEdges(edges.filter((_, k) => k !== i));
    setChecked(false);
    setAnnounce(`Collegamento rimosso: ${name.get(e.from)} ${e.label} ${name.get(e.to)}.`);
    focusFrom();
  };

  const compare = () => {
    setChecked(true);
    if (topicId && reference.edges.length) recordRecall(topicId, found.length / reference.edges.length);
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  return (
    <div className="space-y-6">
      <p className="max-w-[65ch] text-base leading-relaxed text-fg-muted">
        Collega i concetti senza guardare la lezione: scegli due concetti e scrivi la relazione con un verbo. Costruire la mappa a memoria la trasforma in pratica di recupero.
      </p>

      <form ref={formRef} onSubmit={add} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <div>
          <Label htmlFor={`${ids}-from`}>Da</Label>
          <Select id={`${ids}-from`} value={from} onChange={(e) => setFrom(e.target.value)}>
            {reference.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${ids}-rel`}>Relazione</Label>
          <Input id={`${ids}-rel`} value={rel} onChange={(e) => setRel(e.target.value)} placeholder="es. produce" aria-invalid={Boolean(error && !rel.trim()) || undefined} aria-describedby={error ? `${ids}-err` : undefined} />
        </div>
        <div>
          <Label htmlFor={`${ids}-to`}>A</Label>
          <Select id={`${ids}-to`} value={to} onChange={(e) => setTo(e.target.value)}>
            {reference.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary" className="h-11 md:h-10">
          <Plus className="h-4 w-4" aria-hidden /> Collega
        </Button>
      </form>
      {error && (
        <p id={`${ids}-err`} role="alert" className="-mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {announce}
      </p>

      {!checked && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-fg">La tua mappa</h3>
            {edges.length ? (
              <ConceptMapView map={userMap} edgeStatus={edges.map(() => "user" as const)} label="La tua mappa" className="mt-3" />
            ) : (
              <p className="mt-2 rounded-card border border-dashed border-white/[0.12] px-4 py-8 text-center text-sm text-fg-muted">La mappa compare qui quando aggiungi il primo collegamento.</p>
            )}
          </div>
          {edges.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-fg">Collegamenti ({edges.length})</h3>
              <ul className="mt-2 divide-y divide-white/[0.07]">
                {edges.map((e, i) => (
                  <li key={`${e.from}-${e.to}`} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="text-fg">{name.get(e.from)}</span> <span className="text-fg-muted">{e.label}</span> <span className="text-fg">{name.get(e.to)}</span>
                    </span>
                    <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 sm:h-9 sm:w-9" onClick={() => remove(i)} aria-label={`Rimuovi il collegamento ${name.get(e.from)} ${e.label} ${name.get(e.to)}`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!checked ? (
          <>
            <Button variant="primary" disabled={!edges.length} onClick={compare}>
              Confronta con la mappa di riferimento
            </Button>
            {!edges.length && <span className="text-sm text-fg-muted">Aggiungi almeno un collegamento per confrontare.</span>}
          </>
        ) : (
          <Button variant="secondary" onClick={() => setChecked(false)}>
            Modifica la tua mappa
          </Button>
        )}
      </div>

      {checked && (
        <div className="animate-fade-in space-y-5 border-t border-white/[0.07] pt-6">
          <div>
            <h3 ref={resultRef} tabIndex={-1} className="text-3xl font-semibold tracking-[-0.02em] text-fg tabular-nums focus-visible:outline-offset-4">
              {found.length} di {reference.edges.length}
            </h3>
            <p className="mt-1 max-w-[65ch] text-base text-fg-muted">
              collegamenti della mappa di riferimento trovati.
              {extra.length > 0 && ` ${extra.length === 1 ? "Un collegamento tuo non è" : `${extra.length} collegamenti tuoi non sono`} nella mappa di riferimento: non per forza sbagliati, verificali sulla lezione.`}
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-fg-muted" aria-label="Legenda">
            <li className="flex items-center gap-2"><span className="h-0.5 w-6 bg-success" aria-hidden /> ✓ trovato</li>
            <li className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed border-fg-subtle" aria-hidden /> manca: da aggiungere</li>
            <li className="flex items-center gap-2"><span className="w-6 border-t-2 border-dotted border-warning" aria-hidden /> ? solo nella tua mappa</li>
          </ul>
          <ConceptMapView map={compared.map} edgeStatus={compared.statuses} label="Confronto con la mappa di riferimento" />
          {found.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-fg">Confronta le relazioni che hai scritto</h4>
              <ul className="mt-2 divide-y divide-white/[0.07]">
                {found.map((e) => {
                  const r = refByKey.get(pairKey(e.from, e.to))!;
                  return (
                    <li key={`${e.from}-${e.to}`} className="py-2.5 text-sm">
                      <span className="font-medium text-fg">
                        {name.get(e.from)} e {name.get(e.to)}
                      </span>
                      <span className="mt-0.5 block text-fg-muted">
                        La tua relazione: «{e.label}». Nella mappa di riferimento: «{r.label}».
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {found.length === reference.edges.length && extra.length === 0 && <Notice tone="success" live>Hai ricostruito tutta la mappa. Riprova tra qualche giorno, sempre a memoria.</Notice>}
        </div>
      )}
    </div>
  );
}
