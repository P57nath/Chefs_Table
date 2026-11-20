/** Value-led tooltip anchored above a data position (percent of the chart box). */
export function ChartTooltip({
  leftPct,
  topPct,
  value,
  label,
}: {
  leftPct: number;
  topPct: number;
  value: string;
  label: string;
}) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-border bg-popover px-3 py-2 text-sm whitespace-nowrap shadow-float"
      style={{ left: `${Math.min(92, Math.max(8, leftPct))}%`, top: `${topPct}%` }}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className="h-0.5 w-3 rounded bg-viz-series" />
        <strong className="font-medium tabular-nums">{value}</strong>
      </span>
      <span className="block text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
