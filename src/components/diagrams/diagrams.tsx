"use client";

import { useId, useMemo } from "react";
import { LineChart } from "@/components/ui/charts";
import type { Lesson } from "@/lib/types";

// Scientific diagrams drawn as SVG. Geometry and labels follow standard textbook
// conventions (OpenStax Biology 2e, Chemistry 2e, College Physics 2e).

const INK = "#f5f5f7";
const MUTED = "#a6a6b3";
const LINE = "rgba(255,255,255,0.35)";

function Label({ x, y, text, anchor = "start", tx, ty }: { x: number; y: number; text: string; anchor?: "start" | "end" | "middle"; tx: number; ty: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={LINE} strokeWidth="1" />
      <circle cx={x} cy={y} r="2.2" fill={INK} />
      <text x={tx + (anchor === "start" ? 4 : anchor === "end" ? -4 : 0)} y={ty + 4} textAnchor={anchor} fontSize="12" fill={INK}>
        {text}
      </text>
    </g>
  );
}

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

export function MitochondrionDiagram({ showLabels = true, highlight }: { showLabels?: boolean; highlight?: string | null }) {
  const id = useId().replace(/:/g, "");
  const cristae = [150, 225, 300, 375, 450, 525, 600];
  return (
    <svg viewBox="0 0 760 300" className="w-full" role="img" aria-label="Sezione longitudinale di un mitocondrio">
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
          <rect x={x - 4} y={y - 2} width="8" height="10" rx="2" fill="#efc55c" />
          <circle cx={x} cy={i === 0 ? y + 16 : y - 12} r="7" fill="#efc55c" />
        </g>
      ))}
      {/* mtDNA: circular molecules */}
      <circle cx="520" cy="175" r="11" fill="none" stroke="#f472b6" strokeWidth="2.2" />
      <circle cx="205" cy="190" r="9" fill="none" stroke="#f472b6" strokeWidth="2.2" />
      {/* ribosomes */}
      {[[600, 205], [612, 196], [590, 190], [175, 140], [330, 205], [280, 120]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" fill="#c4e0ff" />
      ))}
      {/* matrix granules */}
      {[[420, 200], [460, 140], [540, 130], [300, 160], [380, 130]].map(([x, y], i) => (
        <circle key={`g${i}`} cx={x} cy={y} r="5" fill="#2f8bff" opacity="0.25" />
      ))}
      {showLabels && (
        <g>
          <Label x={210} y={56} text="Membrana esterna" anchor="end" tx={150} ty={20} />
          <Label x={300} y={65} text="Spazio intermembrana" anchor="middle" tx={300} ty={20} />
          <Label x={472} y={72} text="Membrana interna" anchor="start" tx={500} ty={20} />
          <Label x={432} y={114} text="ATP sintasi (F₁ nella matrice)" anchor="start" tx={600} ty={60} />
          <Label x={238} y={150} text="Cresta" anchor="end" tx={40} ty={120} />
          <Label x={380} y={170} text="Matrice" anchor="middle" tx={390} ty={285} />
          <Label x={530} y={175} text="mtDNA circolare" anchor="start" tx={690} ty={150} />
          <Label x={600} y={205} text="Ribosomi" anchor="start" tx={690} ty={240} />
        </g>
      )}
    </svg>
  );
}

