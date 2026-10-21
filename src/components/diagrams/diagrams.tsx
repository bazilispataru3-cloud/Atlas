"use client";

import { useId, useMemo, type ReactNode } from "react";
import { LineChart } from "@/components/ui/charts";
import type { Lesson } from "@/lib/types";

// Scientific diagrams drawn as SVG. Geometry and labels follow standard textbook
// conventions (OpenStax Biology 2e, Chemistry 2e, College Physics 2e).
//
// Legibility rule: text inside an SVG shrinks with the drawing, so labels are
// numbered callouts keyed to an HTML legend (the anatomical-atlas convention),
// and any longer text lives in HTML. Callouts and the few in-drawing symbols
// (5′/3′, p₁…) are sized for a 390px phone and scaled down from `sm`, so they
// render at 12px or more at every width. No gold: in ATLAS gold means premium.

const INK = "#eceef3";
const MUTED = "#a7adbb";
const LINE = "rgba(236,238,243,0.5)";
const SURFACE = "#0d1016";

/** Phone-sized in-drawing elements, reduced from `sm` around their own centre. */
const SCALE_SM = "[transform-box:fill-box] [transform-origin:center] sm:[transform:scale(0.62)] xl:[transform:scale(0.5)]";
const SCALE_SM_LEFT = "[transform-box:fill-box] [transform-origin:0%_50%] sm:[transform:scale(0.6)] xl:[transform:scale(0.48)]";

/**
 * Numbered callout. (x, y) is the marker; (tx, ty) the point on the structure,
 * joined by a hairline that starts under the marker, so it stays attached when
 * the marker is scaled down.
 */
function Callout({ n, x, y, tx, ty }: { n: number; x: number; y: number; tx?: number; ty?: number }) {
  return (
    <g>
      {tx !== undefined && ty !== undefined && (
        <>
          <line x1={x} y1={y} x2={tx} y2={ty} stroke={LINE} strokeWidth="1.5" />
          <circle cx={tx} cy={ty} r="3" fill={INK} />
        </>
      )}
      <g className={SCALE_SM}>
        <circle cx={x} cy={y} r="20" fill={SURFACE} stroke={INK} strokeWidth="2" />
        <text x={x} y={y} dy="0.36em" textAnchor="middle" fontSize="28" fontWeight="600" fill={INK}>
          {n}
        </text>
      </g>
    </g>
  );
}

/** Legend for numbered callouts: real text, readable and selectable at any width. */
function CalloutLegend({ items, label }: { items: ReactNode[]; label: string }) {
  return (
    <ol aria-label={label} className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-sm leading-snug text-fg-reading">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/40 text-xs font-semibold tabular-nums text-fg" aria-hidden>
            {i + 1}
          </span>
          <span className="min-w-0 pt-0.5">{it}</span>
        </li>
      ))}
    </ol>
  );
}

/** Colour key: a swatch carries the identity, the words carry the meaning. */
function SwatchLegend({ items, label }: { items: { swatch: ReactNode; text: ReactNode }[]; label: string }) {
  return (
    <ul aria-label={label} className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.07] pt-4 text-ui text-fg-muted">
      {items.map((it, i) => (
        <li key={i} className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-flex w-6 shrink-0 justify-center">
            {it.swatch}
          </span>
          {it.text}
        </li>
      ))}
    </ul>
  );
}

const line = (color: string, height = 4) => <span className="block w-6 rounded-full" style={{ height, background: color }} />;
const dot = (color: string, ring = false) => (
  <span className="block h-3 w-3 rounded-full" style={ring ? { border: `2px solid ${color}` } : { background: color }} />
);

/** Mitochondrion in longitudinal section. Exported hotspots are reused by the labelling exercise. */
export const MITO_PARTS = [
  { id: "esterna", label: "Membrana esterna", x: 210, y: 64 },
  { id: "intermembrana", label: "Spazio intermembrana", x: 300, y: 74 },
  { id: "interna", label: "Membrana interna", x: 470, y: 84 },
  { id: "creste", label: "Cresta", x: 250, y: 150 },
  { id: "matrice", label: "Matrice", x: 360, y: 175 },
  { id: "atpsintasi", label: "ATP sintasi", x: 432, y: 106 },
  { id: "mtdna", label: "mtDNA", x: 520, y: 175 },
  { id: "ribosomi", label: "Ribosomi mitocondriali", x: 600, y: 205 },
] as const;

