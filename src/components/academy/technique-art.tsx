"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import type { Technique } from "@/data/academy";
import { cn } from "@/lib/utils";

// Original animated illustrations for the Study Academy (one per technique).
// Animations are pure CSS and respect the reduced-motion settings.

const A = "#56a6ff"; // azure
const G = "#efc55c"; // gold
const F = "#a6a6b3"; // muted

const draw = (len: number, dur = 2.4, delay = 0): CSSProperties => ({
  strokeDasharray: len,
  ["--len" as string]: len,
  animation: `atlas-draw ${dur}s ease-out ${delay}s infinite alternate`,
});
const glow = (dur = 2.4, delay = 0): CSSProperties => ({ animation: `atlas-glow ${dur}s ease-in-out ${delay}s infinite` });
const rise = (dur = 4, delay = 0): CSSProperties => ({ animation: `atlas-rise ${dur}s ease-in-out ${delay}s infinite`, transformBox: "fill-box" });
const walk = (path: string, dur = 6, delay = 0): CSSProperties => ({ offsetPath: `path("${path}")`, animation: `atlas-walk ${dur}s linear ${delay}s infinite` });

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  const id = `ta-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 320 180" className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <radialGradient id={id} cx="0.7" cy="0.2" r="0.9">
          <stop offset="0" stopColor={A} stopOpacity="0.16" />
          <stop offset="1" stopColor={A} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${id})`} />
      {children}
    </svg>
  );
}

function Feynman() {
  return (
    <Frame>
      <rect x="28" y="34" width="150" height="82" rx="16" fill="none" stroke={F} strokeOpacity="0.35" />
      {[54, 72, 90].map((y, i) => (
        <line key={y} x1="46" y1={y} x2={150 - i * 22} y2={y} stroke={F} strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" style={draw(120, 2.2, i * 0.3)} />
      ))}
      <path d="M190 75 h34" stroke={A} strokeWidth="2" style={glow(2)} />
      <path d="M216 68 l10 7 -10 7" fill="none" stroke={A} strokeWidth="2" />
      <rect x="236" y="48" width="64" height="54" rx="14" fill={A} fillOpacity="0.12" stroke={A} strokeOpacity="0.6" />
      <line x1="250" y1="68" x2="286" y2="68" stroke={A} strokeWidth="5" strokeLinecap="round" />
      <line x1="250" y1="84" x2="274" y2="84" stroke={A} strokeWidth="5" strokeLinecap="round" />
      <circle cx="126" cy="128" r="9" fill={G} style={glow(1.6)} />
      <text x="126" y="132" textAnchor="middle" fontSize="11" fontWeight="700" fill="#140f04">?</text>
      <text x="142" y="150" fontSize="10" fill={G} fillOpacity="0.8">lacuna trovata</text>
    </Frame>
  );
}

function Palace() {
  const route = "M60 140 L60 60 L160 60 L160 120 L260 120 L260 40";
  return (
    <Frame>
      {[[30, 30, 90, 70], [120, 30, 80, 70], [210, 20, 90, 60], [30, 100, 90, 60], [120, 100, 80, 60], [210, 80, 90, 80]].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="8" fill="none" stroke={F} strokeOpacity="0.25" />
      ))}
      <path d={route} fill="none" stroke={A} strokeOpacity="0.4" strokeDasharray="4 6" strokeWidth="2" />
      {[[60, 60], [160, 60], [160, 120], [260, 120], [260, 40]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill={G} fillOpacity="0.25" stroke={G} style={glow(2.5, i * 0.5)} />
      ))}
      <circle r="5" fill={A} style={walk(route, 6)} />
    </Frame>
  );
}

