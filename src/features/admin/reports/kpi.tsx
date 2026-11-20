import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stat tile: label, value, optional change vs the previous period. The
 * delta is an icon + signed text (never colour alone); `upIsGood` decides
 * whether a rise is good (revenue) or bad (waiting time).
 */
export function Kpi({
  label,
  value,
  delta,
  deltaText,
  upIsGood = true,
  hero = false,
  note,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaText?: string;
  upIsGood?: boolean;
  hero?: boolean;
  note?: string;
}) {
  const good = delta === null || delta === undefined || delta === 0 ? null : delta > 0 === upIsGood;
  const Icon = !delta ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", hero && "sm:col-span-2")}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 font-sans font-medium", hero ? "text-5xl" : "text-3xl")}>{value}</dd>
      {deltaText ? (
        <dd
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-sm font-medium",
            good === null ? "text-muted-foreground" : good ? "text-success" : "text-ember",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {deltaText}
        </dd>
      ) : null}
      {note ? <dd className="mt-2 text-sm text-muted-foreground">{note}</dd> : null}
    </div>
  );
}