/** Replication fork moving to the right. Polarity is drawn explicitly (5′/3′). */
export function ReplicationForkDiagram() {
  return (
    <svg viewBox="0 0 760 320" className="w-full" role="img" aria-label="Forcella replicativa con filamento guida e filamento lento">
      {/* unreplicated parental duplex (right) */}
      <line x1="470" y1="150" x2="740" y2="150" stroke="#8fc4ff" strokeWidth="4" />
      <line x1="470" y1="170" x2="740" y2="170" stroke="#c4e0ff" strokeWidth="4" />
      {Array.from({ length: 14 }).map((_, i) => (
        <line key={i} x1={485 + i * 18} y1="153" x2={485 + i * 18} y2="167" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      ))}
      <text x="748" y="154" fontSize="12" fill={MUTED}>5′</text>
      <text x="748" y="176" fontSize="12" fill={MUTED}>3′</text>
      {/* topoisomerase ahead of the fork */}
      <rect x="610" y="136" width="44" height="48" rx="14" fill="rgba(232,121,249,0.18)" stroke="#e879f9" />
      <text x="632" y="205" textAnchor="middle" fontSize="11.5" fill={INK}>Topoisomerasi</text>

      {/* parental template strands diverging (left) */}
      <path d="M470,150 L80,60" stroke="#8fc4ff" strokeWidth="4" fill="none" />
      <path d="M470,170 L80,260" stroke="#c4e0ff" strokeWidth="4" fill="none" />
      <text x="54" y="58" fontSize="12" fill={MUTED}>3′</text>
      <text x="54" y="266" fontSize="12" fill={MUTED}>5′</text>

      {/* helicase at the fork */}
      <ellipse cx="470" cy="160" rx="24" ry="28" fill="rgba(239,197,92,0.2)" stroke="#efc55c" strokeWidth="2" />
      <text x="470" y="118" textAnchor="middle" fontSize="11.5" fill={INK}>Elicasi</text>

      {/* SSB on single strands */}
      {[[380, 129], [330, 118], [380, 191], [330, 202]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" fill="rgba(45,212,191,0.25)" stroke="#2dd4bf" />
      ))}
      <text x="352" y="98" textAnchor="middle" fontSize="11" fill={MUTED}>SSB</text>

      {/* leading strand: continuous, 5′ (left) → 3′ (right, at the fork) */}
      <path d="M110,78 L420,148" stroke="#34d399" strokeWidth="4" fill="none" />
      <polygon points="420,148 408,140 410,152" fill="#34d399" />
      <circle cx="400" cy="140" r="11" fill="rgba(52,211,153,0.2)" stroke="#34d399" />
      <text x="96" y="92" fontSize="11" fill={MUTED}>5′</text>
      <text x="250" y="84" fontSize="12.5" fill={INK} transform="rotate(13 250 84)">Filamento guida (continuo)</text>
      <text x="402" y="128" textAnchor="middle" fontSize="10.5" fill={MUTED}>Pol</text>

      {/* lagging strand: Okazaki fragments synthesized 5′→3′ away from the fork; RNA primer at each 5′ end */}
      {[
        [400, 182, 300, 205],
        [285, 208, 190, 230],
        [175, 233, 100, 250],
      ].map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <line x1={x1} y1={y1} x2={x1 - 16} y2={y1 + 3.7} stroke="#f87171" strokeWidth="5" />
          <line x1={x1 - 16} y1={y1 + 3.7} x2={x2} y2={y2} stroke="#34d399" strokeWidth="4" />
          <polygon points={`${x2},${y2} ${x2 + 12},${y2 - 7} ${x2 + 11},${y2 + 5}`} fill="#34d399" />
        </g>
      ))}
      <text x="300" y="250" fontSize="12.5" fill={INK} transform="rotate(13 300 250)">Filamento lento: frammenti di Okazaki</text>
      <circle cx="294" cy="207" r="5" fill="#efc55c" />
      <text x="250" y="292" fontSize="11" fill={MUTED}>● DNA ligasi salda i frammenti</text>
      <rect x="440" y="286" width="16" height="5" fill="#f87171" />
      <text x="462" y="292" fontSize="11" fill={MUTED}>primer di RNA (primasi)</text>
      <text x="600" y="292" fontSize="11" fill={MUTED}>→ avanzamento della forcella</text>
    </svg>
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
  return (
    <LineChart
      ariaLabel="Curva di titolazione dell’acido acetico 0,10 M con NaOH 0,10 M"
      series={[{ key: "ph", label: "pH", color: "#3987e5", points }]}
      xDomain={[0, 1.6]}
      yDomain={[0, 14]}
      xTicks={[0, 0.5, 1, 1.5]}
      yTicks={[0, 4.76, 7, 14]}
      xLabel="OH⁻ aggiunto / acido iniziale"
      yLabel="pH"
      xFormat={(v) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 })}
      yFormat={(v) => v.toLocaleString("it-IT", { maximumFractionDigits: 2 })}
      bands={[{ from: 0.15, to: 0.85, label: "zona tampone (pKa ± ~1)", color: "#2dd4bf" }]}
      markers={[
        { x: 0.5, y: 4.76, label: "½ equivalenza: pH = pKa = 4,76", color: "#efc55c" },
        { x: 1, y: points[100].y, label: `equivalenza: pH ≈ ${points[100].y.toFixed(1).replace(".", ",")}`, color: "#f5f5f7" },
      ]}
    />
  );
}

