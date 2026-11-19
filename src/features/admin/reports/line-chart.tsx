"use client";

import type { Datum } from "./column-chart";
import { niceTicks } from "./model";
import { ChartTooltip } from "./tooltip";
import { useChartCursor } from "./use-chart-cursor";
import { useWidth } from "./use-width";

const H = 220;
const PAD = { top: 16, right: 16, bottom: 26, left: 48 };

/**
 * Single-series trend: 2px line, 10% area wash, crosshair that snaps to the
 * nearest day, end marker with a surface ring, value label at the end only.
 */
export function LineChart({
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
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0), 4, 100);
  const top = ticks[ticks.length - 1] ?? 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (data.length <= 1 ? innerW / 2 : (innerW * i) / (data.length - 1));
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const { active, handlers } = useChartCursor(data.length, x, W);
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`);
  const line = `M${points.join(" L")}`;
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = data.length - 1;
  const lastDatum = data[last];
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
        {data.map((d, i) =>
          (last - i) % labelEvery === 0 ? (
            <text
              key={d.key}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {d.label}
            </text>
          ) : null,
        )}
        <path d={area} className="fill-viz-series" opacity={0.1} />
        <path
          d={line}
          className="fill-none stroke-viz-series"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {a && active !== null ? (
          <>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={y(0)}
              className="stroke-muted-foreground"
              strokeWidth={1}
            />
            <circle
              cx={x(active)}
              cy={y(a.value)}
              r={4}
              className="fill-viz-series stroke-card"
              strokeWidth={2}
            />
          </>
        ) : null}
        {lastDatum ? (
          <>
            <circle
              cx={x(last)}
              cy={y(lastDatum.value)}
              r={4}
              className="fill-viz-series stroke-card"
              strokeWidth={2}
            />
            {active === null ? (
              <text
                x={x(last) - 8}
                y={y(lastDatum.value) - 10}
                textAnchor="end"
                className="fill-foreground stroke-card text-[12px] font-semibold tabular-nums [paint-order:stroke]"
                strokeWidth={4}
                strokeLinejoin="round"
              >
                {format(lastDatum.value)}
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
      {a && active !== null ? (
        <ChartTooltip
          leftPct={(x(active) / W) * 100}
          topPct={(y(a.value) / H) * 100}
          value={format(a.value)}
          label={a.label}
        />
      ) : null}
    </div>
  );
}