const ATP = "#5eead4";
const MTDNA = "#f472b6";

/** The organelle itself (shared by the labelled diagram and the labelling exercise, same coordinates). */
function MitochondrionShape({ id, highlight }: { id: string; highlight?: string | null }) {
  const cristae = [150, 225, 300, 375, 450, 525, 600];
  return (
    <>
      <defs>
        <radialGradient id={`${id}-mx`} cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stopColor="#1b3a6b" />
          <stop offset="100%" stopColor="#0f2240" />
        </radialGradient>
        <clipPath id={`${id}-in`}>
          <ellipse cx="380" cy="160" rx="290" ry="92" />
        </clipPath>
      </defs>
      {/* outer membrane */}
      <ellipse cx="380" cy="160" rx="312" ry="112" fill="rgba(86,166,255,0.06)" stroke="#8fc4ff" strokeWidth="5" opacity={highlight && highlight !== "esterna" ? 0.5 : 1} />
      {/* intermembrane space */}
      <ellipse cx="380" cy="160" rx="300" ry="100" fill="#0a1426" />
      {/* matrix with inner membrane */}
      <ellipse cx="380" cy="160" rx="290" ry="92" fill={`url(#${id}-mx)`} stroke="#56a6ff" strokeWidth="4" />
      {/* cristae: lamellar folds of the inner membrane, alternating from top and bottom */}
      <g clipPath={`url(#${id}-in)`}>
        {cristae.map((x, i) => {
          const fromTop = i % 2 === 0;
          const y0 = fromTop ? 60 : 260;
          const y1 = fromTop ? 175 : 145;
          return (
            <path
              key={x}
              d={`M${x - 12},${y0} L${x - 12},${y1} Q${x},${y1 + (fromTop ? 16 : -16)} ${x + 12},${y1} L${x + 12},${y0}`}
              fill="#0a1426"
              stroke="#56a6ff"
              strokeWidth="4"
              strokeLinejoin="round"
              opacity={highlight && highlight !== "creste" && highlight !== "interna" ? 0.6 : 1}
            />
          );
        })}
      </g>
      {/* ATP synthase: F0 in the inner membrane, F1 head protruding into the matrix */}
      {[[432, 98], [358, 236], [508, 236]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 4} y={y - 2} width="8" height="10" rx="2" fill={ATP} />
          <circle cx={x} cy={i === 0 ? y + 16 : y - 12} r="7" fill={ATP} />
        </g>
      ))}
      {/* mtDNA: circular molecules */}
      <circle cx="520" cy="175" r="11" fill="none" stroke={MTDNA} strokeWidth="2.2" />
      <circle cx="205" cy="190" r="9" fill="none" stroke={MTDNA} strokeWidth="2.2" />
      {/* ribosomes */}
      {[[600, 205], [612, 196], [590, 190], [175, 140], [330, 205], [280, 120]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" fill="#c4e0ff" />
      ))}
      {/* matrix granules */}
      {[[420, 200], [460, 140], [540, 130], [300, 160], [380, 130]].map(([x, y], i) => (
        <circle key={`g${i}`} cx={x} cy={y} r="5" fill="#2f8bff" opacity="0.25" />
      ))}
    </>
  );
}

const MITO_LEGEND: ReactNode[] = [
  "Membrana esterna",
  "Spazio intermembrana",
  "Membrana interna",
  "Creste, le pieghe della membrana interna",
  "Matrice",
  <>ATP sintasi: la testa F₁ sporge nella matrice</>,
  "mtDNA circolare",
  "Ribosomi mitocondriali",
];

