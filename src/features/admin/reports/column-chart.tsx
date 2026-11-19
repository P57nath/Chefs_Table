"use client";

import { niceTicks } from "./model";
import { ChartTooltip } from "./tooltip";
import { useChartCursor } from "./use-chart-cursor";
import { useWidth } from "./use-width";

export interface Datum {
  key: string;
  label: string;
  value: number;
}

const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 40 };

/** Column with a 4px rounded data end and a square foot on the baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Single-series column chart (≤ 24px columns, hairline grid, recessive
 * axis). Hover / arrow keys show one tooltip; the card's table view holds
 * every value.
 */
export function ColumnChart({
  data,
  format,
  tick,
  labelEvery = 1,
  ariaLabel,
}: {
  data: Datum[];
  format: (v: number) => string;
  tick: (v: number) => string;
  labelEvery?: number;
  ariaLabel: string;
}) {
  const { ref, width: W } = useWidth<HTMLDivElement>();
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0));
  const top = ticks[ticks.length - 1] ?? 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / Math.max(1, data.length);
  const colW = Math.min(24, band * 0.6);
  const cx = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const { active, handlers } = useChartCursor(data.length, cx, W);
  const a = active !== null ? data[active] : null;

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block h-auto w-full touch-pan-y overflow-visible rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        role="img"
        aria-label={ariaLabel}
        {...handlers}
      >
        {ticks.map((tv) => (
          <g key={tv}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tv)}
              y2={y(tv)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(tv)}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {tick(tv)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = (d.value / top) * innerH;
          return (
            <g key={d.key}>
              {h > 0 ? (
                <path
                  d={columnPath(cx(i) - colW / 2, y(d.value), colW, h)}
                  className="fill-viz-series transition-opacity"
                  opacity={active === null || active === i ? 1 : 0.55}
                />
              ) : null}
              {i % labelEvery === 0 ? (
                <text
                  x={cx(i)}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {a && active !== null ? (
        <ChartTooltip
          leftPct={(cx(active) / W) * 100}
          topPct={(y(a.value) / H) * 100}
          value={format(a.value)}
          label={a.label}
        />
      ) : null}
    </div>
  );
}
