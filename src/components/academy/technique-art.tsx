"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Technique } from "@/data/academy";
import { cn } from "@/lib/utils";

/**
 * Study Academy illustrations, one per technique, drawn with the real content
 * of the examples (Krebs, buffers, fluids). Every drawing is split into layers
 * that match the steps of the tutorial:
 * - without `step` the full drawing is static; inside a `.group` (an index card)
 *   its strokes draw once on hover or keyboard focus, never in a loop;
 * - with `step` the layers before it are dimmed, the current one is drawn once
 *   and the next ones stay as a faint preview.
 * Motion is CSS only, so the global reduced-motion rules switch it off.
 */

const AZ = "#3d8bff"; // azure-400
const AZL = "#8db9ff"; // azure-300
const FG = "#eceef3";
const MU = "#a7adbb";
const SUB = "#868d9e";
const LN = "rgba(196,210,255,0.2)";
const FILL = "rgba(196,210,255,0.035)";
const SURF = "#11141a";
const OK = "#4ade80";
const WARN = "#fb923c";
const WARN_TEXT = "#fdba74";

const CSS = `
.ta-step .ta-current .ta-draw{animation:atlas-draw .8s cubic-bezier(.22,1,.36,1) backwards}
.group:hover .ta-hover .ta-draw,.group:focus-visible .ta-hover .ta-draw,.group:focus-within .ta-hover .ta-draw{animation:atlas-draw .9s cubic-bezier(.22,1,.36,1) backwards}
`;

const StepCtx = createContext<number | undefined>(undefined);

/** One step of the drawing. */
function L({ i, children }: { i: number; children: ReactNode }) {
  const step = useContext(StepCtx);
  if (step === undefined) return <g>{children}</g>;
  const state = i < step ? "done" : i === step ? "current" : "next";
  return (
    <g
      className={cn("transition-opacity duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]", state === "current" && "ta-current")}
      style={{ opacity: state === "next" ? 0.1 : state === "done" ? 0.5 : 1 }}
    >
      {children}
    </g>
  );
}

function T({
  x,
  y,
  children,
  size = 11,
  anchor = "start",
  fill = MU,
  weight,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  weight?: number;
}) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={fill} fontWeight={weight}>
      {children}
    </text>
  );
}

/** A stroke that draws itself (once) when its step becomes current or the card is hovered. */
function Draw({ d, len, stroke = AZ, width = 1.6, dash, fill = "none" }: { d: string; len: number; stroke?: string; width?: number; dash?: string; fill?: string }) {
  if (dash) return <path d={d} fill={fill} stroke={stroke} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ta-draw"
      style={{ strokeDasharray: len, ["--len" as string]: len }}
    />
  );
}

function Box({ x, y, w, h, rx = 8, stroke = LN, fill = FILL, dash }: { x: number; y: number; w: number; h: number; rx?: number; stroke?: string; fill?: string; dash?: string }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeDasharray={dash} />;
}

