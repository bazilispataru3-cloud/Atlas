"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import type { ConceptMap } from "@/lib/types";
import { Button, Input, Select } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const GROUP_COLORS = ["#3987e5", "#199e70", "#d95926", "#9085e9"];

function layout(map: ConceptMap, width: number) {
  const groups = new Map<number, string[]>();
  for (const n of map.nodes) {
    const g = n.group ?? 0;
    groups.set(g, [...(groups.get(g) ?? []), n.id]);
  }
  const cols = [...groups.keys()].sort((a, b) => a - b);
  const colW = width / cols.length;
  const maxRows = Math.max(...[...groups.values()].map((v) => v.length));
  const rowH = 74;
  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((g, ci) => {
    const ids = groups.get(g)!;
    const offset = ((maxRows - ids.length) * rowH) / 2;
    ids.forEach((id, ri) => pos.set(id, { x: colW * ci + colW / 2, y: 46 + offset + ri * rowH }));
  });
  return { pos, height: 46 + maxRows * rowH };
}

/** Read-only concept map with labelled relations. */
export function ConceptMapView({ map }: { map: ConceptMap }) {
  const width = 860;
  const { pos, height } = useMemo(() => layout(map, width), [map]);
  const label = new Map(map.nodes.map((n) => [n.id, n]));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full" role="img" aria-label="Mappa concettuale">
        <defs>
          <marker id="cm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.45)" />
          </marker>
        </defs>
        {map.edges.map((e, i) => {
          const a = pos.get(e.from)!;
          const b = pos.get(e.to)!;
          const dx = b.x - a.x;
          const sameCol = Math.abs(dx) < 5;
          const startX = sameCol ? a.x + 60 : a.x + Math.sign(dx) * 78;
          const endX = sameCol ? b.x + 60 : b.x - Math.sign(dx) * 82;
          const midX = (startX + endX) / 2 + (sameCol ? 40 : 0);
          const midY = (a.y + b.y) / 2;
          return (
            <g key={i}>
              <path d={`M${startX},${a.y} Q${midX},${sameCol ? midY : a.y} ${endX},${b.y}`} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" markerEnd="url(#cm-arrow)" />
              <text x={midX} y={midY - 6} textAnchor="middle" fontSize="11" className="fill-fg-subtle">
                {e.label}
              </text>
            </g>
          );
        })}
        {map.nodes.map((n) => {
          const p = pos.get(n.id)!;
          const c = GROUP_COLORS[(n.group ?? 0) % GROUP_COLORS.length];
          return (
            <g key={n.id}>
              <rect x={p.x - 78} y={p.y - 19} width="156" height="38" rx="12" fill="#111116" stroke={c} strokeOpacity="0.7" />
              <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize="12.5" className="fill-fg">
                {label.get(n.id)!.label.length > 22 ? label.get(n.id)!.label.slice(0, 21) + "…" : label.get(n.id)!.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Build the map from memory, then compare with the reference. */
export function ConceptMapBuilder({ reference }: { reference: ConceptMap }) {
  const [edges, setEdges] = useState<{ from: string; to: string; label: string }[]>([]);
  const [from, setFrom] = useState(reference.nodes[0].id);
  const [to, setTo] = useState(reference.nodes[1].id);
  const [rel, setRel] = useState("");
  const [checked, setChecked] = useState(false);
  const name = new Map(reference.nodes.map((n) => [n.id, n.label]));

  const key = (a: string, b: string) => [a, b].sort().join("|");
  const refKeys = new Set(reference.edges.map((e) => key(e.from, e.to)));
  const userKeys = new Set(edges.map((e) => key(e.from, e.to)));
  const found = edges.filter((e) => refKeys.has(key(e.from, e.to)));
  const missing = reference.edges.filter((e) => !userKeys.has(key(e.from, e.to)));
  const extra = edges.filter((e) => !refKeys.has(key(e.from, e.to)));

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-fg-muted">
        Collega i concetti senza guardare la lezione: scegli due nodi e scrivi la relazione con un verbo. Costruire la mappa a memoria la trasforma in pratica di recupero.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
        <Select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Concetto di partenza">
          {reference.nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
        </Select>
        <Select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Concetto di arrivo">
          {reference.nodes.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
        </Select>
        <Input value={rel} onChange={(e) => setRel(e.target.value)} placeholder="relazione (es. «produce»)" aria-label="Relazione" />
        <Button variant="secondary" disabled={from === to || !rel.trim()} onClick={() => { setEdges([...edges, { from, to, label: rel.trim() }]); setRel(""); setChecked(false); }}>
          <Plus className="h-4 w-4" /> Collega
        </Button>
      </div>
      {edges.length > 0 && (
        <ul className="space-y-1.5">
          {edges.map((e, i) => {
            const ok = refKeys.has(key(e.from, e.to));
            return (
              <li key={i} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px]", checked ? (ok ? "border-emerald-400/30 bg-emerald-500/[0.05]" : "border-amber-400/30 bg-amber-500/[0.05]") : "border-white/[0.07]")}>
                {checked && (ok ? <Check className="h-4 w-4 text-emerald-300" /> : <X className="h-4 w-4 text-amber-300" />)}
                <span className="text-fg">{name.get(e.from)}</span>
                <span className="text-fg-subtle">— {e.label} →</span>
                <span className="text-fg">{name.get(e.to)}</span>
                <button onClick={() => setEdges(edges.filter((_, k) => k !== i))} className="ml-auto text-fg-subtle hover:text-fg" aria-label="Rimuovi collegamento">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex justify-end">
        <Button variant="primary" disabled={!edges.length} onClick={() => setChecked(true)}>Confronta con la mappa di riferimento</Button>
      </div>
      {checked && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[13.5px]">
          <div className="text-fg">
            Collegamenti trovati: <span className="font-mono">{found.length}/{reference.edges.length}</span>
            {extra.length > 0 && <span className="text-fg-subtle"> · {extra.length} collegamenti non presenti nella mappa di riferimento (non necessariamente sbagliati: verificali)</span>}
          </div>
          {missing.length > 0 && (
            <div>
              <div className="text-fg-muted">Collegamenti mancanti:</div>
              <ul className="mt-1 space-y-1 text-fg-subtle">
                {missing.map((m, i) => (
                  <li key={i}>• {name.get(m.from)} — {m.label} → {name.get(m.to)}</li>
                ))}
              </ul>
            </div>
          )}
          <ConceptMapView map={reference} />
        </div>
      )}
    </div>
  );
}
