"use client";

import { Children, cloneElement, isValidElement, useId, useMemo, type ReactElement, type ReactNode } from "react";
import type { CoverMotif } from "@/lib/types";

// Original generative illustrations used as course covers when no official
// preview is available. They are labelled "Illustrazione ATLAS" in the UI.
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

const PALETTES: Record<CoverMotif, Palette[]> = {
  dna: [
    { bg0: "#04121f", bg1: "#0b2a4a", a: "#56a6ff", b: "#2dd4bf", c: "#e0f2ff" },
    { bg0: "#0b0718", bg1: "#24124a", a: "#a78bfa", b: "#56a6ff", c: "#ede9fe" },
  ],
  cell: [
    { bg0: "#03140f", bg1: "#0b3a2c", a: "#34d399", b: "#56a6ff", c: "#d1fae5" },
    { bg0: "#120716", bg1: "#3b0f3a", a: "#f472b6", b: "#a78bfa", c: "#fce7f3" },
  ],
  mitochondrion: [
    { bg0: "#140a03", bg1: "#3d1d07", a: "#fb923c", b: "#fbbf24", c: "#ffedd5" },
    { bg0: "#03101c", bg1: "#0e2d4f", a: "#56a6ff", b: "#f472b6", c: "#e0f2fe" },
  ],
  molecule: [
    { bg0: "#0a0a12", bg1: "#1f1f3a", a: "#93c5fd", b: "#f87171", c: "#f5f5f7" },
    { bg0: "#071311", bg1: "#123a33", a: "#5eead4", b: "#fb7185", c: "#f0fdfa" },
  ],
  orbital: [
    { bg0: "#05071a", bg1: "#151b4d", a: "#818cf8", b: "#56a6ff", c: "#e0e7ff" },
    { bg0: "#100516", bg1: "#2e0f42", a: "#e879f9", b: "#818cf8", c: "#fae8ff" },
  ],
  wave: [
    { bg0: "#040d18", bg1: "#0c2440", a: "#38bdf8", b: "#818cf8", c: "#e0f2fe" },
    { bg0: "#0f0716", bg1: "#2a1040", a: "#c084fc", b: "#38bdf8", c: "#f3e8ff" },
  ],
  fluid: [
    { bg0: "#020f17", bg1: "#06324a", a: "#22d3ee", b: "#3b82f6", c: "#cffafe" },
    { bg0: "#140508", bg1: "#3f0d16", a: "#f87171", b: "#fb7185", c: "#ffe4e6" },
  ],
  field: [
    { bg0: "#0b0b14", bg1: "#24243f", a: "#facc15", b: "#60a5fa", c: "#fef9c3" },
    { bg0: "#050b14", bg1: "#10233f", a: "#60a5fa", b: "#f472b6", c: "#dbeafe" },
  ],
  lens: [
    { bg0: "#070712", bg1: "#1c1c3a", a: "#fde68a", b: "#a5b4fc", c: "#fffbeb" },
    { bg0: "#03121a", bg1: "#0b3344", a: "#67e8f9", b: "#fde68a", c: "#ecfeff" },
  ],
  neuron: [
    { bg0: "#090514", bg1: "#24113f", a: "#c084fc", b: "#f472b6", c: "#f5f3ff" },
    { bg0: "#041311", bg1: "#0e3b33", a: "#2dd4bf", b: "#a3e635", c: "#f0fdfa" },
  ],
  spectrum: [
    { bg0: "#08080f", bg1: "#1a1a2e", a: "#f472b6", b: "#60a5fa", c: "#ffffff" },
    { bg0: "#0a0806", bg1: "#2a2118", a: "#fbbf24", b: "#f472b6", c: "#fffbeb" },
  ],
  lattice: [
    { bg0: "#06090f", bg1: "#152238", a: "#93c5fd", b: "#a78bfa", c: "#eff6ff" },
    { bg0: "#0d0a05", bg1: "#33270f", a: "#fcd34d", b: "#fb923c", c: "#fffbeb" },
  ],
};

const GOLD: Palette = { bg0: "#0c0904", bg1: "#2e2209", a: "#efc55c", b: "#f6dc8f", c: "#fff8e1" };

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
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="0.25" stopColor="#f59e0b" />
          <stop offset="0.45" stopColor="#22c55e" />
          <stop offset="0.65" stopColor="#3b82f6" />
          <stop offset="0.85" stopColor="#8b5cf6" />
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

export function CoverArt({ motif, seed, premium, className }: { motif: CoverMotif; seed: number; premium?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const { p, content } = useMemo(() => {
    const r = rng(seed + motif.length * 17);
    const options = PALETTES[motif];
    const base = options[seed % options.length];
    const p = premium ? { ...base, ...GOLD, a: GOLD.a, b: base.a, c: GOLD.c } : base;
    // Motifs are pure render helpers called directly: the RNG is consumed exactly
    // once per memo pass, so server, client and Strict Mode re-renders agree.
    return { p, content: stabilize(MOTIF[motif]({ p, r, uid: id })) };
  }, [motif, seed, premium, id]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.bg0} />
          <stop offset="1" stopColor={p.bg1} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.7" cy="0.35" r="0.7">
          <stop offset="0" stopColor={p.a} stopOpacity="0.28" />
          <stop offset="1" stopColor={p.a} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0 H0 V32" fill="none" stroke="#fff" strokeOpacity="0.035" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-bg)`} />
      <rect width={W} height={H} fill={`url(#${id}-grid)`} />
      <rect width={W} height={H} fill={`url(#${id}-glow)`} />
      {content}
      <rect width={W} height={H} fill={`url(#${id}-fade)`} />
    </svg>
  );
}
