import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The product's signature: a paper order slip like the ones on a kitchen pass
 * rail. A plain raised surface with a perforated edge; the depth comes from a
 * soft neutral drop shadow on the wrapper (a mask would clip a box-shadow).
 * Used for the landing preview, kitchen tickets and the guest bill.
 */
export function Docket({
  edge = "top",
  className,
  innerClassName,
  children,
}: {
  edge?: "top" | "bottom" | "both";
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("docket-shadow", className)}>
      <div className={cn("bg-surface", `docket-edge-${edge}`, innerClassName)}>{children}</div>
    </div>
  );
}

/**
 * Table or order number set like a docket stamp: mono, tabular, e.g. `T·04`.
 * Labels that already carry letters (e.g. "Patio 2") are shown as they are.
 */
export function DocketNumber({
  prefix,
  value,
  className,
}: {
  prefix?: string;
  value: string | number;
  className?: string;
}) {
  const text = String(value);
  return (
    <span className={cn("font-mono font-medium tabular-nums", className)}>
      {prefix ? (
        <>
          {prefix}
          <span aria-hidden className="opacity-50">
            ·
          </span>
        </>
      ) : null}
      {text}
    </span>
  );
}
