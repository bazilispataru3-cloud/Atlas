"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Inline SVG charts. Conventions (dataviz skill): one y-axis, recessive
// hairline grid, round tick values, thin marks with 4px rounded data ends,
// 2px surface gaps between stacked segments, a legend for ≥ 2 series, text in
// text tokens (never the series colour), a tooltip that is never the only way
// to read a value (keyboard + screen-reader table), and an explicit empty state.
// Charts render at their real pixel width, so labels stay 11–12px on phones.

export interface Series {
  key: string;
  label: string;
  color: string;
}

const SURFACE = "#11141a";
const GRID = "rgb(196 210 255 / 0.07)";
/** Axis and annotation labels: 12px rendered, the minimum readable size on phones. */
const LABEL = 12;

export function Legend({ series, className }: { series: Series[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted", className)}>
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function useWidth(fallback = 560) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(220, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Round axis: ticks are whole steps. `steps` lists the allowed step sizes in
 * data units (e.g. 15, 30, 60, 120 minutes); otherwise 1-2-5 × 10ⁿ, never below 1.
 */
export function niceScale(max: number, count = 3, steps?: number[]) {
  const target = Math.max(max, 0) / count;
  let step: number;
  if (steps?.length) {
    step = steps.find((s) => s >= target) ?? steps[steps.length - 1] * Math.ceil(target / steps[steps.length - 1]);
  } else {
    const pow = 10 ** Math.floor(Math.log10(Math.max(target, 1)));
    const n = target / pow;
    step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
  }
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return { max: top, ticks };
}

/** Approximate rendered width of a label in IBM Plex Sans at `size` px. */
const textWidth = (s: string, size = LABEL) => s.length * size * 0.58;

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 84), width - 84);
  return (
    <div
      className="surface-overlay pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-control px-3 py-2 text-xs animate-fade-in"
      style={{ left, top: Math.max(y - 10, 36) }}
      aria-hidden
    >
      {children}
    </div>
  );
}

function useChartKeys(count: number, initial: () => number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!count) return;
    const cur = active ?? initial();
    let next = cur;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(count - 1, cur + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, cur - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else if (e.key === "Escape") return setActive(null);
    else return;
    e.preventDefault();
    setActive(next);
  };
  return { active, setActive, onKeyDown, onFocus: () => setActive(initial()), onBlur: () => setActive(null) };
}

