"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Card for one chart: title names the single series (no legend needed),
 * and a Chart/Table switch so every value is reachable without hover or colour.
 */
export function ChartCard({
  title,
  subtitle,
  table,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  table: ReactNode;
  children: ReactNode;
  empty?: string | null;
}) {
  const t = useTranslations("admin.reports");
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {!empty ? (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={asTable}
            onClick={() => setAsTable(!asTable)}
            aria-label={asTable ? t("showChart", { title }) : t("showTable", { title })}
          >
            {asTable ? <BarChart3 aria-hidden /> : <Table2 aria-hidden />}
            {asTable ? t("chart") : t("table")}
          </Button>
        ) : null}
      </header>
      {empty ? (
        <p className="grid min-h-40 flex-1 place-items-center text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : asTable ? (
        <div className="max-h-80 overflow-auto">{table}</div>
      ) : (
        children
      )}
    </section>
  );
}

/** Two-column data table used as every chart's accessible twin. */
export function DataTable({
  head,
  rows,
}: {
  head: [string, string] | [string, string, string];
  rows: (string | number)[][];
}) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          {head.map((h, i) => (
            <th
              key={h}
              className={i === 0 ? "py-1.5 font-medium" : "py-1.5 text-right font-medium"}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((c, i) => (
              <td key={i} className={i === 0 ? "py-1.5" : "py-1.5 text-right tabular-nums"}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