function Recall() {
  return (
    <Frame>
      <path d="M95 60 C95 30 150 25 160 45 C175 25 225 35 220 65 C240 80 225 115 200 112 C190 135 140 135 130 115 C100 120 80 90 95 60Z" fill={A} fillOpacity="0.08" stroke={A} strokeOpacity="0.6" />
      <path d="M160 45 C150 70 170 85 160 112" fill="none" stroke={A} strokeOpacity="0.35" />
      {[0, 1, 2].map((i) => (
        <g key={i} style={rise(3.6, i * 1.2)}>
          <rect x={235 + i * 6} y={50 + i * 22} width="58" height="16" rx="8" fill={G} fillOpacity="0.15" stroke={G} strokeOpacity="0.7" />
        </g>
      ))}
      <text x="160" y="160" textAnchor="middle" fontSize="11" fill={F}>recuperare rafforza la traccia</text>
    </Frame>
  );
}

function Spacing() {
  const curves = ["M30 40 C60 110 80 130 110 138", "M110 40 C150 90 175 110 205 118", "M205 40 C250 70 270 80 300 86"];
  return (
    <Frame>
      <line x1="30" y1="150" x2="300" y2="150" stroke={F} strokeOpacity="0.4" />
      <line x1="30" y1="30" x2="30" y2="150" stroke={F} strokeOpacity="0.4" />
      {curves.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={A} strokeWidth="2.5" style={draw(140, 1.8, i * 0.6)} />
      ))}
      {[110, 205].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="40" x2={x} y2="150" stroke={G} strokeOpacity="0.5" strokeDasharray="3 4" />
          <circle cx={x} cy="40" r="5" fill={G} style={glow(2, i * 0.6)} />
        </g>
      ))}
      <text x="36" y="168" fontSize="10" fill={F}>ripassi a intervalli crescenti</text>
    </Frame>
  );
}

function Interleaving() {
  const colors = [A, G, "#9085e9"];
  const blocked = [0, 0, 0, 1, 1, 1, 2, 2, 2];
  const mixed = [0, 1, 2, 1, 0, 2, 2, 0, 1];
  return (
    <Frame>
      <text x="30" y="46" fontSize="10" fill={F}>a blocchi</text>
      {blocked.map((c, i) => <rect key={i} x={30 + i * 30} y="54" width="24" height="24" rx="6" fill={colors[c]} fillOpacity="0.35" />)}
      <text x="30" y="112" fontSize="10" fill={F}>alternato</text>
      {mixed.map((c, i) => <rect key={i} x={30 + i * 30} y="120" width="24" height="24" rx="6" fill={colors[c]} fillOpacity="0.7" style={glow(2.6, i * 0.2)} />)}
    </Frame>
  );
}

function Dual() {
  return (
    <Frame>
      <rect x="30" y="40" width="110" height="100" rx="14" fill="none" stroke={F} strokeOpacity="0.4" />
      {[60, 78, 96, 114].map((y, i) => <line key={y} x1="46" y1={y} x2={120 - (i % 2) * 20} y2={y} stroke={F} strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />)}
      <rect x="180" y="40" width="110" height="100" rx="14" fill={A} fillOpacity="0.08" stroke={A} strokeOpacity="0.5" />
      <ellipse cx="235" cy="90" rx="38" ry="24" fill="none" stroke={A} strokeWidth="2" />
      <path d="M205 90 q8 -16 15 0 t15 0 t15 0 t10 0" fill="none" stroke={G} strokeWidth="2" style={draw(80, 2)} />
      <path d="M144 90 h30" stroke={G} strokeWidth="2" style={glow(2)} />
      <text x="160" y="164" textAnchor="middle" fontSize="11" fill={F}>parole + immagine = due vie di recupero</text>
    </Frame>
  );
}

function Why() {
  return (
    <Frame>
      {["Che cosa?", "Perché?", "Perché proprio così?"].map((t, i) => (
        <g key={t} style={rise(4.5, i * 1.1)}>
          <rect x={40 + i * 30} y={34 + i * 40} width={130 + i * 20} height="28" rx="14" fill={i === 2 ? G : A} fillOpacity="0.13" stroke={i === 2 ? G : A} strokeOpacity="0.6" />
          <text x={54 + i * 30} y={52 + i * 40} fontSize="11" fill={i === 2 ? G : "#cfe3ff"}>{t}</text>
        </g>
      ))}
    </Frame>
  );
}

