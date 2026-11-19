/**
 * Ranked horizontal bars, one hue, largest first: name, bar on a shared
 * baseline, value at the tip. Every value is printed, so no tooltip is needed.
 */
export function BarList({
  rows,
  label,
}: {
  rows: { key: string; name: string; value: number; display: string }[];
  label: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul aria-label={label} className="space-y-3">
      {rows.map((r) => (
        <li
          key={r.key}
          className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,10rem)_1fr_auto]"
        >
          <span className="truncate" title={r.name}>
            {r.name}
          </span>
          <span className="min-w-0" aria-hidden>
            <span
              className="block h-3 rounded-r-[4px] bg-viz-series"
              style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 2 : 0 }}
            />
          </span>
          <span className="text-right font-medium whitespace-nowrap tabular-nums">{r.display}</span>
        </li>
      ))}
    </ul>
  );
}