export function MitochondrionDiagram({ showLabels = true, highlight }: { showLabels?: boolean; highlight?: string | null }) {
  const id = useId().replace(/:/g, "");
  // Unlabelled: the bare drawing in its original frame (the labelling exercise overlays hotspots on it).
  if (!showLabels) {
    return (
      <svg viewBox="0 0 760 300" className="w-full" role="img" aria-label="Sezione longitudinale di un mitocondrio">
        <MitochondrionShape id={id} highlight={highlight} />
      </svg>
    );
  }
  return (
    <div>
      <svg viewBox="0 0 760 330" className="w-full" role="img" aria-label="Sezione longitudinale di un mitocondrio, con le strutture numerate come nella legenda">
        <MitochondrionShape id={id} highlight={highlight} />
        {/* Above: the membranes. Below: structures reached by vertical leaders. Sides: mtDNA and ribosomes. */}
        <Callout n={1} x={150} y={24} tx={185} ty={73} />
        <Callout n={2} x={300} y={24} tx={300} ty={62} />
        <Callout n={3} x={450} y={24} tx={470} ty={73} />
        <Callout n={4} x={225} y={306} tx={225} ty={200} />
        <Callout n={5} x={412} y={306} tx={412} ty={190} />
        <Callout n={6} x={508} y={306} tx={508} ty={238} />
        <Callout n={7} x={34} y={200} tx={198} ty={196} />
        <Callout n={8} x={730} y={212} tx={615} ty={198} />
      </svg>
      <CalloutLegend label="Legenda del mitocondrio" items={MITO_LEGEND} />
    </div>
  );
}

const TEMPLATE_A = "#8fc4ff";
const TEMPLATE_B = "#c4e0ff";
const NEW_DNA = "#34d399";
const PRIMER = "#f87171";
const HELICASE = "#a78bfa";
const TOPO = "#e879f9";
const SSB = "#2dd4bf";
const LIGASE = "#fda4af";

/** Polarity mark (5′ / 3′): phone-sized, reduced from `sm`. */
function End({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="28" fill={MUTED} className={SCALE_SM}>
      {children}
    </text>
  );
}

/** Replication fork moving to the right. Polarity is drawn explicitly (5′/3′). */
export function ReplicationForkDiagram() {
  return (
    <div>
      <svg viewBox="0 0 760 300" className="w-full" role="img" aria-label="Forcella replicativa con filamento guida e filamento lento, strutture numerate come nella legenda">
        {/* unreplicated parental duplex (right) */}
        <line x1="470" y1="150" x2="700" y2="150" stroke={TEMPLATE_A} strokeWidth="4" />
        <line x1="470" y1="170" x2="700" y2="170" stroke={TEMPLATE_B} strokeWidth="4" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={485 + i * 18} y1="153" x2={485 + i * 18} y2="167" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
        ))}
        <End x={728} y={158}>5′</End>
        <End x={728} y={188}>3′</End>
        {/* topoisomerase ahead of the fork */}
        <rect x="610" y="136" width="44" height="48" rx="14" fill="rgba(232,121,249,0.18)" stroke={TOPO} strokeWidth="2" />
        {/* direction of the fork */}
        <g stroke={MUTED} fill={MUTED} strokeWidth="2">
          <line x1="512" y1="112" x2="574" y2="112" />
          <polygon points="586,112 574,105 574,119" stroke="none" />
        </g>

        {/* parental template strands diverging (left) */}
        <path d="M470,150 L80,60" stroke={TEMPLATE_A} strokeWidth="4" fill="none" />
        <path d="M470,170 L80,260" stroke={TEMPLATE_B} strokeWidth="4" fill="none" />
        <End x={50} y={68}>3′</End>
        <End x={50} y={272}>5′</End>

        {/* helicase at the fork */}
        <ellipse cx="470" cy="160" rx="24" ry="28" fill="rgba(167,139,250,0.2)" stroke={HELICASE} strokeWidth="2" />

        {/* SSB on single strands */}
        {[[380, 129], [330, 118], [380, 191], [330, 202]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="6" fill="rgba(45,212,191,0.25)" stroke={SSB} />
        ))}

        {/* leading strand: continuous, 5′ (left) → 3′ (right, at the fork) */}
        <path d="M110,78 L420,148" stroke={NEW_DNA} strokeWidth="4" fill="none" />
        <polygon points="420,148 408,140 410,152" fill={NEW_DNA} />
        <circle cx="400" cy="140" r="11" fill="rgba(52,211,153,0.2)" stroke={NEW_DNA} />
        <End x={112} y={110}>5′</End>

        {/* lagging strand: Okazaki fragments synthesized 5′→3′ away from the fork; RNA primer at each 5′ end */}
        {[
          [400, 182, 300, 205],
          [285, 208, 190, 230],
          [175, 233, 100, 250],
        ].map(([x1, y1, x2, y2], i) => (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x1 - 16} y2={y1 + 3.7} stroke={PRIMER} strokeWidth="5" />
            <line x1={x1 - 16} y1={y1 + 3.7} x2={x2} y2={y2} stroke={NEW_DNA} strokeWidth="4" />
            <polygon points={`${x2},${y2} ${x2 + 12},${y2 - 7} ${x2 + 11},${y2 + 5}`} fill={NEW_DNA} />
          </g>
        ))}
        <circle cx="294" cy="207" r="5" fill={LIGASE} />

        <Callout n={1} x={470} y={84} tx={470} ty={132} />
        <Callout n={2} x={632} y={84} tx={632} ty={136} />
        <Callout n={3} x={330} y={56} tx={330} ty={112} />
        <Callout n={4} x={400} y={44} tx={400} ty={129} />
        <Callout n={5} x={200} y={140} tx={200} ty={99} />
        <Callout n={6} x={250} y={176} tx={250} ty={214} />
        <Callout n={7} x={392} y={246} tx={392} ty={185} />
        <Callout n={8} x={294} y={264} tx={294} ty={207} />
      </svg>
      <CalloutLegend
        label="Legenda della forcella replicativa"
        items={[
          "Elicasi: separa i due filamenti",
          "Topoisomerasi: scioglie la tensione davanti alla forcella",
          "Proteine SSB: tengono aperti i filamenti singoli",
          "DNA polimerasi",
          <>Filamento guida: sintesi continua 5′→3′ verso la forcella</>,
          "Filamento lento: frammenti di Okazaki, sintetizzati lontano dalla forcella",
          "Primer di RNA (primasi) all’estremità 5′ di ogni frammento",
          "DNA ligasi: salda i frammenti",
        ]}
      />
      <SwatchLegend
        label="Colori del diagramma"
        items={[
          { swatch: line(TEMPLATE_A), text: "DNA stampo" },
          { swatch: line(NEW_DNA), text: "DNA nuovo" },
          { swatch: line(PRIMER, 5), text: "Primer di RNA" },
          {
            swatch: (
              <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden>
                <line x1="1" y1="6" x2="17" y2="6" stroke={MUTED} strokeWidth="2" />
                <polygon points="23,6 16,2 16,10" fill={MUTED} />
              </svg>
            ),
            text: "Avanzamento della forcella",
          },
        ]}
      />
    </div>
  );
}