function Check({ x, y, color = OK }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="7.5" fill={color} fillOpacity="0.16" stroke={color} strokeOpacity="0.8" />
      <path d={`M${x - 3.2} ${y + 0.2} l2.2 2.3 l4.2 -4.6`} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Cross({ x, y, color = WARN }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="7.5" fill={color} fillOpacity="0.16" stroke={color} strokeOpacity="0.8" />
      <path d={`M${x - 2.6} ${y - 2.6} l5.2 5.2 M${x + 2.6} ${y - 2.6} l-5.2 5.2`} stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

function Arrowhead({ x, y, dir, color = AZ }: { x: number; y: number; dir: "r" | "l" | "d" | "u"; color?: string }) {
  const d = {
    r: `M${x - 6} ${y - 4} L${x} ${y} L${x - 6} ${y + 4}`,
    l: `M${x + 6} ${y - 4} L${x} ${y} L${x + 6} ${y + 4}`,
    d: `M${x - 4} ${y - 6} L${x} ${y} L${x + 4} ${y - 6}`,
    u: `M${x - 4} ${y + 6} L${x} ${y} L${x + 4} ${y + 6}`,
  }[dir];
  return <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />;
}

// ── Feynman: choose → explain → find the gap → back to the source → simplify ──
function Feynman() {
  return (
    <>
      <L i={0}>
        <Box x={16} y={16} w={124} h={64} rx={10} />
        <T x={28} y={34} fill={SUB}>Metabolismo</T>
        <rect x={28} y={44} width={100} height={26} rx={13} fill={AZ} fillOpacity="0.14" stroke={AZ} strokeOpacity="0.7" />
        <T x={78} y={61} anchor="middle" fill={FG}>Ciclo di Krebs</T>
      </L>
      <L i={1}>
        <Box x={150} y={16} w={154} h={78} rx={10} />
        <T x={162} y={37} fill={FG}>L’acetil-CoA entra</T>
        <T x={162} y={54} fill={FG}>nel ciclo e libera</T>
        <T x={162} y={71} fill={FG}>NADH, FADH₂, CO₂</T>
        <rect x={28} y={104} width={34} height={44} rx={4} fill={FILL} stroke={MU} strokeOpacity="0.7" />
        <line x1={34} y1={104} x2={34} y2={148} stroke={MU} strokeOpacity="0.7" />
        <T x={70} y={130} fill={SUB}>libro chiuso</T>
      </L>
      <L i={2}>
        <path d="M162 76 q4 4 8 0 t8 0 t8 0 t8 0" fill="none" stroke={WARN} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx={292} cy={30} r={9} fill={WARN} fillOpacity="0.2" stroke={WARN} />
        <T x={292} y={34} anchor="middle" fill={WARN_TEXT} weight={700}>?</T>
        <T x={150} y={108} fill={WARN_TEXT}>Lacuna: perché serve l’O₂?</T>
      </L>
      <L i={3}>
        <Draw d="M64 140 C104 150 132 128 158 116" len={110} />
        <Arrowhead x={158} y={116} dir="r" />
        <T x={28} y={166} fill={SUB}>torna alla fonte</T>
      </L>
      <L i={4}>
        <Box x={166} y={122} w={138} h={46} rx={10} stroke={AZ} fill="rgba(61,139,255,0.08)" />
        <T x={176} y={141} fill={FG}>Senza O₂ il NADH</T>
        <T x={176} y={158} fill={FG}>non si riossida</T>
        <Check x={292} y={134} />
      </L>
    </>
  );
}

// ── Memory palace: the same house and route as the exercise ──
const PAL_ROOMS = [
  { x: 16, y: 20, name: "Cucina" },
  { x: 82, y: 20, name: "Studio" },
  { x: 148, y: 20, name: "Balcone" },
  { x: 16, y: 90, name: "Ingresso" },
  { x: 82, y: 90, name: "Soggiorno" },
  { x: 148, y: 90, name: "Camera" },
];
const PAL_DOTS: [number, number][] = [
  [38, 142],
  [60, 56],
  [115, 56],
  [115, 128],
  [181, 128],
  [181, 56],
];

function Palace() {
  return (
    <>
      <L i={0}>
        {PAL_ROOMS.map((r) => (
          <g key={r.name}>
            <rect x={r.x} y={r.y} width={66} height={70} fill={FILL} stroke={LN} />
            <T x={r.x + 6} y={r.y + 15} fill={SUB}>{r.name}</T>
          </g>
        ))}
      </L>
      <L i={1}>
        <Draw d="M38 142 H60 V56 H115 V128 H181 V56" len={420} stroke={AZL} />
        {PAL_DOTS.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={9} fill={SURF} stroke={AZL} />
            <T x={x} y={y + 4} anchor="middle" fill={FG} size={11}>{i + 1}</T>
          </g>
        ))}
      </L>
      <L i={2}>
        <Box x={226} y={20} w={80} h={62} rx={10} stroke={AZ} fill="rgba(61,139,255,0.08)" />
        <T x={234} y={38} fill={SUB}>citrato =</T>
        <T x={234} y={55} fill={FG}>due ospiti</T>
        <T x={234} y={71} fill={FG}>e un limone</T>
      </L>
      <L i={3}>
        {PAL_DOTS.slice(0, 3).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={9} fill={AZ} fillOpacity="0.35" stroke={AZ} />
        ))}
        <T x={226} y={106} fill={FG}>1 citrato</T>
        <T x={226} y={124} fill={FG}>2 CO₂ × 2</T>
        <T x={226} y={142} fill={FG}>3 NADH × 3</T>
      </L>
      <L i={4}>
        <Check x={296} y={102} />
        <Check x={296} y={120} />
        <circle cx={296} cy={138} r={7.5} fill="none" stroke={MU} strokeDasharray="2 2" />
        <T x={306} y={174} anchor="end" fill={SUB}>ripercorri a memoria</T>
      </L>
    </>
  );
}

