"use client";

import { Children, cloneElement, isValidElement, useId, useMemo, type ReactElement, type ReactNode } from "react";
import type { CoverMotif, SubjectId } from "@/lib/types";

// Original generative illustrations used as course covers when no official
// image is available. The UI declares them as ATLAS illustrations (cover title
// attribute and the catalogue footnote).
// Motifs respect basic scientific conventions (e.g. right-handed B-DNA with
// major/minor grooves, pyranose ring, p-orbital lobes, dipole field lines).

function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Node and browsers can disagree on the last bit of Math.sin/cos, which breaks
// hydration of the generated geometry. Rounding every coordinate to 2 decimals
// makes the server and client markup identical.
const round = (n: number) => Math.round(n * 100) / 100;
const roundNumbers = (s: string) => s.replace(/-?\d+\.\d+(e-?\d+)?/g, (m) => String(round(Number(m))));

function stabilize(node: ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<Record<string, unknown>>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(el.props)) {
      if (k === "children") continue;
      if (typeof v === "number") next[k] = round(v);
      else if (typeof v === "string" && (k === "d" || k === "transform" || k === "points")) next[k] = roundNumbers(v);
    }
    return cloneElement(el, next, ...(el.props.children === undefined ? [] : [stabilize(el.props.children as ReactNode)]));
  });
}

const W = 640;
const H = 360;

interface Palette {
  bg0: string;
  bg1: string;
  a: string; // primary accent
  b: string; // secondary accent
  c: string; // highlight
}

export type CoverSubject = SubjectId | "multi";

/**
 * Palettes by subject, so the cover tells the subject at a glance (the same hues
 * as the subject tones used across ATLAS: biology green, chemistry coral, physics
 * violet; several subjects together read azure). Free resources never get gold or
 * amber: gold is reserved for premium.
 */
const PALETTES: Record<CoverSubject, Palette[]> = {
  biologia: [
    { bg0: "#03120d", bg1: "#0a3324", a: "#45c79a", b: "#3d8bff", c: "#d7f7ea" },
    { bg0: "#031216", bg1: "#0a2f38", a: "#2dd4bf", b: "#45c79a", c: "#ccfbf1" },
    { bg0: "#05100c", bg1: "#113a2a", a: "#6ee7b7", b: "#8db9ff", c: "#ecfdf5" },
    { bg0: "#040d14", bg1: "#0d2a33", a: "#45c79a", b: "#aba3f2", c: "#e6fff5" },
  ],
  chimica: [
    { bg0: "#140906", bg1: "#3a170d", a: "#f08a5d", b: "#8db9ff", c: "#ffe8dd" },
    { bg0: "#0b0a14", bg1: "#24172c", a: "#f2a07b", b: "#9fb8ff", c: "#fff1ea" },
    { bg0: "#080c16", bg1: "#172238", a: "#f08a5d", b: "#3d8bff", c: "#fde7dc" },
    { bg0: "#110a0d", bg1: "#311620", a: "#f39a86", b: "#aba3f2", c: "#ffeceb" },
  ],
  fisica: [
    { bg0: "#090818", bg1: "#201a48", a: "#aba3f2", b: "#3d8bff", c: "#ede9fe" },
    { bg0: "#050b18", bg1: "#10244a", a: "#8db9ff", b: "#aba3f2", c: "#e6efff" },
    { bg0: "#0b0716", bg1: "#2a1646", a: "#c4b5fd", b: "#67e8f9", c: "#f5f3ff" },
    { bg0: "#04101a", bg1: "#0c2a40", a: "#67e8f9", b: "#aba3f2", c: "#ecfeff" },
  ],
  multi: [
    { bg0: "#050b18", bg1: "#0d2350", a: "#3d8bff", b: "#45c79a", c: "#e6efff" },
    { bg0: "#070a18", bg1: "#181d48", a: "#8db9ff", b: "#aba3f2", c: "#eef2ff" },
    { bg0: "#041018", bg1: "#0b2c44", a: "#3d8bff", b: "#f08a5d", c: "#e6efff" },
  ],
};

const GOLD: Palette[] = [
  { bg0: "#0c0904", bg1: "#2e2209", a: "#efc14f", b: "#f6dc8f", c: "#fff8e1" },
  { bg0: "#0b0906", bg1: "#33260b", a: "#f4d27a", b: "#e2a92e", c: "#fffaf0" },
];