/** Red blood cells in hypotonic, isotonic and hypertonic solutions. */
export function OsmosisDiagram() {
  const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    return (
      <g stroke="#56a6ff" strokeWidth="2" fill="#56a6ff">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <polygon points={`${x2},${y2} ${x2 - 8 * Math.cos(a - 0.4)},${y2 - 8 * Math.sin(a - 0.4)} ${x2 - 8 * Math.cos(a + 0.4)},${y2 - 8 * Math.sin(a + 0.4)}`} stroke="none" />
      </g>
    );
  };
  const panel = (cx: number, title: string, sub: string, kind: "hypo" | "iso" | "hyper") => (
    <g>
      <rect x={cx - 115} y="20" width="230" height="250" rx="18" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" />
      <text x={cx} y="48" textAnchor="middle" fontSize="13.5" fill={INK} fontWeight="600">{title}</text>
      <text x={cx} y="66" textAnchor="middle" fontSize="11" fill={MUTED}>{sub}</text>
      {kind === "iso" && (
        <g>
          <ellipse cx={cx} cy="160" rx="58" ry="38" fill="#b91c1c" stroke="#f87171" strokeWidth="2" />
          <ellipse cx={cx} cy="160" rx="26" ry="15" fill="#7f1d1d" opacity="0.8" />
          <Arrow x1={cx - 100} y1={150} x2={cx - 66} y2={150} />
          <Arrow x1={cx - 66} y1={172} x2={cx - 100} y2={172} />
        </g>
      )}
      {kind === "hypo" && (
        <g>
          <circle cx={cx} cy="160" r="60" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
          {[0, 90, 180, 270].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <Arrow key={deg} x1={cx + Math.cos(r) * 100} y1={160 + Math.sin(r) * 92} x2={cx + Math.cos(r) * 68} y2={160 + Math.sin(r) * 66} />;
          })}
        </g>
      )}
      {kind === "hyper" && (
        <g>
          <path
            d={Array.from({ length: 24 }, (_, i) => {
              const t = (i / 24) * Math.PI * 2;
              const rr = i % 2 ? 30 : 40;
              return `${i ? "L" : "M"}${cx + Math.cos(t) * rr * 1.25},${160 + Math.sin(t) * rr}`;
            }).join(" ") + "Z"}
            fill="#991b1b"
            stroke="#f87171"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {[0, 90, 180, 270].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <Arrow key={deg} x1={cx + Math.cos(r) * 56} y1={160 + Math.sin(r) * 48} x2={cx + Math.cos(r) * 98} y2={160 + Math.sin(r) * 90} />;
          })}
        </g>
      )}
      <text x={cx} y="252" textAnchor="middle" fontSize="11.5" fill={MUTED}>
        {kind === "hypo" ? "entra acqua → rigonfiamento, emolisi" : kind === "iso" ? "flusso netto nullo" : "esce acqua → crenatura"}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 760 290" className="w-full" role="img" aria-label="Globuli rossi in soluzioni ipotonica, isotonica e ipertonica">
      {panel(130, "Ipotonica", "< 280 mOsm/L (es. acqua distillata)", "hypo")}
      {panel(380, "Isotonica", "≈ 290 mOsm/L (es. NaCl 0,9%)", "iso")}
      {panel(630, "Ipertonica", "> 300 mOsm/L (es. NaCl 3%)", "hyper")}
    </svg>
  );
}