const it = (v: number, digits = 2) => v.toLocaleString("it-IT", { maximumFractionDigits: digits });

/** Short facts under a chart, as text (chart labels stay short so they never collide on a phone). */
function ChartNotes({ items, label }: { items: { term: ReactNode; detail: ReactNode; swatch?: ReactNode }[]; label: string }) {
  return (
    <dl aria-label={label} className="mt-4 grid gap-x-8 gap-y-2.5 border-t border-white/[0.07] pt-4 sm:grid-cols-2">
      {items.map((x, i) => (
        <div key={i} className="flex gap-2.5 text-sm leading-snug">
          {x.swatch && (
            <span aria-hidden className="mt-1 inline-flex w-4 shrink-0 justify-center">
              {x.swatch}
            </span>
          )}
          <div className="min-w-0">
            <dt className="inline font-medium text-fg">{x.term}: </dt>
            <dd className="inline text-fg-muted">{x.detail}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Titration of 0.10 M acetic acid with 0.10 M NaOH, solved exactly from the charge balance. */
export function BufferCurveDiagram() {
  const points = useMemo(() => {
    const Ka = 1.74e-5;
    const Kw = 1e-14;
    const C = 0.1;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 160; i++) {
      const x = i / 100; // mol OH⁻ added per mol of acid (equal volumes of equal concentrations)
      const ca = C / (1 + x);
      const na = (C * x) / (1 + x);
      let lo = -14;
      let hi = 0;
      for (let k = 0; k < 80; k++) {
        const mid = (lo + hi) / 2;
        const h = 10 ** mid;
        const f = h + na - Kw / h - (ca * Ka) / (Ka + h);
        if (f > 0) hi = mid;
        else lo = mid;
      }
      pts.push({ x, y: -(lo + hi) / 2 });
    }
    return pts;
  }, []);
  const eq = points[100].y;
  return (
    <div>
      <LineChart
        ariaLabel="Curva di titolazione dell’acido acetico 0,10 M con NaOH 0,10 M"
        series={[{ key: "ph", label: "pH", color: "#3d8bff", points }]}
        xDomain={[0, 1.6]}
        yDomain={[0, 14]}
        xTicks={[0, 0.5, 1, 1.5]}
        yTicks={[0, 4.76, 7, 14]}
        xLabel="OH⁻ aggiunto / acido iniziale"
        yLabel="pH"
        xFormat={(v) => it(v)}
        yFormat={(v) => it(v)}
        bands={[{ from: 0.15, to: 0.85, label: "zona tampone", color: "#2dd4bf" }]}
        markers={[
          { x: 0.5, y: 4.76, label: "pH = pKa", color: "#2dd4bf" },
          { x: 1, y: eq, label: "equivalenza", color: INK },
        ]}
      />
      <ChartNotes
        label="Punti chiave della curva"
        items={[
          { swatch: dot("#2dd4bf"), term: "Metà titolazione", detail: "pH = pKa = 4,76: acido e base coniugata sono in uguale quantità" },
          { swatch: dot(INK), term: "Equivalenza", detail: `pH ≈ ${it(eq, 1)}, basico perché resta solo lo ione acetato` },
          { swatch: <span className="block h-3 w-3 rounded-[3px] bg-[#2dd4bf]/30" />, term: "Zona tampone", detail: "circa pKa ± 1: il pH varia lentamente" },
        ]}
      />
    </div>
  );
}

/** Red blood cells in hypotonic, isotonic and hypertonic solutions. Words are HTML; the drawings carry no text. */
export function OsmosisDiagram() {
  const cx = 115;
  const cy = 100;
  const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    return (
      <g stroke="#56a6ff" strokeWidth="2.5" fill="#56a6ff">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <polygon points={`${x2},${y2} ${x2 - 9 * Math.cos(a - 0.4)},${y2 - 9 * Math.sin(a - 0.4)} ${x2 - 9 * Math.cos(a + 0.4)},${y2 - 9 * Math.sin(a + 0.4)}`} stroke="none" />
      </g>
    );
  };
  const cell = (kind: "hypo" | "iso" | "hyper") => (
    <svg viewBox="0 0 230 200" className="w-full" aria-hidden>
      <rect x="1" y="1" width="228" height="198" rx="16" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
      {kind === "iso" && (
        <g>
          <ellipse cx={cx} cy={cy} rx="58" ry="38" fill="#b91c1c" stroke="#f87171" strokeWidth="2" />
          <ellipse cx={cx} cy={cy} rx="26" ry="15" fill="#7f1d1d" opacity="0.8" />
          <Arrow x1={cx - 100} y1={cy - 10} x2={cx - 66} y2={cy - 10} />
          <Arrow x1={cx - 66} y1={cy + 12} x2={cx - 100} y2={cy + 12} />
          <Arrow x1={cx + 100} y1={cy + 12} x2={cx + 66} y2={cy + 12} />
          <Arrow x1={cx + 66} y1={cy - 10} x2={cx + 100} y2={cy - 10} />
        </g>
      )}
      {kind === "hypo" && (
        <g>
          <circle cx={cx} cy={cy} r="60" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
          {[0, 90, 180, 270].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <Arrow key={deg} x1={cx + Math.cos(r) * 100} y1={cy + Math.sin(r) * 92} x2={cx + Math.cos(r) * 68} y2={cy + Math.sin(r) * 66} />;
          })}
        </g>
      )}
      {kind === "hyper" && (
        <g>
          <path
            d={
              Array.from({ length: 24 }, (_, i) => {
                const t = (i / 24) * Math.PI * 2;
                const rr = i % 2 ? 30 : 40;
                return `${i ? "L" : "M"}${cx + Math.cos(t) * rr * 1.25},${cy + Math.sin(t) * rr}`;
              }).join(" ") + "Z"
            }
            fill="#991b1b"
            stroke="#f87171"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {[0, 90, 180, 270].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <Arrow key={deg} x1={cx + Math.cos(r) * 56} y1={cy + Math.sin(r) * 48} x2={cx + Math.cos(r) * 98} y2={cy + Math.sin(r) * 90} />;
          })}
        </g>
      )}
    </svg>
  );
  const panels = [
    { kind: "hypo" as const, title: "Soluzione ipotonica", conc: "meno di 280 mOsm/L, per esempio acqua distillata", effect: "Entra acqua: la cellula si rigonfia fino all’emolisi." },
    { kind: "iso" as const, title: "Soluzione isotonica", conc: "circa 290 mOsm/L, per esempio NaCl 0,9%", effect: "L’acqua entra ed esce in egual misura: flusso netto nullo." },
    { kind: "hyper" as const, title: "Soluzione ipertonica", conc: "più di 300 mOsm/L, per esempio NaCl 3%", effect: "Esce acqua: la cellula si raggrinzisce (crenatura)." },
  ];
  return (
    <div>
      <ul aria-label="Globuli rossi in soluzioni a diversa tonicità" className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        {panels.map((p) => (
          <li key={p.kind} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-4 sm:block">
            {cell(p.kind)}
            <div className="min-w-0 sm:mt-3">
              <div className="text-sm font-semibold text-fg">{p.title}</div>
              <div className="mt-0.5 text-xs text-fg-subtle">{p.conc}</div>
              <p className="mt-1.5 text-ui leading-snug text-fg-reading">{p.effect}</p>
            </div>
          </li>
        ))}
      </ul>
      <SwatchLegend
        label="Simboli del diagramma"
        items={[
          {
            swatch: (
              <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden>
                <line x1="1" y1="6" x2="17" y2="6" stroke="#56a6ff" strokeWidth="2" />
                <polygon points="23,6 16,2 16,10" fill="#56a6ff" />
              </svg>
            ),
            text: "Flusso netto d’acqua",
          },
        ]}
      />
    </div>
  );
}