/** Stacked vertical bars (e.g. study minutes per day split by subject). */
export function StackedBars({
  data,
  series,
  height = 190,
  format = (v) => String(v),
  ariaLabel,
  tickSteps,
  emptyLabel = "Ancora nessun dato in questo periodo",
}: {
  data: { label: string; sublabel?: string; values: Record<string, number>; highlight?: boolean }[];
  series: Series[];
  height?: number;
  format?: (v: number) => string;
  ariaLabel: string;
  /** Allowed y-axis steps in data units, e.g. [15, 30, 60, 120] for minutes. */
  tickSteps?: number[];
  emptyLabel?: string;
}) {
  const [ref, width] = useWidth();
  const totals = data.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const empty = totals.every((t) => t <= 0);
  // With explicit steps (e.g. minutes) 4 ticks hug the data better than 3.
  const scale = niceScale(Math.max(...totals, 0), tickSteps ? 4 : 3, tickSteps);
  const ticks = empty ? [0] : scale.ticks;
  const padL = empty ? 8 : Math.ceil(Math.max(...ticks.map((t) => textWidth(format(t))))) + 14;
  const pad = { l: padL, r: 6, t: 12, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(6, Math.min(28, slot * 0.58));
  const y = (v: number) => pad.t + innerH - (v / scale.max) * innerH;
  const todayIndex = data.findIndex((d) => d.highlight);
  // Day labels thin out when the slots are narrower than the labels (e.g. 14 days on a phone),
  // counting from today (or from the first bar) so that one is always shown.
  const labelEvery = Math.max(1, Math.ceil((Math.max(...data.map((d) => textWidth(d.label))) + 8) / Math.max(1, slot)));
  const labelAnchor = todayIndex >= 0 ? todayIndex : 0;
  const showLabel = (i: number) => (((labelAnchor - i) % labelEvery) + labelEvery) % labelEvery === 0;
  const keys = useChartKeys(data.length, () => (todayIndex >= 0 ? todayIndex : data.length - 1));
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? keys.active;
  const describe = (i: number) =>
    `${data[i].sublabel ?? data[i].label}: ${
      totals[i] > 0
        ? series.length > 1
          ? series
              .filter((s) => (data[i].values[s.key] ?? 0) > 0)
              .map((s) => `${s.label} ${format(data[i].values[s.key] ?? 0)}`)
              .join(", ") + `; totale ${format(totals[i])}`
          : format(totals[i])
        : "nessuna attività"
    }`;

  return (
    <div
      ref={ref}
      className="relative rounded-lg outline-offset-4"
      tabIndex={0}
      role="group"
      aria-label={`${ariaLabel}. Usa le frecce per leggere i valori.`}
      onKeyDown={keys.onKeyDown}
      onFocus={keys.onFocus}
      onBlur={keys.onBlur}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block max-w-full" aria-hidden onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgb(196 210 255 / 0.14)" : GRID} />
            {!empty && (
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={LABEL} className="fill-fg-subtle tabular-nums">
                {format(t)}
              </text>
            )}
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          let acc = 0;
          const segs = series.map((s) => ({ s, v: d.values[s.key] ?? 0 })).filter((x) => x.v > 0);
          const dim = shown !== null && shown !== i;
          return (
            <g key={`${d.label}-${i}`} onMouseEnter={() => setHover(i)}>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={innerH + pad.b} fill={shown === i ? "rgb(196 210 255 / 0.04)" : "transparent"} rx={6} />
              <g className="chart-bar" style={{ animationDelay: `${i * 35}ms`, opacity: dim ? 0.45 : 1, transition: "opacity 150ms" }}>
                {segs.map(({ s, v }, k) => {
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  const h = Math.max(1, y0 - y1 - (k < segs.length - 1 ? 2 : 0));
                  const isTop = k === segs.length - 1;
                  const r = isTop ? Math.min(4, h, barW / 2) : 0;
                  const x0 = cx - barW / 2;
                  const top = y1;
                  const path = isTop
                    ? `M${x0},${top + h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${top + h} Z`
                    : `M${x0},${top} H${x0 + barW} V${top + h} H${x0} Z`;
                  return <path key={s.key} d={path} fill={s.color} />;
                })}
              </g>
              <text x={cx} y={height - 9} textAnchor="middle" fontSize={12} className={d.highlight ? "fill-fg font-semibold" : "fill-fg-subtle"}>
                {showLabel(i) ? d.label : ""}
              </text>
            </g>
          );
        })}
        {empty && (
          <text x={pad.l + innerW / 2} y={pad.t + innerH / 2} textAnchor="middle" fontSize={13} className="fill-fg-subtle">
            {emptyLabel}
          </text>
        )}
      </svg>
      {shown !== null && !empty && (
        <Tooltip x={pad.l + slot * shown + slot / 2} y={y(totals[shown])} width={width}>
          <div className="font-medium text-fg">{data[shown].sublabel ?? data[shown].label}</div>
          {totals[shown] === 0 ? (
            <div className="mt-0.5 text-fg-muted">Nessuna attività</div>
          ) : series.length === 1 ? (
            <div className="mt-0.5 text-fg">{format(totals[shown])}</div>
          ) : (
            <>
              {series
                .filter((s) => (data[shown].values[s.key] ?? 0) > 0)
                .map((s) => (
                  <div key={s.key} className="mt-0.5 flex items-center justify-between gap-4 text-fg-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="tabular-nums text-fg">{format(data[shown].values[s.key] ?? 0)}</span>
                  </div>
                ))}
              <div className="mt-1 flex justify-between border-t border-white/10 pt-1 text-fg-muted">
                <span>Totale</span>
                <span className="tabular-nums text-fg">{format(totals[shown])}</span>
              </div>
            </>
          )}
        </Tooltip>
      )}
      <div className="sr-only" aria-live="polite">
        {keys.active !== null ? describe(keys.active) : ""}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Giorno</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.sublabel ?? d.label}</th>
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
  height = 150,
  ariaLabel,
  format = (v) => String(v),
  emptyLabel,
  seriesLabel,
}: {
  data: { label: string; value: number; sublabel?: string; highlight?: boolean }[];
  color: string;
  height?: number;
  ariaLabel: string;
  format?: (v: number) => string;
  emptyLabel?: string;
  /** Column heading in the screen-reader table (defaults to the chart label). */
  seriesLabel?: string;
}) {
  return (
    <StackedBars
      data={data.map((d) => ({ label: d.label, sublabel: d.sublabel, values: { v: d.value }, highlight: d.highlight }))}
      series={[{ key: "v", label: seriesLabel ?? ariaLabel, color }]}
      height={height}
      ariaLabel={ariaLabel}
      format={format}
      emptyLabel={emptyLabel}
    />
  );
}