/** Venturi tube: continuity (A₁v₁ = A₂v₂) and Bernoulli (lower pressure where faster). */
export function VenturiDiagram() {
  return (
    <svg viewBox="0 0 760 300" className="w-full" role="img" aria-label="Tubo di Venturi: nella strozzatura la velocità aumenta e la pressione diminuisce">
      {/* tube walls */}
      <path d="M40,150 L250,150 C300,150 320,185 360,185 L400,185 C440,185 460,150 510,150 L720,150" fill="none" stroke="#8fc4ff" strokeWidth="3" />
      <path d="M40,250 L250,250 C300,250 320,215 360,215 L400,215 C440,215 460,250 510,250 L720,250" fill="none" stroke="#8fc4ff" strokeWidth="3" />
      <path d="M40,150 L250,150 C300,150 320,185 360,185 L400,185 C440,185 460,150 510,150 L720,150 L720,250 L510,250 C460,250 440,215 400,215 L360,215 C320,215 300,250 250,250 L40,250 Z" fill="rgba(57,135,229,0.12)" />
      {/* velocity arrows */}
      {[[70, 200, 60], [140, 200, 60], [600, 200, 60], [660, 200, 50]].map(([x, y, l], i) => (
        <g key={i} stroke="#3987e5" fill="#3987e5" strokeWidth="2.5">
          <line x1={x} y1={y} x2={x + l - 10} y2={y} />
          <polygon points={`${x + l},${y} ${x + l - 11},${y - 6} ${x + l - 11},${y + 6}`} stroke="none" />
        </g>
      ))}
      <g stroke="#efc55c" fill="#efc55c" strokeWidth="3">
        <line x1="320" y1="200" x2="430" y2="200" />
        <polygon points="444,200 430,192 430,208" stroke="none" />
      </g>
      {/* manometers */}
      {[
        [150, 70, "p₁"],
        [380, 125, "p₂"],
        [610, 74, "p₃"],
      ].map(([x, top, label]) => (
        <g key={String(label)}>
          <rect x={Number(x) - 9} y={30} width="18" height={(label === "p₂" ? 185 : 150) - 30} rx="4" fill="none" stroke="rgba(255,255,255,0.3)" />
          <rect x={Number(x) - 7} y={Number(top)} width="14" height={(label === "p₂" ? 185 : 150) - Number(top)} fill="rgba(57,135,229,0.55)" />
          <text x={Number(x) + 16} y={Number(top) + 4} fontSize="12.5" fill={INK}>{label}</text>
        </g>
      ))}
      <text x="150" y="278" textAnchor="middle" fontSize="12" fill={MUTED}>A₁ grande · v₁ bassa · p₁ alta</text>
      <text x="380" y="278" textAnchor="middle" fontSize="12" fill="#efc55c">A₂ piccola · v₂ alta · p₂ bassa</text>
      <text x="610" y="278" textAnchor="middle" fontSize="12" fill={MUTED}>A₃ = A₁ · p₃ ≈ p₁ (fluido ideale)</text>
    </svg>
  );
}

/** Exponential decay N/N₀ = (1/2)^(t/T½). */
export function DecayCurveDiagram() {
  const points = useMemo(() => Array.from({ length: 101 }, (_, i) => ({ x: i / 20, y: 0.5 ** (i / 20) })), []);
  return (
    <LineChart
      ariaLabel="Decadimento radioattivo: frazione di nuclei rimasti in funzione del tempo in emivite"
      series={[{ key: "n", label: "N/N₀", color: "#9085e9", points }]}
      xDomain={[0, 5]}
      yDomain={[0, 1]}
      xTicks={[0, 1, 2, 3, 4, 5]}
      yTicks={[0, 0.25, 0.5, 1]}
      xLabel="tempo (in emivite)"
      yLabel="N / N₀"
      xFormat={(v) => `${v.toLocaleString("it-IT", { maximumFractionDigits: 1 })} T½`}
      yFormat={(v) => `${Math.round(v * 100)}%`}
      markers={[
        { x: 1, y: 0.5, label: "1 T½ → 50%" },
        { x: 2, y: 0.25, label: "2 T½ → 25%" },
        { x: 3, y: 0.125, label: "3 T½ → 12,5%" },
      ]}
    />
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

export const DIAGRAM_CAPTION: Record<NonNullable<Lesson["diagram"]>, string> = {
  mitochondrion: "Sezione schematica di un mitocondrio: due membrane, creste della membrana interna, matrice con mtDNA e ribosomi; la testa F₁ dell’ATP sintasi sporge nella matrice.",
  "replication-fork": "Forcella replicativa: il filamento guida cresce in continuo verso la forcella; il filamento lento è sintetizzato a frammenti di Okazaki, ciascuno con un primer di RNA all’estremità 5′.",
  "buffer-curve": "Titolazione di CH₃COOH 0,10 M con NaOH 0,10 M calcolata dal bilancio di carica: nella zona tampone il pH varia lentamente; a metà titolazione pH = pKa.",
  osmosis: "Comportamento dei globuli rossi in soluzioni a diversa tonicità. Le frecce indicano il flusso netto d’acqua.",
  venturi: "Tubo di Venturi per un fluido ideale: nella strozzatura la velocità aumenta (continuità) e la pressione diminuisce (Bernoulli).",
  "decay-curve": "Legge del decadimento: dopo ogni emivita resta la metà dei nuclei; la curva non arriva mai esattamente a zero.",
};