// ── Active recall: study a block → close → recall → compare → repeat ──
function Recall() {
  return (
    <>
      <L i={0}>
        <Box x={16} y={18} w={126} h={142} />
        <T x={28} y={38} fill={FG} size={12} weight={600}>Tamponi</T>
        <rect x={22} y={46} width={114} height={54} rx={6} fill="rgba(61,139,255,0.08)" stroke={AZ} strokeOpacity="0.6" />
        <T x={28} y={63} fill={MU}>pH = pKa + log…</T>
        <T x={28} y={79} fill={MU}>bicarbonato</T>
        <T x={28} y={94} fill={MU}>pKa 6,1</T>
        <T x={28} y={122} fill={SUB}>capacità</T>
        <T x={28} y={138} fill={SUB}>tamponante…</T>
      </L>
      <L i={1}>
        <rect x={16} y={18} width={126} height={142} rx={8} fill={SURF} fillOpacity="0.94" stroke={LN} />
        <path d="M66 82 c8 -8 18 -8 26 0 c-8 8 -18 8 -26 0 z M64 92 l30 -22" fill="none" stroke={MU} strokeWidth="1.5" strokeLinecap="round" />
        <T x={79} y={112} anchor="middle" fill={SUB}>fonti chiuse</T>
      </L>
      <L i={2}>
        <Box x={156} y={18} w={148} h={98} stroke={AZ} fill="rgba(61,139,255,0.06)" />
        <T x={168} y={36} fill={SUB}>A memoria</T>
        <T x={168} y={56} fill={FG}>pH = pKa + log(A⁻/HA)</T>
        <T x={168} y={76} fill={FG}>pKa 7,4</T>
        <T x={168} y={96} fill={FG}>sistema aperto</T>
      </L>
      <L i={3}>
        <Check x={296} y={52} />
        <line x1={166} y1={72} x2={210} y2={72} stroke={WARN} strokeWidth="1.6" />
        <T x={218} y={76} fill={WARN_TEXT}>→ 6,1</T>
        <Check x={296} y={92} />
      </L>
      <L i={4}>
        {["oggi", "+1", "+3", "+7"].map((d, i) => (
          <g key={d}>
            <rect x={156 + i * 38} y={130} width={34} height={24} rx={6} fill={i === 0 ? AZ : FILL} fillOpacity={i === 0 ? 0.3 : 1} stroke={i === 0 ? AZ : LN} />
            <T x={173 + i * 38} y={146} anchor="middle" fill={FG}>{d}</T>
          </g>
        ))}
        <T x={156} y={172} fill={SUB}>giorni di ripasso</T>
      </L>
    </>
  );
}