/** Line chart with crosshair tooltip. x and y are numeric; one y-axis only. */
export function LineChart({
  series,
  xDomain,
  yDomain,
  height = 230,
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
  const [ref, width] = useWidth();
  const [hx, setHx] = useState<number | null>(null);
  const yt = yTicks ?? Array.from({ length: 3 }, (_, i) => yDomain[0] + ((yDomain[1] - yDomain[0]) * i) / 2);
  const narrow = width < 420;
  const xCount = narrow ? 3 : 5;
  const xt = xTicks ?? Array.from({ length: xCount }, (_, i) => xDomain[0] + ((xDomain[1] - xDomain[0]) * i) / (xCount - 1));
  const padL = Math.ceil(Math.max(...yt.map((t) => textWidth(yFormat(t))))) + (yLabel ? 26 : 12);
  const pad = { l: padL, r: 14, t: 14, b: xLabel ? 40 : 26 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const sx = (x: number) => pad.l + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * innerW;
  const sy = (y: number) => pad.t + innerH - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * innerH;

  // Keyboard steps through the x positions of the first series.
  const xs = useMemo(() => series[0]?.points.map((p) => p.x) ?? [], [series]);
  const stepIdx = xs.length > 24 ? Math.ceil(xs.length / 24) : 1;
  const keyXs = xs.filter((_, i) => i % stepIdx === 0);
  const keys = useChartKeys(keyXs.length, () => 0);
  const cursor = hx ?? (keys.active !== null ? keyXs[keys.active] : null);

  const nearest = useMemo(() => {
    if (cursor === null) return null;
    return series.map((s) => {
      let best = s.points[0];
      for (const p of s.points) if (Math.abs(p.x - cursor) < Math.abs(best.x - cursor)) best = p;
      return { s, p: best };
    });
  }, [cursor, series]);

  return (
    <div
      ref={ref}
      className="relative rounded-lg outline-offset-4"
      tabIndex={0}
      role="group"
      aria-label={`${ariaLabel}. Usa le frecce per leggere i valori.`}
      onKeyDown={keys.onKeyDown}
      onBlur={keys.onBlur}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block max-w-full touch-pan-y"
        aria-hidden
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = e.clientX - rect.left;
          if (px < pad.l || px > width - pad.r) return setHx(null);
          setHx(xDomain[0] + ((px - pad.l) / innerW) * (xDomain[1] - xDomain[0]));
        }}
        onPointerLeave={() => setHx(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {bands?.map((b) => (
          <g key={b.label}>
            <rect x={sx(b.from)} y={pad.t} width={Math.max(0, sx(b.to) - sx(b.from))} height={innerH} fill={b.color} opacity="0.08" />
            <text x={(sx(b.from) + sx(b.to)) / 2} y={pad.t + 13} textAnchor="middle" fontSize={LABEL} className="fill-fg-subtle">
              {b.label}
            </text>
          </g>
        ))}
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} stroke={GRID} />
            <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" fontSize={LABEL} className="fill-fg-subtle tabular-nums">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {xt.map((t, i) => (
          <text
            key={`x${t}`}
            x={sx(t)}
            y={pad.t + innerH + 17}
            textAnchor={i === 0 ? "start" : i === xt.length - 1 ? "end" : "middle"}
            fontSize={LABEL}
            className="fill-fg-subtle tabular-nums"
          >
            {xFormat(t)}
          </text>
        ))}
        {xLabel && (
          <text x={pad.l + innerW / 2} y={height - 5} textAnchor="middle" fontSize={12} className="fill-fg-muted">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={12} y={pad.t + innerH / 2} textAnchor="middle" fontSize={12} className="fill-fg-muted" transform={`rotate(-90 12 ${pad.t + innerH / 2})`}>
            {yLabel}
          </text>
        )}
        {series.map((s) => {
          if (!s.points.length) return null;
          const d = s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
          const area = `${d} L${sx(s.points[s.points.length - 1].x)},${sy(yDomain[0])} L${sx(s.points[0].x)},${sy(yDomain[0])} Z`;
          return (
            <g key={s.key}>
              {series.length === 1 && <path d={area} fill={`url(#${id}-${s.key})`} className="animate-fade-in" />}
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "5 5" : undefined}
                pathLength={s.dashed ? undefined : 1}
                className={s.dashed ? undefined : "chart-line"}
              />
            </g>
          );
        })}
        {markers?.map((m) => {
          const mx = sx(m.x);
          const right = mx + 9 + textWidth(m.label) > width - pad.r;
          return (
            <g key={m.label}>
              <circle cx={mx} cy={sy(m.y)} r="5" fill={m.color ?? "#eceef3"} stroke={SURFACE} strokeWidth="2" />
              <text x={right ? mx - 9 : mx + 9} y={sy(m.y) - 9} textAnchor={right ? "end" : "start"} fontSize={LABEL} className="fill-fg-muted">
                {m.label}
              </text>
            </g>
          );
        })}
        {nearest && cursor !== null && (
          <g>
            <line x1={sx(nearest[0].p.x)} x2={sx(nearest[0].p.x)} y1={pad.t} y2={pad.t + innerH} stroke="rgb(196 210 255 / 0.3)" strokeDasharray="3 3" />
            {nearest.map(({ s, p }) => (
              <circle key={s.key} cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill={s.color} stroke={SURFACE} strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {nearest && cursor !== null && (
        <Tooltip x={sx(nearest[0].p.x)} y={sy(Math.max(...nearest.map((n) => n.p.y)))} width={width}>
          <div className="font-medium text-fg">
            {xLabel ? `${xLabel}: ` : ""}
            {xFormat(nearest[0].p.x)}
          </div>
          {nearest.map(({ s, p }) => (
            <div key={s.key} className="mt-0.5 flex items-center justify-between gap-4 text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tabular-nums text-fg">{yFormat(p.y)}</span>
            </div>
          ))}
        </Tooltip>
      )}
      <div className="sr-only" aria-live="polite">
        {keys.active !== null && nearest
          ? `${xLabel ? `${xLabel} ` : ""}${xFormat(nearest[0].p.x)}: ${nearest.map(({ s, p }) => `${s.label} ${yFormat(p.y)}`).join(", ")}`
          : ""}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Serie</th>
            <th scope="col">{xLabel ?? "x"}</th>
            <th scope="col">{yLabel ?? "y"}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) =>
            s.points
              .filter((_, i) => i % Math.max(1, Math.ceil(s.points.length / 12)) === 0)
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
