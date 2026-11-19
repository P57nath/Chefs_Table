import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export const filterInputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** Plain GET form: filters live in the URL (shareable, works without JS). */
export function FilterForm({
  action,
  children,
  applyLabel,
  resetLabel,
  extra,
}: {
  action: string;
  children: ReactNode;
  applyLabel: string;
  resetLabel: string;
  extra?: ReactNode;
}) {
  return (
    <form
      action={action}
      method="get"
      className="mb-6 grid items-end gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] print:hidden"
    >
      {children}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {applyLabel}
        </Button>
        <Button asChild variant="ghost">
          <Link href={action}>{resetLabel}</Link>
        </Button>
        {extra}
      </div>
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

/** Previous / next links that keep the current filters. */
export function Pager({
  base,
  params,
  page,
  pageSize,
  total,
  labels,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  labels: { prev: string; next: string; summary: string };
}) {
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 0) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };
  const last = Math.max(0, Math.ceil(total / pageSize) - 1);
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{labels.summary}</p>
      <div className="flex gap-2">
        {page > 0 ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={href(page - 1)}>
              <ChevronLeft aria-hidden />
              {labels.prev}
            </Link>
          </Button>
        ) : null}
        {page < last ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={href(page + 1)}>
              {labels.next}
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