// ── Spaced repetition: forgetting curve → reviews → honest rating → every day ──
function Spacing() {
  return (
    <>
      <line x1={24} y1={140} x2={304} y2={140} stroke={LN} />
      <line x1={24} y1={20} x2={24} y2={140} stroke={LN} />
      <T x={30} y={18} fill={SUB}>ricordo</T>
      <L i={0}>
        <path d="M24 26 C52 104 96 128 300 134" fill="none" stroke={MU} strokeWidth="1.5" strokeDasharray="4 4" />
        <T x={300} y={126} anchor="end" fill={SUB}>senza ripasso</T>
      </L>
      <L i={1}>
        <Draw d="M24 26 C36 66 48 78 62 82 L62 26 C84 58 104 66 124 68 L124 26 C164 46 194 50 222 52 L222 26 C256 34 282 37 304 39" len={560} />
        {[62, 124, 222].map((x) => (
          <circle key={x} cx={x} cy={26} r={3.5} fill={AZ} />
        ))}
        <T x={62} y={156} anchor="middle" fill={SUB}>1</T>
        <T x={124} y={156} anchor="middle" fill={SUB}>3</T>
        <T x={222} y={156} anchor="middle" fill={SUB}>7</T>
        <T x={304} y={156} anchor="end" fill={SUB}>giorni</T>
      </L>
      <L i={2}>
        {["Difficile", "Buono", "Facile"].map((r, i) => (
          <g key={r}>
            <rect x={150 + i * 52} y={84} width={48} height={22} rx={6} fill={i === 0 ? AZ : FILL} fillOpacity={i === 0 ? 0.3 : 1} stroke={i === 0 ? AZ : LN} />
            <T x={174 + i * 52} y={99} anchor="middle" fill={FG}>{r}</T>
          </g>
        ))}
      </L>
      <L i={3}>
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={24 + i * 11} y={164} width={8} height={8} rx={2} fill={AZ} fillOpacity={0.35 + i * 0.07} />
        ))}
        <T x={130} y={172} fill={SUB}>15–20 minuti ogni giorno</T>
      </L>
    </>
  );
}

// ── Interleaving: blocked → mixed → classify first → learn from the error ──
const TILE_FILL: Record<string, [string, number]> = { C: [AZ, 0.5], B: [AZL, 0.28], P: [MU, 0.18] };

function Tiles({ row, y }: { row: string; y: number }) {
  return (
    <>
      {row.split("").map((c, i) => (
        <g key={i}>
          <rect x={16 + i * 32} y={y} width={26} height={26} rx={6} fill={TILE_FILL[c][0]} fillOpacity={TILE_FILL[c][1]} stroke={TILE_FILL[c][0]} strokeOpacity="0.6" />
          <T x={29 + i * 32} y={y + 17} anchor="middle" fill={FG} weight={600}>{c}</T>
        </g>
      ))}
    </>
  );
}

function Interleaving() {
  return (
    <>
      <T x={16} y={18} fill={SUB}>C continuità, B Bernoulli, P Poiseuille</T>
      <L i={0}>
        <T x={16} y={40} fill={MU}>A blocchi</T>
        <Tiles row="CCCBBBPPP" y={46} />
      </L>
      <L i={1}>
        <T x={16} y={98} fill={MU}>Mescolati</T>
        <Tiles row="CBPBCPPCB" y={104} />
      </L>
      <L i={2}>
        <rect x={77} y={101} width={32} height={32} rx={8} fill="none" stroke={AZL} strokeWidth="2" />
        <T x={16} y={154} fill={FG}>Raggio e Δp: prima riconosci Poiseuille</T>
      </L>
      <L i={3}>
        <Cross x={135} y={104} />
        <T x={16} y={172} fill={WARN_TEXT}>Errore utile: la sezione cambiava</T>
      </L>
    </>
  );
}

