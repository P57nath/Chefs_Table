import { Check } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { filterInputClass } from "../list-controls";
import type { Preset } from "./model";

/** Date range presets (Today / 7 / 30 days) as links, then a custom range form. */
export async function RangePicker({
  preset,
  from,
  to,
}: {
  preset: Preset;
  from: string;
  to: string;
}) {
  const t = await getTranslations("admin.reports");
  const presets: { key: Exclude<Preset, "custom">; label: string }[] = [
    { key: "today", label: t("today") },
    { key: "7d", label: t("last7") },
    { key: "30d", label: t("last30") },
  ];
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
      <nav aria-label={t("rangeLabel")} className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {presets.map((p) => (
          <Link
            key={p.key}
            href={p.key === "today" ? "/admin" : `/admin?range=${p.key}`}
            aria-current={preset === p.key ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              preset === p.key
                ? "bg-card font-semibold shadow-sm"
                : "text-foreground/80 hover:bg-card/60",
            )}
          >
            {preset === p.key ? <Check className="size-4" aria-hidden /> : null}
            {p.label}
          </Link>
        ))}
      </nav>
      <form action="/admin" method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="range" value="custom" />
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">{t("from")}</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className={cn(filterInputClass, "w-40")}
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">{t("to")}</span>
          <input type="date" name="to" defaultValue={to} className={cn(filterInputClass, "w-40")} />
        </label>
        <Button type="submit" variant={preset === "custom" ? "default" : "secondary"}>
          {t("applyRange")}
        </Button>
      </form>
    </div>
  );
}