/** Small stable string hash, so neighbouring cards with the same motif still differ. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

function DNA({ p, r }: { p: Palette; r: () => number }) {
  const cy = H / 2 + (r() - 0.5) * 40;
  const amp = 70 + r() * 20;
  const k = (2 * Math.PI) / (210 + r() * 40);
  const groove = 0.38 * 2 * Math.PI; // unequal phase → major and minor grooves
  const phase = r() * Math.PI * 2;
  const tilt = -12 + r() * 10;
  const segs: { d: string; z: number; strand: number }[] = [];
  const rungs: ReactNode[] = [];
  for (let s = 0; s < 2; s++) {
    for (let x = -40; x < W + 40; x += 6) {
      const t1 = k * x + phase + s * groove;
      const t2 = k * (x + 6) + phase + s * groove;
      // y = −cos θ (screen y points down), depth = sin θ → right-handed helix
      segs.push({ d: `M${x},${cy - amp * Math.cos(t1)} L${x + 6},${cy - amp * Math.cos(t2)}`, z: Math.sin((t1 + t2) / 2), strand: s });
    }
  }
  for (let x = -20; x < W + 20; x += 21) {
    const t = k * x + phase;
    const ya = cy - amp * Math.cos(t);
    const yb = cy - amp * Math.cos(t + groove);
    const z = (Math.sin(t) + Math.sin(t + groove)) / 2;
    rungs.push(<line key={x} x1={x} y1={ya} x2={x} y2={yb} stroke={p.c} strokeOpacity={0.12 + (z + 1) * 0.12} strokeWidth={3} strokeLinecap="round" />);
  }
  return (
    <g transform={`rotate(${tilt} ${W / 2} ${H / 2})`}>
      {segs.filter((s) => s.z < 0).map((s, i) => <path key={`b${i}`} d={s.d} stroke={s.strand ? p.b : p.a} strokeOpacity={0.35} strokeWidth={7} strokeLinecap="round" />)}
      {rungs}
      {segs.filter((s) => s.z >= 0).map((s, i) => <path key={`f${i}`} d={s.d} stroke={s.strand ? p.b : p.a} strokeOpacity={0.75 + s.z * 0.25} strokeWidth={9} strokeLinecap="round" />)}
    </g>
  );
}

function Cell({ p, r }: { p: Palette; r: () => number }) {
  const cx = W * (0.55 + (r() - 0.5) * 0.2);
  const cy = H * 0.52;
  const R = 150;
  const pts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const rr = R * (0.9 + r() * 0.18);
    return [cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.92];
  });
  const path = pts.map((pt, i) => {
    const next = pts[(i + 1) % pts.length];
    const mx = (pt[0] + next[0]) / 2;
    const my = (pt[1] + next[1]) / 2;
    return `${i === 0 ? `M${mx},${my}` : ""} Q${next[0]},${next[1]} ${(next[0] + pts[(i + 2) % pts.length][0]) / 2},${(next[1] + pts[(i + 2) % pts.length][1]) / 2}`;
  }).join(" ");
  const nx = cx - 30 + r() * 30;
  const ny = cy - 10;
  return (
    <g>
      <path d={path} fill={p.a} fillOpacity={0.08} stroke={p.a} strokeOpacity={0.7} strokeWidth={3} />
      {[0, 1, 2].map((i) => (
        <ellipse key={`er${i}`} cx={nx} cy={ny} rx={70 + i * 14} ry={52 + i * 11} fill="none" stroke={p.b} strokeOpacity={0.25 - i * 0.05} strokeWidth={2} strokeDasharray="14 10" />
      ))}
      <ellipse cx={nx} cy={ny} rx={56} ry={44} fill={p.b} fillOpacity={0.18} stroke={p.b} strokeOpacity={0.8} strokeWidth={2.5} />
      <circle cx={nx + 12} cy={ny - 6} r={13} fill={p.b} fillOpacity={0.55} />
      {Array.from({ length: 4 }).map((_, i) => {
        const a = r() * Math.PI * 2;
        const d = 105 + r() * 30;
        const x = cx + Math.cos(a) * d * 1.1;
        const y = cy + Math.sin(a) * d * 0.7;
        const rot = r() * 180;
        return (
          <g key={`m${i}`} transform={`rotate(${rot} ${x} ${y})`}>
            <ellipse cx={x} cy={y} rx={26} ry={11} fill={p.c} fillOpacity={0.12} stroke={p.c} strokeOpacity={0.6} strokeWidth={1.6} />
            {[-12, -4, 4, 12].map((dx) => <line key={dx} x1={x + dx} y1={y - 8} x2={x + dx} y2={y + 2} stroke={p.c} strokeOpacity={0.45} strokeWidth={1.2} />)}
          </g>
        );
      })}
      {Array.from({ length: 16 }).map((_, i) => (
        <circle key={`v${i}`} cx={cx + (r() - 0.5) * 300} cy={cy + (r() - 0.5) * 200} r={2 + r() * 4} fill={p.c} fillOpacity={0.25 + r() * 0.3} />
      ))}
    </g>
  );
}

function Mito({ p, r }: { p: Palette; r: () => number }) {
  const cx = W / 2 + (r() - 0.5) * 60;
  const cy = H / 2;
  const rot = -18 + r() * 36;
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={250} ry={110} fill={p.a} fillOpacity={0.08} stroke={p.a} strokeWidth={5} strokeOpacity={0.8} />
      <ellipse cx={cx} cy={cy} rx={232} ry={93} fill={p.a} fillOpacity={0.12} stroke={p.b} strokeWidth={4} strokeOpacity={0.85} />
      {Array.from({ length: 7 }).map((_, i) => {
        const x = cx - 180 + i * 60;
        const top = i % 2 === 0;
        return (
          <path key={i} d={`M${x - 10},${cy + (top ? -88 : 88)} L${x - 10},${cy + (top ? 25 : -25)} Q${x},${cy + (top ? 40 : -40)} ${x + 10},${cy + (top ? 25 : -25)} L${x + 10},${cy + (top ? -88 : 88)}`} fill="none" stroke={p.b} strokeWidth={4} strokeOpacity={0.75} strokeLinejoin="round" />
        );
      })}
      <circle cx={cx + 120} cy={cy + 20} r={12} fill="none" stroke={p.c} strokeWidth={2} strokeOpacity={0.7} />
      {Array.from({ length: 10 }).map((_, i) => <circle key={i} cx={cx + (r() - 0.5) * 380} cy={cy + (r() - 0.5) * 110} r={3} fill={p.c} fillOpacity={0.5} />)}
    </g>
  );
}

function Molecule({ p, r }: { p: Palette; r: () => number }) {
  // Pyranose-like ring: five carbons and one ring oxygen, with OH substituents.
  const cx = W * 0.56;
  const cy = H * 0.5;
  const R = 70 + r() * 10;
  const rot = r() * 60;
  const ring = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 + rot) * Math.PI) / 180;
    return { x: cx + Math.cos(a) * R * 1.15, y: cy + Math.sin(a) * R, el: i === 0 ? "O" : "C" };
  });
  const subs = ring.slice(1).map((at, i) => {
    const a = Math.atan2(at.y - cy, at.x - cx);
    const L = 62;
    return { from: at, x: at.x + Math.cos(a) * L, y: at.y + Math.sin(a) * L, el: i % 2 === 0 ? "O" : "H" };
  });
  const col = (el: string) => (el === "O" ? p.b : el === "H" ? p.c : p.a);
  const rad = (el: string) => (el === "O" ? 15 : el === "H" ? 9 : 17);
  return (
    <g>
      {ring.map((a, i) => {
        const b = ring[(i + 1) % 6];
        return <line key={`r${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={p.c} strokeOpacity={0.6} strokeWidth={5} strokeLinecap="round" />;
      })}
      {subs.map((s, i) => <line key={`s${i}`} x1={s.from.x} y1={s.from.y} x2={s.x} y2={s.y} stroke={p.c} strokeOpacity={0.45} strokeWidth={4} strokeLinecap="round" />)}
      {[...ring, ...subs].map((a, i) => (
        <g key={`a${i}`}>
          <circle cx={a.x} cy={a.y} r={rad(a.el) + 6} fill={col(a.el)} fillOpacity={0.12} />
          <circle cx={a.x} cy={a.y} r={rad(a.el)} fill={col(a.el)} fillOpacity={0.9} />
          <circle cx={a.x - rad(a.el) * 0.35} cy={a.y - rad(a.el) * 0.35} r={rad(a.el) * 0.3} fill="#fff" fillOpacity={0.35} />
        </g>
      ))}
    </g>
  );
}

function Orbital({ p, r }: { p: Palette; r: () => number }) {
  const cx = W * (0.52 + (r() - 0.5) * 0.15);
  const cy = H / 2;
  const L = 95;
  const lobe = (angle: number, len: number, color: string, op: number) => (
    <g transform={`rotate(${angle} ${cx} ${cy})`}>
      <path d={`M${cx},${cy} C${cx + len * 0.35},${cy - len * 0.42} ${cx + len},${cy - len * 0.38} ${cx + len},${cy} C${cx + len},${cy + len * 0.38} ${cx + len * 0.35},${cy + len * 0.42} ${cx},${cy} Z`} fill={color} fillOpacity={op} stroke={color} strokeOpacity={0.7} />
      <path d={`M${cx},${cy} C${cx - len * 0.35},${cy - len * 0.42} ${cx - len},${cy - len * 0.38} ${cx - len},${cy} C${cx - len},${cy + len * 0.38} ${cx - len * 0.35},${cy + len * 0.42} ${cx},${cy} Z`} fill={color} fillOpacity={op * 0.6} stroke={color} strokeOpacity={0.5} />
    </g>
  );
  return (
    <g>
      <circle cx={cx} cy={cy} r={150} fill={p.a} fillOpacity={0.05} stroke={p.a} strokeOpacity={0.15} />
      <circle cx={cx} cy={cy} r={42} fill={p.b} fillOpacity={0.18} />
      {lobe(0, L * 1.3, p.a, 0.22)}
      {lobe(90, L * 1.3, p.b, 0.2)}
      {lobe(35, L * 0.75, p.c, 0.12)}
      <circle cx={cx} cy={cy} r={6} fill={p.c} />
    </g>
  );
}

function Wave({ p, r }: { p: Palette; r: () => number }) {
  const lines = Array.from({ length: 5 }, (_, j) => {
    const amp = 18 + j * 9;
    const k = (2 * Math.PI) / (120 + r() * 60);
    const ph = r() * 6;
    const y0 = H * 0.3 + j * 34;
    let d = "";
    for (let x = 0; x <= W; x += 6) d += `${x ? "L" : "M"}${x},${y0 + amp * Math.sin(k * x + ph) * Math.exp(-((x - W / 2) ** 2) / 90000)}`;
    return <path key={j} d={d} fill="none" stroke={j % 2 ? p.b : p.a} strokeOpacity={0.35 + j * 0.1} strokeWidth={2.5} />;
  });
  const cx = W * 0.2;
  return (
    <g>
      {Array.from({ length: 7 }).map((_, i) => <circle key={i} cx={cx} cy={H / 2} r={30 + i * 34} fill="none" stroke={p.c} strokeOpacity={0.22 - i * 0.025} strokeWidth={1.5} />)}
      {lines}
    </g>
  );
}

function Fluid({ p, r }: { p: Palette; r: () => number }) {
  const neck = 0.42 + r() * 0.12;
  const lines = Array.from({ length: 9 }, (_, j) => {
    const off = (j - 4) / 4;
    let d = "";
    for (let x = 0; x <= W; x += 8) {
      const squeeze = 1 - (1 - neck) * Math.exp(-((x - W / 2) ** 2) / 9000);
      d += `${x ? "L" : "M"}${x},${H / 2 + off * 120 * squeeze}`;
    }
    return <path key={j} d={d} fill="none" stroke={p.a} strokeOpacity={0.25 + (1 - Math.abs(off)) * 0.45} strokeWidth={2.2} />;
  });
  return (
    <g>
      {lines}
      {Array.from({ length: 26 }).map((_, i) => {
        const x = r() * W;
        const squeeze = 1 - (1 - neck) * Math.exp(-((x - W / 2) ** 2) / 9000);
        return <ellipse key={i} cx={x} cy={H / 2 + (r() - 0.5) * 220 * squeeze} rx={7} ry={4} fill={p.b} fillOpacity={0.5} />;
      })}
    </g>
  );
}

function Field({ p, r }: { p: Palette; r: () => number }) {
  const d = 120 + r() * 40;
  const cx = W / 2;
  const cy = H / 2;
  const plus = { x: cx - d, y: cy };
  const minus = { x: cx + d, y: cy };
  return (
    <g>
      {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
        <path key={k} d={`M${plus.x + 14},${cy} Q${cx},${cy + k * 70} ${minus.x - 14},${cy}`} fill="none" stroke={p.a} strokeOpacity={0.55 - Math.abs(k) * 0.08} strokeWidth={2} />
      ))}
      {[-1, 1].map((s) => [30, 60].map((a) => (
        <path key={`${s}${a}`} d={`M${plus.x},${cy} L${plus.x - 140},${cy + s * a * 1.8}`} stroke={p.a} strokeOpacity={0.25} strokeWidth={1.5} />
      )))}
      <circle cx={plus.x} cy={plus.y} r={20} fill={p.a} fillOpacity={0.9} />
      <text x={plus.x} y={plus.y + 8} textAnchor="middle" fontSize="24" fill="#111" fontWeight="700">+</text>
      <circle cx={minus.x} cy={minus.y} r={20} fill={p.b} fillOpacity={0.9} />
      <text x={minus.x} y={minus.y + 8} textAnchor="middle" fontSize="26" fill="#111" fontWeight="700">−</text>
    </g>
  );
}

function Lens({ p, r }: { p: Palette; r: () => number }) {
  const lx = W * 0.45;
  const fx = lx + 150 + r() * 40;
  return (
    <g>
      <path d={`M${lx},${H / 2 - 120} Q${lx + 34},${H / 2} ${lx},${H / 2 + 120} Q${lx - 34},${H / 2} ${lx},${H / 2 - 120} Z`} fill={p.b} fillOpacity={0.18} stroke={p.b} strokeOpacity={0.8} strokeWidth={2} />
      {[-90, -55, -20, 20, 55, 90].map((y) => (
        <g key={y}>
          <line x1={0} y1={H / 2 + y} x2={lx} y2={H / 2 + y} stroke={p.a} strokeOpacity={0.7} strokeWidth={2} />
          <line x1={lx} y1={H / 2 + y} x2={W} y2={H / 2 + y + ((H / 2 - (H / 2 + y)) / (fx - lx)) * (W - lx)} stroke={p.a} strokeOpacity={0.55} strokeWidth={2} />
        </g>
      ))}
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={p.c} strokeOpacity={0.15} strokeDasharray="6 8" />
      <circle cx={fx} cy={H / 2} r={6} fill={p.c} />
    </g>
  );
}

function Neuron({ p, r }: { p: Palette; r: () => number }) {
  const sx = W * 0.3;
  const sy = H * 0.5;
  const branches: ReactNode[] = [];
  const grow = (x: number, y: number, a: number, len: number, depth: number, key: string) => {
    if (depth === 0) return;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    branches.push(<line key={key} x1={x} y1={y} x2={x2} y2={y2} stroke={p.a} strokeOpacity={0.3 + depth * 0.12} strokeWidth={depth * 1.3} strokeLinecap="round" />);
    grow(x2, y2, a - 0.45 + r() * 0.2, len * 0.72, depth - 1, key + "a");
    grow(x2, y2, a + 0.45 - r() * 0.2, len * 0.72, depth - 1, key + "b");
  };
  [2.2, 2.9, 3.6, 4.3].forEach((a, i) => grow(sx, sy, a, 60, 4, `d${i}`));
  return (
    <g>
      {branches}
      <line x1={sx} y1={sy} x2={W - 40} y2={sy + 30} stroke={p.a} strokeOpacity={0.6} strokeWidth={4} />
      {Array.from({ length: 5 }).map((_, i) => {
        const t = 0.18 + i * 0.16;
        const x = sx + (W - 40 - sx) * t;
        const y = sy + 30 * t;
        return <rect key={i} x={x - 22} y={y - 9} width={44} height={18} rx={9} fill={p.b} fillOpacity={0.55} transform={`rotate(${Math.atan2(30, W - 40 - sx) * 57.3} ${x} ${y})`} />;
      })}
      <circle cx={sx} cy={sy} r={30} fill={p.a} fillOpacity={0.35} stroke={p.a} strokeWidth={2} />
      <circle cx={sx + 4} cy={sy - 3} r={11} fill={p.c} fillOpacity={0.6} />
    </g>
  );
}

function Spectrum({ p, uid }: { p: Palette; r: () => number; uid: string }) {
  let d = "";
  for (let x = 0; x <= W; x += 3) {
    const k = 0.012 + (x / W) ** 2 * 0.22;
    d += `${x ? "L" : "M"}${x},${H / 2 + 60 * Math.sin(k * x * 3)}`;
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-spec`} x1="0" x2="1">
          <stop offset="0" stopColor={p.b} stopOpacity="0.4" />
          <stop offset="0.55" stopColor={p.a} />
          <stop offset="1" stopColor={p.c} />
        </linearGradient>
      </defs>
      <rect x={0} y={H / 2 + 100} width={W} height={10} fill={`url(#${uid}-spec)`} opacity={0.7} />
      <path d={d} fill="none" stroke={`url(#${uid}-spec)`} strokeWidth={3} />
    </g>
  );
}

function Lattice({ p, r }: { p: Palette; r: () => number }) {
  const s = 46;
  const ox = (r() - 0.5) * 20;
  const nodes: ReactNode[] = [];
  for (let i = -1; i < 15; i++)
    for (let j = -1; j < 9; j++) {
      const x = i * s + (j % 2) * (s / 2) + ox;
      const y = j * s * 0.86;
      const big = (i + j) % 2 === 0;
      nodes.push(<circle key={`${i}-${j}`} cx={x} cy={y} r={big ? 9 : 5} fill={big ? p.a : p.b} fillOpacity={0.25 + 0.6 * Math.exp(-(((x - W * 0.6) / 260) ** 2 + ((y - H / 2) / 160) ** 2))} />);
    }
  return <g>{nodes}</g>;
}

const MOTIF: Record<CoverMotif, (props: { p: Palette; r: () => number; uid: string }) => ReactNode> = {
  dna: DNA,
  cell: Cell,
  mitochondrion: Mito,
  molecule: Molecule,
  orbital: Orbital,
  wave: Wave,
  fluid: Fluid,
  field: Field,
  lens: Lens,
  neuron: Neuron,
  spectrum: Spectrum,
  lattice: Lattice,
};

export function CoverArt({
  motif,
  seed,
  premium,
  className,
  subject = "multi",
  salt = "",
}: {
  motif: CoverMotif;
  seed: number;
  premium?: boolean;
  className?: string;
  /** Colours the cover by subject (several subjects: "multi"). */
  subject?: CoverSubject;
  /** Any stable string (e.g. the resource id) to vary palette and composition. */
  salt?: string;
}) {
  const id = useId().replace(/:/g, "");
  const { p, content, transform } = useMemo(() => {
    const h = hash(`${salt}:${seed}`);
    const r = rng(seed + motif.length * 17 + (h % 997));
    const options = premium ? GOLD : PALETTES[subject];
    // The seed picks palette and framing, so the catalogue can keep neighbours apart;
    // the hash only jitters the geometry.
    const p = options[seed % options.length];
    // Editorial composition: the motif is enlarged and pushed off-centre (towards
    // the right) so it bleeds off the edge and leaves the lower left calm for the
    // title printed over it. Three framings (wide, macro close-up, quarter turn)
    // times the subject palettes keep two covers with the same motif apart.
    const framing = Math.floor(seed / options.length) % 3;
    const [scale, dx, dy, rot] =
      framing === 1
        ? [1.95 + r() * 0.45, 150 + r() * 80, -30 + r() * 40, -20 + r() * 40]
        : framing === 2
          ? [1.05 + r() * 0.2, 170 + r() * 50, -25 + r() * 30, 80 + r() * 20]
          : [1.18 + r() * 0.32, 90 + r() * 90, -70 + r() * 36, -12 + r() * 24];
    const transform = `translate(${W / 2 + dx} ${H / 2 + dy}) rotate(${rot}) scale(${scale}) translate(${-W / 2} ${-H / 2})`;
    // Motifs are pure render helpers called directly: the RNG is consumed exactly
    // once per memo pass, so server, client and Strict Mode re-renders agree.
    return { p, transform: roundNumbers(transform), content: stabilize(MOTIF[motif]({ p, r, uid: id })) };
  }, [motif, seed, premium, id, subject, salt]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.bg0} />
          <stop offset="1" stopColor={p.bg1} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.72" cy="0.3" r="0.62">
          <stop offset="0" stopColor={p.a} stopOpacity="0.2" />
          <stop offset="1" stopColor={p.a} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.62" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-bg)`} />
      <rect width={W} height={H} fill={`url(#${id}-glow)`} />
      <g transform={transform}>{content}</g>
      <rect width={W} height={H} fill={`url(#${id}-fade)`} />
    </svg>
  );
}