// ── Dual coding: words → drawing → labels → redraw from memory ──
function Dual() {
  return (
    <>
      <L i={0}>
        <Box x={16} y={22} w={122} h={84} />
        <T x={28} y={42} fill={SUB}>A parole</T>
        <T x={28} y={62} fill={FG}>due membrane</T>
        <T x={28} y={79} fill={FG}>creste interne</T>
        <T x={28} y={96} fill={FG}>ATP sintasi</T>
      </L>
      <L i={1}>
        <Draw d="M164 70 a68 44 0 1 0 136 0 a68 44 0 1 0 -136 0" len={380} stroke={AZL} />
        <Draw d="M176 70 a56 32 0 1 0 112 0 a56 32 0 1 0 -112 0" len={300} stroke={AZ} width={1.3} />
        {[
          [200, 43, 72],
          [218, 97, 68],
          [236, 38, 70],
          [254, 98, 70],
        ].map(([x, a, b], i) => (
          <line key={i} x1={x} y1={a} x2={x} y2={b} stroke={AZ} strokeWidth="1.3" strokeLinecap="round" />
        ))}
        <circle cx={271} cy={46} r={4} fill={AZ} />
      </L>
      <L i={2}>
        <path d="M138 58 L166 62" stroke={MU} strokeDasharray="3 3" />
        <path d="M138 75 L198 62" stroke={MU} strokeDasharray="3 3" />
        <path d="M138 92 C200 120 250 90 268 50" fill="none" stroke={MU} strokeDasharray="3 3" />
      </L>
      <L i={3}>
        <T x={16} y={140} fill={FG}>Ridisegna senza guardare</T>
        <T x={16} y={158} fill={SUB}>e spiegalo ad alta voce</T>
        <ellipse cx={252} cy={150} rx={46} ry={20} fill="none" stroke={MU} strokeDasharray="4 4" />
      </L>
    </>
  );
}

// ── Elaboration: statement → why? → check → connect ──
function Why() {
  return (
    <>
      <L i={0}>
        <Box x={16} y={14} w={288} h={30} />
        <T x={28} y={33} fill={FG}>Il FADH₂ rende meno ATP del NADH</T>
      </L>
      <L i={1}>
        <rect x={16} y={56} width={74} height={26} rx={13} fill={AZ} fillOpacity="0.14" stroke={AZ} strokeOpacity="0.7" />
        <T x={53} y={73} anchor="middle" fill={AZL}>Perché?</T>
        <T x={100} y={73} fill={SUB}>Ipotesi: entra più avanti?</T>
      </L>
      <L i={2}>
        <Box x={16} y={94} w={288} h={30} stroke="rgba(74,222,128,0.45)" />
        <T x={28} y={113} fill={FG}>Cede e⁻ al complesso II, che non pompa H⁺</T>
        <Check x={290} y={109} />
      </L>
      <L i={3}>
        <Draw d="M60 124 V142 M160 124 V142 M250 124 V142" len={60} stroke={MU} width={1.2} />
        {[
          [16, 92, "gradiente H⁺"],
          [116, 86, "ATP sintasi"],
          [210, 94, "e se pompasse?"],
        ].map(([x, w, label]) => (
          <g key={label as string}>
            <rect x={x as number} y={142} width={w as number} height={24} rx={12} fill={FILL} stroke={LN} />
            <T x={(x as number) + (w as number) / 2} y={158} anchor="middle" fill={FG}>{label}</T>
          </g>
        ))}
      </L>
    </>
  );
}