const FAST = "#2dd4bf";

/** Venturi tube: continuity (A₁v₁ = A₂v₂) and Bernoulli (lower pressure where faster). */
export function VenturiDiagram() {
  return (
    <div>
      <svg viewBox="0 20 760 245" className="w-full" role="img" aria-label="Tubo di Venturi: nella strozzatura la velocità aumenta e la pressione diminuisce">
        {/* tube walls */}
        <path d="M40,150 L250,150 C300,150 320,185 360,185 L400,185 C440,185 460,150 510,150 L720,150" fill="none" stroke="#8fc4ff" strokeWidth="3" />
        <path d="M40,250 L250,250 C300,250 320,215 360,215 L400,215 C440,215 460,250 510,250 L720,250" fill="none" stroke="#8fc4ff" strokeWidth="3" />
        <path d="M40,150 L250,150 C300,150 320,185 360,185 L400,185 C440,185 460,150 510,150 L720,150 L720,250 L510,250 C460,250 440,215 400,215 L360,215 C320,215 300,250 250,250 L40,250 Z" fill="rgba(57,135,229,0.12)" />
        {/* velocity arrows: the length is the speed */}
        {[[70, 200, 60], [140, 200, 60], [600, 200, 60], [660, 200, 50]].map(([x, y, l], i) => (
          <g key={i} stroke="#3d8bff" fill="#3d8bff" strokeWidth="2.5">
            <line x1={x} y1={y} x2={x + l - 10} y2={y} />
            <polygon points={`${x + l},${y} ${x + l - 11},${y - 6} ${x + l - 11},${y + 6}`} stroke="none" />
          </g>
        ))}
        <g stroke={FAST} fill={FAST} strokeWidth="3">
          <line x1="320" y1="200" x2="430" y2="200" />
          <polygon points="444,200 430,192 430,208" stroke="none" />
        </g>
        {/* manometers: the column height is the pressure */}
        {[
          [150, 70, "p₁"],
          [380, 125, "p₂"],
          [610, 74, "p₃"],
        ].map(([x, top, label]) => (
          <g key={String(label)}>
            <rect x={Number(x) - 9} y={30} width="18" height={(label === "p₂" ? 185 : 150) - 30} rx="4" fill="none" stroke="rgba(255,255,255,0.3)" />
            <rect x={Number(x) - 7} y={Number(top)} width="14" height={(label === "p₂" ? 185 : 150) - Number(top)} fill="rgba(57,135,229,0.55)" />
            <text x={Number(x) + 18} y={Number(top) + 6} fontSize="28" fill={INK} className={SCALE_SM_LEFT}>
              {label}
            </text>
          </g>
        ))}
      </svg>
      <dl aria-label="Le tre sezioni del tubo" className="mt-4 grid gap-x-6 gap-y-3 border-t border-white/[0.07] pt-4 sm:grid-cols-3">
        {[
          ["Sezione 1", "A₁ grande, v₁ bassa, p₁ alta"],
          ["Strozzatura, sezione 2", "A₂ piccola, v₂ alta, p₂ bassa"],
          ["Sezione 3", "A₃ = A₁, quindi p₃ ≈ p₁ (fluido ideale)"],
        ].map(([t, d]) => (
          <div key={t} className="text-sm leading-snug">
            <dt className="font-medium text-fg">{t}</dt>
            <dd className="mt-0.5 text-fg-muted">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-fg-subtle">La lunghezza delle frecce indica la velocità del fluido, l’altezza delle colonne nei manometri la pressione.</p>
    </div>
  );
}

/** Exponential decay N/N₀ = (1/2)^(t/T½). */
export function DecayCurveDiagram() {
  const points = useMemo(() => Array.from({ length: 101 }, (_, i) => ({ x: i / 20, y: 0.5 ** (i / 20) })), []);
  return (
    <div>
      <LineChart
        ariaLabel="Decadimento radioattivo: frazione di nuclei rimasti in funzione del tempo in emivite"
        series={[{ key: "n", label: "N/N₀", color: "#9085e9", points }]}
        xDomain={[0, 5]}
        yDomain={[0, 1]}
        xTicks={[0, 1, 2, 3, 4, 5]}
        yTicks={[0, 0.25, 0.5, 1]}
        xLabel="tempo (in emivite)"
        yLabel="N / N₀"
        xFormat={(v) => `${it(v, 1)} T½`}
        yFormat={(v) => `${it(v * 100, 1)}%`}
        markers={[
          { x: 1, y: 0.5, label: "50%" },
          { x: 2, y: 0.25, label: "25%" },
          { x: 3, y: 0.125, label: "12,5%" },
        ]}
      />
      <ChartNotes
        label="Come leggere la curva"
        items={[
          { term: "Ogni emivita", detail: "resta la metà dei nuclei: 50% dopo 1 T½, 25% dopo 2, 12,5% dopo 3" },
          { term: "Mai zero", detail: "la curva si avvicina a zero senza raggiungerlo" },
        ]}
      />
    </div>
  );
}

export function LessonDiagram({ kind }: { kind: NonNullable<Lesson["diagram"]> }) {
  switch (kind) {
    case "mitochondrion":
      return <MitochondrionDiagram />;
    case "replication-fork":
      return <ReplicationForkDiagram />;
    case "buffer-curve":
      return <BufferCurveDiagram />;
    case "osmosis":
      return <OsmosisDiagram />;
    case "venturi":
      return <VenturiDiagram />;
    case "decay-curve":
      return <DecayCurveDiagram />;
  }
}

/** Short title of each diagram (for a heading above it). */
export const DIAGRAM_TITLE: Record<NonNullable<Lesson["diagram"]>, string> = {
  mitochondrion: "Sezione di un mitocondrio",
  "replication-fork": "La forcella replicativa",
  "buffer-curve": "Titolazione di un acido debole",
  osmosis: "Globuli rossi e tonicità",
  venturi: "Il tubo di Venturi",
  "decay-curve": "Il decadimento radioattivo",
};

export const DIAGRAM_CAPTION: Record<NonNullable<Lesson["diagram"]>, string> = {
  mitochondrion: "Sezione schematica di un mitocondrio: due membrane, creste della membrana interna, matrice con mtDNA e ribosomi; la testa F₁ dell’ATP sintasi sporge nella matrice.",
  "replication-fork": "Forcella replicativa: il filamento guida cresce in continuo verso la forcella; il filamento lento è sintetizzato a frammenti di Okazaki, ciascuno con un primer di RNA all’estremità 5′.",
  "buffer-curve": "Titolazione di CH₃COOH 0,10 M con NaOH 0,10 M calcolata dal bilancio di carica: nella zona tampone il pH varia lentamente; a metà titolazione pH = pKa.",
  osmosis: "Comportamento dei globuli rossi in soluzioni a diversa tonicità. Le frecce indicano il flusso netto d’acqua.",
  venturi: "Tubo di Venturi per un fluido ideale: nella strozzatura la velocità aumenta (continuità) e la pressione diminuisce (Bernoulli).",
  "decay-curve": "Legge del decadimento: dopo ogni emivita resta la metà dei nuclei; la curva non arriva mai esattamente a zero.",
};