function SelfExplain() {
  return (
    <Frame>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="30" y={34 + i * 42} width="140" height="30" rx="8" fill="none" stroke={F} strokeOpacity="0.4" />
          <text x="42" y={53 + i * 42} fontSize="11" fill={F}>Passaggio {i + 1}</text>
          <path d={`M176 ${49 + i * 42} h26`} stroke={A} strokeOpacity="0.6" />
          <g style={rise(4, i * 1.2)}>
            <rect x="208" y={36 + i * 42} width="86" height="26" rx="13" fill={A} fillOpacity="0.14" stroke={A} strokeOpacity="0.6" />
            <text x="220" y={53 + i * 42} fontSize="10" fill="#cfe3ff">perché…</text>
          </g>
        </g>
      ))}
    </Frame>
  );
}

function Cornell() {
  return (
    <Frame>
      <rect x="70" y="20" width="180" height="140" rx="10" fill="none" stroke={F} strokeOpacity="0.5" />
      <line x1="125" y1="20" x2="125" y2="125" stroke={A} strokeOpacity="0.6" />
      <line x1="70" y1="125" x2="250" y2="125" stroke={A} strokeOpacity="0.6" />
      {[40, 64, 88].map((y, i) => <line key={y} x1="80" y1={y} x2="115" y2={y} stroke={G} strokeWidth="4" strokeLinecap="round" style={glow(2.4, i * 0.4)} />)}
      {[36, 50, 64, 78, 92, 106].map((y, i) => <line key={y} x1="135" y1={y} x2={240 - (i % 3) * 18} y2={y} stroke={F} strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" style={draw(110, 2.4, i * 0.15)} />)}
      <line x1="80" y1="142" x2="220" y2="142" stroke={A} strokeWidth="4" strokeLinecap="round" style={draw(140, 2.4, 1)} />
    </Frame>
  );
}

function ConceptMapArt() {
  const n: [number, number][] = [[160, 50], [80, 100], [240, 100], [120, 150], [210, 150]];
  const e = [[0, 1], [0, 2], [1, 3], [2, 4], [1, 2]];
  return (
    <Frame>
      {e.map(([a, b], i) => <line key={i} x1={n[a][0]} y1={n[a][1]} x2={n[b][0]} y2={n[b][1]} stroke={A} strokeOpacity="0.5" strokeWidth="1.5" style={draw(120, 2, i * 0.3)} />)}
      {n.map(([x, y], i) => <rect key={i} x={x - 30} y={y - 12} width="60" height="24" rx="12" fill={i === 0 ? G : A} fillOpacity={i === 0 ? 0.2 : 0.12} stroke={i === 0 ? G : A} strokeOpacity="0.7" />)}
    </Frame>
  );
}

function Oral() {
  return (
    <Frame>
      <rect x="140" y="40" width="40" height="66" rx="20" fill={A} fillOpacity="0.14" stroke={A} />
      <path d="M126 92 c0 26 68 26 68 0 M160 118 v20 M140 140 h40" fill="none" stroke={A} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i} style={glow(1.8, i * 0.3)}>
          <path d={`M${110 - i * 16} ${60 - i * 6} q-12 ${18 + i * 6} 0 ${36 + i * 12}`} fill="none" stroke={G} strokeWidth="2" />
          <path d={`M${210 + i * 16} ${60 - i * 6} q12 ${18 + i * 6} 0 ${36 + i * 12}`} fill="none" stroke={G} strokeWidth="2" />
        </g>
      ))}
    </Frame>
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

export function TechniqueArt({ icon, className }: { icon: Technique["icon"]; className?: string }) {
  const Comp = ART[icon];
  return (
    <div className={cn("overflow-hidden", className)}>
      <Comp />
    </div>
  );
}