// ── Self-explanation: worked example → cover the next step → explain → compare ──
function SelfExplain() {
  const rows = ["Glucosio → 2 piruvati", "2 NADH × 2,5", "= 5 ATP"];
  return (
    <>
      <L i={0}>
        {rows.map((r, i) => (
          <g key={r}>
            <rect x={16} y={14 + i * 32} width={172} height={26} rx={6} fill={FILL} stroke={LN} />
            <T x={26} y={31 + i * 32} fill={SUB}>{i + 1}</T>
            <T x={42} y={31 + i * 32} fill={FG}>{r}</T>
          </g>
        ))}
      </L>
      <L i={1}>
        <rect x={16} y={78} width={172} height={26} rx={6} fill={SURF} stroke={AZ} strokeDasharray="4 3" />
        <T x={102} y={95} anchor="middle" fill={SUB}>prevedi il passaggio</T>
      </L>
      <L i={2}>
        <Draw d="M188 59 H200" len={14} stroke={MU} width={1.2} />
        <Box x={200} y={38} w={104} h={42} rx={10} stroke={AZ} fill="rgba(61,139,255,0.08)" />
        <T x={210} y={55} fill={FG}>Perché 2 NADH?</T>
        <T x={210} y={71} fill={AZL}>uno per piruvato</T>
      </L>
      <L i={3}>
        <Box x={16} y={120} w={288} h={46} />
        <T x={28} y={139} fill={FG}>Modello: 2 piruvati, quindi 2 NADH</T>
        <T x={28} y={156} fill={SUB}>annota dove la tua spiegazione differiva</T>
        <Check x={290} y={134} />
      </L>
    </>
  );
}

// ── Cornell: notes → cue questions → summary → cover and answer ──
function Cornell() {
  return (
    <>
      <rect x={34} y={12} width={252} height={158} rx={8} fill={FILL} stroke={LN} />
      <line x1={112} y1={12} x2={112} y2={124} stroke={AZ} strokeOpacity="0.45" />
      <line x1={34} y1={124} x2={286} y2={124} stroke={AZ} strokeOpacity="0.45" />
      <L i={0}>
        <T x={122} y={34} fill={FG}>HCO₃⁻ / CO₂, pKa 6,1</T>
        <T x={122} y={54} fill={FG}>sistema aperto</T>
        <T x={122} y={74} fill={FG}>polmoni: pCO₂</T>
        <T x={122} y={94} fill={FG}>reni: HCO₃⁻</T>
      </L>
      <L i={1}>
        <T x={42} y={34} fill={AZL}>Perché</T>
        <T x={42} y={50} fill={AZL}>pKa 6,1?</T>
        <T x={42} y={78} fill={AZL}>Chi regola</T>
        <T x={42} y={94} fill={AZL}>il pH?</T>
      </L>
      <L i={2}>
        <T x={42} y={144} fill={FG}>Il pH dipende da HCO₃⁻/CO₂,</T>
        <T x={42} y={160} fill={FG}>regolato da polmoni e reni</T>
      </L>
      <L i={3}>
        <rect x={113} y={13} width={172} height={110} fill={SURF} fillOpacity="0.96" />
        <T x={199} y={72} anchor="middle" fill={SUB}>appunti coperti</T>
        <rect x={38} y={21} width={70} height={36} rx={6} fill="none" stroke={AZ} strokeWidth="1.6" />
      </L>
    </>
  );
}

// ── Concept map: concepts → labelled links → compare ──
function MapNode({ x, y, w, label, dash, stroke = LN }: { x: number; y: number; w: number; label: string; dash?: boolean; stroke?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={28} rx={8} fill={SURF} stroke={stroke} strokeDasharray={dash ? "4 3" : undefined} />
      <T x={x + w / 2} y={y + 18} anchor="middle" fill={FG}>{label}</T>
    </g>
  );
}

