import { useId } from "react";
import type { StudyMode } from "@/lib/types";
import { cx } from "./cx";

/**
 * Illustrations of the three study modes. Each one draws the shape of its path:
 * FAST one swift trajectory through six checkpoints (its six steps), DEEP a
 * cross-section of ten strata crossed by a probe going down (its ten steps),
 * ULTRA a dense constellation of nine techniques inside an orbit.
 * Two proportions: `wide` (320×112, card header) and `band` (320×64, the short
 * header of the compact cards on phones). Decorative: always aria-hidden, never under text.
 */

type Pt = [number, number];

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
function smooth(points: Pt[]): string {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const FAST_PTS: Pt[] = [
  [26, 90],
  [82, 82],
  [134, 67],
  [184, 52],
  [236, 39],
  [292, 24],
];

const DEEP_LAYERS = Array.from({ length: 10 }, (_, i) => 12 + i * 9.6);

const ULTRA_NODES: Pt[] = [
  [150, 40],
  [186, 26],
  [226, 36],
  [250, 62],
  [214, 74],
  [172, 70],
  [132, 64],
  [198, 50],
  [238, 88],
];
const ULTRA_LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0],
  [7, 0], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [4, 8], [3, 8], [5, 0],
];

/** Draw-in on first paint (the page's single orchestrated moment); disabled by reduced motion globally. */
const DRAW = "[stroke-dasharray:1] [--len:1] animate-[atlas-draw_1.1s_cubic-bezier(0.22,1,0.36,1)_both]";

export function ModeArt({
  mode,
  active = false,
  animate = false,
  shape = "wide",
  className,
}: {
  mode: StudyMode;
  active?: boolean;
  animate?: boolean;
  shape?: "wide" | "band";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const band = shape === "band";
  const H = band ? 64 : 112;
  /** Vertical position in the chosen proportion (the band compresses the drawing around its middle). */
  const Y = (y: number) => (band ? 32 + (y - 57) * 0.5 : y);
  const common = cx("block h-full w-full transition-opacity duration-200", active ? "opacity-100" : "opacity-75", className);
  const svgProps = { viewBox: `0 0 320 ${H}`, preserveAspectRatio: "xMidYMid slice", className: common, "aria-hidden": true, focusable: "false" } as const;

  if (mode === "fast") {
    const pts = FAST_PTS.map(([x, y]) => [x, Y(y)] as Pt);
    const [ex, ey] = pts[pts.length - 1];
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id={`fast-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#2dd4bf" stopOpacity="0.08" />
            <stop offset="0.55" stopColor="#2dd4bf" stopOpacity="0.55" />
            <stop offset="1" stopColor="#5eead4" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* faint graticule: the atlas the trajectory crosses */}
        {(band ? [21, 43] : [28, 56, 84]).map((y) => (
          <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#c4d2ff" strokeOpacity="0.05" />
        ))}
        {/* speed streaks behind the start */}
        {[78, 88, 98].map((y, i) => (
          <line key={y} x1={4 + i * 6} x2={44 - i * 4} y1={Y(y)} y2={Y(y - 2)} stroke="#2dd4bf" strokeOpacity={0.18 - i * 0.04} strokeLinecap="round" />
        ))}
        <path d={smooth(pts)} fill="none" stroke={`url(#fast-${uid})`} strokeWidth="2" strokeLinecap="round" pathLength={1} className={animate ? DRAW : undefined} />
        {pts.slice(0, -1).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#0e1116" stroke="#2dd4bf" strokeOpacity={0.45 + i * 0.1} strokeWidth="1.5" />
        ))}
        <circle cx={ex} cy={ey} r="8" fill="none" stroke="#5eead4" strokeOpacity="0.35" />
        <circle cx={ex} cy={ey} r="4" fill="#5eead4" />
      </svg>
    );
  }

  if (mode === "deep") {
    const layers = band ? Array.from({ length: 10 }, (_, i) => 6 + i * 5.6) : DEEP_LAYERS;
    const wave = band ? 2 : 4;
    const last = layers[layers.length - 1];
    return (
      <svg {...svgProps}>
        <defs>
          <linearGradient id={`deep-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#a5b4fc" stopOpacity="0.2" />
            <stop offset="1" stopColor="#a5b4fc" stopOpacity="1" />
          </linearGradient>
        </defs>
        {layers.map((y, i) => (
          <path
            key={y}
            d={`M0 ${y} C 70 ${y - wave}, 130 ${y + wave}, 200 ${y - wave / 4} S 290 ${y + (wave * 3) / 4}, 320 ${y}`}
            fill="none"
            stroke="#6b8cff"
            strokeOpacity={0.12 + i * 0.05}
            strokeWidth={i > 6 ? 1.4 : 1}
          />
        ))}
        <line x1="236" x2="236" y1="1" y2={last} stroke={`url(#deep-${uid})`} strokeWidth="1.5" pathLength={1} className={animate ? DRAW : undefined} />
        {layers.slice(0, -1).map((y, i) => (
          <circle key={y} cx="236" cy={y - 0.4} r={band ? 1.7 : 2.2} fill="#0e1116" stroke="#a5b4fc" strokeOpacity={0.35 + i * 0.07} />
        ))}
        <circle cx="236" cy={last} r={band ? 5.5 : 7.5} fill="none" stroke="#a5b4fc" strokeOpacity="0.35" />
        <circle cx="236" cy={last} r={band ? 2.8 : 3.6} fill="#a5b4fc" />
      </svg>
    );
  }

  const nodes = ULTRA_NODES.map(([x, y]) => [x, Y(y)] as Pt);
  const k = band ? 0.5 : 1;
  return (
    <svg {...svgProps}>
      <ellipse cx="192" cy={Y(57)} rx="122" ry={36 * k} fill="none" stroke="#e879f9" strokeOpacity="0.28" transform={`rotate(${band ? -5 : -10} 192 ${Y(57)})`} pathLength={1} className={animate ? DRAW : undefined} />
      <ellipse cx="192" cy={Y(57)} rx="84" ry={22 * k} fill="none" stroke="#e879f9" strokeOpacity="0.1" transform={`rotate(${band ? -5 : -10} 192 ${Y(57)})`} />
      {ULTRA_LINKS.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#f0abfc" strokeOpacity={b === 7 || a === 7 ? 0.38 : 0.22} />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 7 ? 4.2 : i % 3 === 0 ? 3 : 2.3} fill={i === 7 ? "#f0abfc" : "#0e1116"} stroke="#e879f9" strokeOpacity={0.55 + (i % 3) * 0.15} strokeWidth="1.4" />
      ))}
      {/* a satellite on the orbit */}
      <circle cx={band ? 71 : 77} cy={band ? 44 : 65} r="3" fill="#e879f9" fillOpacity="0.85" />
    </svg>
  );
}
