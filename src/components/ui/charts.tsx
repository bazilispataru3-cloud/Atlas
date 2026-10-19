"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Inline SVG charts. Conventions: one y-axis, recessive grid, thin marks with
// 4px rounded data ends, 2px surface gaps between stacked segments, legend for
// ≥ 2 series, hover tooltip on every mark and a screen-reader table.

export interface Series {
  key: string;
  label: string;
  color: string;
}

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-fg-muted", className)}>
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function Tooltip({ xPct, yPct, children }: { xPct: number; yPct: number; children: ReactNode }) {
  const left = Math.min(Math.max(xPct, 14), 86);
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-ink-800/95 px-3 py-2 text-[12px] shadow-xl backdrop-blur"
      style={{ left: `${left}%`, top: `calc(${Math.max(yPct, 8)}% - 8px)` }}
      role="status"
    >
      {children}
    </div>
  );
}

/** Stacked vertical bars (e.g. study minutes per day split by subject). */
export function StackedBars({
  data,
  series,
  height = 180,
  format = (v) => String(v),
  ariaLabel,
}: {
  data: { label: string; sublabel?: string; values: Record<string, number>; highlight?: boolean }[];
  series: Series[];
  height?: number;
  format?: (v: number) => string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 560;
  const pad = { l: 34, r: 8, t: 10, b: 30 };
  const totals = data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const slot = innerW / data.length;
  const barW = Math.min(34, slot * 0.56);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-fg-subtle font-mono" fontSize="10">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          let acc = 0;
          const segs = series
            .map((s) => ({ s, v: d.values[s.key] ?? 0 }))
            .filter((x) => x.v > 0);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.label}: ${format(totals[i])}`}>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={innerH} fill={hover === i ? "rgba(255,255,255,0.03)" : "transparent"} />
              {segs.map(({ s, v }, k) => {
                const y0 = y(acc);
                acc += v;
                const y1 = y(acc);
                const h = Math.max(0, y0 - y1 - (k < segs.length - 1 ? 2 : 0));
                const isTop = k === segs.length - 1;
                const r = isTop ? Math.min(4, h, barW / 2) : 0;
                const x0 = cx - barW / 2;
                const top = y1;
                const path = isTop
                  ? `M${x0},${top + h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${top + h} Z`
                  : `M${x0},${top} H${x0 + barW} V${top + h} H${x0} Z`;
                return <path key={s.key} d={path} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.55} />;
              })}
              <text x={cx} y={height - 12} textAnchor="middle" fontSize="11" className={d.highlight ? "fill-fg" : "fill-fg-subtle"}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip xPct={((pad.l + slot * hover + slot / 2) / width) * 100} yPct={(y(totals[hover]) / height) * 100}>
          <div className="font-medium text-fg">{data[hover].sublabel ?? data[hover].label}</div>
          {series.map((s) => (
            <div key={s.key} className="mt-0.5 flex items-center justify-between gap-4 text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-fg">{format(data[hover].values[s.key] ?? 0)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-white/10 pt-1 text-fg-muted">
            <span>Totale</span>
            <span className="font-mono text-fg">{format(totals[hover])}</span>
          </div>
        </Tooltip>
      )}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>Giorno</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.sublabel ?? d.label}</td>
              {series.map((s) => (
                <td key={s.key}>{format(d.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Simple vertical bars (single series), e.g. flashcards due per day. */
export function Bars({
  data,
  color,
  height = 140,
  ariaLabel,
  format = (v) => String(v),
}: {
  data: { label: string; value: number; sublabel?: string }[];
  color: string;
  height?: number;
  ariaLabel: string;
  format?: (v: number) => string;
}) {
  return (
    <StackedBars
      data={data.map((d) => ({ label: d.label, sublabel: d.sublabel, values: { v: d.value } }))}
      series={[{ key: "v", label: ariaLabel, color }]}
      height={height}
      ariaLabel={ariaLabel}
      format={format}
    />
  );
}

/** Line chart with crosshair tooltip. x and y are numeric; one y-axis only. */
export function LineChart({
  series,
  xDomain,
  yDomain,
  height = 220,
  xLabel,
  yLabel,
  xFormat = (v) => String(v),
  yFormat = (v) => String(v),
  markers,
  bands,
  ariaLabel,
  xTicks,
  yTicks,
}: {
  series: (Series & { points: { x: number; y: number }[]; dashed?: boolean })[];
  xDomain: [number, number];
  yDomain: [number, number];
  height?: number;
  xLabel?: string;
  yLabel?: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  markers?: { x: number; y: number; label: string; color?: string }[];
  bands?: { from: number; to: number; label: string; color: string }[];
  ariaLabel: string;
  xTicks?: number[];
  yTicks?: number[];
}) {
  const id = useId();
  const [hx, setHx] = useState<number | null>(null);
  const width = 560;
  const pad = { l: 44, r: 12, t: 12, b: 38 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const sx = (x: number) => pad.l + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * innerW;
  const sy = (y: number) => pad.t + innerH - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * innerH;
  const xt = xTicks ?? Array.from({ length: 5 }, (_, i) => xDomain[0] + ((xDomain[1] - xDomain[0]) * i) / 4);
  const yt = yTicks ?? Array.from({ length: 3 }, (_, i) => yDomain[0] + ((yDomain[1] - yDomain[0]) * i) / 2);

  const nearest = useMemo(() => {
    if (hx === null) return null;
    return series.map((s) => {
      let best = s.points[0];
      for (const p of s.points) if (Math.abs(p.x - hx) < Math.abs(best.x - hx)) best = p;
      return { s, p: best };
    });
  }, [hx, series]);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          if (px < pad.l || px > width - pad.r) return setHx(null);
          setHx(xDomain[0] + ((px - pad.l) / innerW) * (xDomain[1] - xDomain[0]));
        }}
        onPointerLeave={() => setHx(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {bands?.map((b) => (
          <g key={b.label}>
            <rect x={sx(b.from)} y={pad.t} width={Math.max(0, sx(b.to) - sx(b.from))} height={innerH} fill={b.color} opacity="0.08" />
            <text x={(sx(b.from) + sx(b.to)) / 2} y={pad.t + 12} textAnchor="middle" fontSize="10" className="fill-fg-subtle">
              {b.label}
            </text>
          </g>
        ))}
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="10" className="fill-fg-subtle font-mono">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={height - 20} textAnchor="middle" fontSize="10" className="fill-fg-subtle font-mono">
            {xFormat(t)}
          </text>
        ))}
        {xLabel && (
          <text x={pad.l + innerW / 2} y={height - 4} textAnchor="middle" fontSize="10.5" className="fill-fg-subtle">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={10} y={pad.t + innerH / 2} textAnchor="middle" fontSize="10.5" className="fill-fg-subtle" transform={`rotate(-90 10 ${pad.t + innerH / 2})`}>
            {yLabel}
          </text>
        )}
        {series.map((s) => {
          const d = s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
          const area = `${d} L${sx(s.points.at(-1)!.x)},${sy(yDomain[0])} L${sx(s.points[0].x)},${sy(yDomain[0])} Z`;
          return (
            <g key={s.key}>
              {series.length === 1 && <path d={area} fill={`url(#${id}-${s.key})`} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "5 5" : undefined} />
            </g>
          );
        })}
        {markers?.map((m) => (
          <g key={m.label}>
            <circle cx={sx(m.x)} cy={sy(m.y)} r="5" fill={m.color ?? "#f5f5f7"} stroke="#111116" strokeWidth="2" />
            <text x={sx(m.x) + 8} y={sy(m.y) - 8} fontSize="10.5" className="fill-fg-muted">
              {m.label}
            </text>
          </g>
        ))}
        {nearest && hx !== null && (
          <g>
            <line x1={sx(nearest[0].p.x)} x2={sx(nearest[0].p.x)} y1={pad.t} y2={pad.t + innerH} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
            {nearest.map(({ s, p }) => (
              <circle key={s.key} cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill={s.color} stroke="#111116" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {nearest && hx !== null && (
        <Tooltip xPct={(sx(nearest[0].p.x) / width) * 100} yPct={(sy(Math.max(...nearest.map((n) => n.p.y))) / height) * 100}>
          <div className="font-medium text-fg">{xLabel ? `${xLabel}: ` : ""}{xFormat(nearest[0].p.x)}</div>
          {nearest.map(({ s, p }) => (
            <div key={s.key} className="mt-0.5 flex items-center justify-between gap-4 text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-mono text-fg">{yFormat(p.y)}</span>
            </div>
          ))}
        </Tooltip>
      )}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {series.map((s) =>
            s.points
              .filter((_, i) => i % Math.ceil(s.points.length / 12) === 0)
              .map((p) => (
                <tr key={`${s.key}-${p.x}`}>
                  <td>{s.label}</td>
                  <td>{xFormat(p.x)}</td>
                  <td>{yFormat(p.y)}</td>
                </tr>
              )),
          )}
        </tbody>
      </table>
    </div>
  );
}