function ConceptMapArt() {
  return (
    <>
      <L i={0}>
        <MapNode x={14} y={36} w={78} label="Glucosio" />
        <MapNode x={122} y={36} w={78} label="Piruvato" />
        <MapNode x={230} y={36} w={78} label="Acetil-CoA" />
        <MapNode x={122} y={112} w={78} label="NADH" />
        <MapNode x={222} y={112} w={90} label="Ciclo di Krebs" />
      </L>
      <L i={1}>
        <Draw d="M92 50 H120" len={30} />
        <Arrowhead x={120} y={50} dir="r" />
        <T x={106} y={28} anchor="middle" fill={MU}>glicolisi</T>
        <Draw d="M200 50 H228" len={30} />
        <Arrowhead x={228} y={50} dir="r" />
        <T x={214} y={28} anchor="middle" fill={MU}>PDH</T>
        <Draw d="M268 64 V110" len={48} />
        <Arrowhead x={268} y={110} dir="d" />
        <T x={262} y={92} anchor="end" fill={MU}>+ ossalacetato</T>
        <Draw d="M222 126 H202" len={22} />
        <Arrowhead x={202} y={126} dir="l" />
        <T x={212} y={156} anchor="middle" fill={MU}>produce</T>
      </L>
      <L i={2}>
        <MapNode x={14} y={112} w={84} label="Catena resp." dash stroke={WARN} />
        <path d="M122 126 H100" stroke={WARN} strokeWidth="1.6" strokeDasharray="4 3" />
        <Arrowhead x={100} y={126} dir="l" color={WARN} />
        <T x={14} y={160} fill={WARN_TEXT}>collegamento mancante</T>
        <Check x={150} y={24} />
      </L>
    </>
  );
}

// ── Oral exam: topic → answer against the clock → grid → retry the gaps ──
function Oral() {
  return (
    <>
      <L i={0}>
        <Box x={16} y={14} w={176} h={30} />
        <T x={28} y={33} fill={FG}>Fosforilazione ossidativa</T>
      </L>
      <L i={1}>
        <circle cx={258} cy={46} r={28} fill="none" stroke={LN} strokeWidth="4" />
        <Draw d="M258 18 a28 28 0 1 1 -24.2 42" len={140} width={4} />
        <T x={258} y={51} anchor="middle" fill={FG} size={14} weight={600}>1:30</T>
        <Box x={16} y={54} w={176} h={30} stroke={AZ} fill="rgba(61,139,255,0.08)" />
        <T x={28} y={73} fill={FG}>«E con l’oligomicina?»</T>
      </L>
      <L i={2}>
        <Check x={24} y={104} />
        <T x={38} y={108} fill={FG}>gradiente di H⁺</T>
        <Check x={24} y={126} />
        <T x={38} y={130} fill={FG}>ATP sintasi bloccata</T>
        <Cross x={24} y={148} />
        <T x={38} y={152} fill={FG}>consumo di O₂ che cala</T>
      </L>
      <L i={3}>
        <Draw d="M170 148 H204" len={36} stroke={MU} width={1.2} />
        <Arrowhead x={204} y={148} dir="r" color={MU} />
        <rect x={208} y={136} width={96} height={26} rx={13} fill={AZ} fillOpacity="0.14" stroke={AZ} strokeOpacity="0.7" />
        <T x={256} y={153} anchor="middle" fill={AZL}>ripassa e riprova</T>
      </L>
    </>
  );
}

const ART: Record<Technique["icon"], () => ReactNode> = {
  feather: Feynman,
  castle: Palace,
  repeat: Recall,
  calendar: Spacing,
  shuffle: Interleaving,
  image: Dual,
  help: Why,
  message: SelfExplain,
  notebook: Cornell,
  network: ConceptMapArt,
  mic: Oral,
};

/**
 * Illustration of a technique. Decorative by default (`aria-hidden`); the
 * technique page wraps it in a <figure> whose caption describes the step.
 * `step` (0-based) highlights that step of the tutorial.
 */
export function TechniqueArt({ icon, className, step }: { icon: Technique["icon"]; className?: string; step?: number }) {
  const Comp = ART[icon];
  return (
    <div className={cn("overflow-hidden", className)}>
      <style href="atlas-technique-art" precedence="default">
        {CSS}
      </style>
      <svg viewBox="0 0 320 180" className={cn("block h-full w-full", step === undefined ? "ta-hover" : "ta-step")} aria-hidden>
        <StepCtx.Provider value={step}>
          <Comp />
        </StepCtx.Provider>
      </svg>
    </div>
  );
}
