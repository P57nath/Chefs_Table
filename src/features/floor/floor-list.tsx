"use client";

import { Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { MoneyText } from "@/components/common/money-text";
import { StatusPill } from "@/components/common/status-pill";
import { Timer } from "@/components/common/timer";
import { PULSE_CLASS, STATUS_VISUALS, type TableState } from "@/lib/status";
import { localizeDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";

import { ReviewBadge } from "./review-badge";
import { STATE_PRIORITY, type TableStatus } from "./status";
import type { FloorTable } from "./types";

export interface TableWithStatus {
  table: FloorTable;
  status: TableStatus;
}

/** Cards grouped by urgency (Call waiter, New, Ready, …, Free). Best for phones. */
export function FloorList({
  rows,
  onOpen,
}: {
  rows: TableWithStatus[];
  onOpen: (t: FloorTable) => void;
}) {
  const tState = useTranslations("tableState");
  const t = useTranslations("floor");
  const locale = useLocale();
  const groups = STATE_PRIORITY.map((state) => ({
    state,
    rows: rows
      .filter((r) => r.status.state === state)
      .sort((a, b) => a.table.label.localeCompare(b.table.label, undefined, { numeric: true })),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.state} aria-labelledby={`grp-${g.state}`} className="space-y-2">
          <h2
            id={`grp-${g.state}`}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
          >
            <span
              className={cn("size-2.5 rounded-full", STATUS_VISUALS[g.state as TableState].fill)}
              aria-hidden
            />
            {tState(g.state)} · {localizeDigits(g.rows.length, locale)}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.rows.map(({ table, status }) => {
              const visual = STATUS_VISUALS[status.state];
              return (
                <li key={table.table_id}>
                  <button
                    type="button"
                    data-table={table.label}
                    onClick={() => onOpen(table)}
                    aria-label={
                      t("openTable", { label: table.label, state: tState(status.state) }) +
                      (status.counts.toReview > 0 ? ` · ${t("toReview")}` : "")
                    }
                    className={cn(
                      "surface-raised flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      status.overdue
                        ? cn("border-ember text-ember", PULSE_CLASS.fast)
                        : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-xl border-2 font-display text-lg font-semibold text-foreground",
                        visual.tone,
                      )}
                      style={{ borderColor: "currentColor" }}
                    >
                      <span className="text-foreground">{table.label}</span>
                    </span>
                    <span className="min-w-0 flex-1 space-y-1.5 text-foreground">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusPill kind="table" state={status.state} size="sm">
                          {status.since ? <Timer since={status.since} toned={false} /> : null}
                        </StatusPill>
                        {status.counts.toReview > 0 ? <ReviewBadge /> : null}
                      </span>
                      {table.session ? (
                        <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-4" aria-hidden />
                            {localizeDigits(table.session.guest_count, locale)} ·{" "}
                            {t("items", { count: status.counts.items })}
                          </span>
                          {table.session.bill.due_minor > 0 ? (
                            <MoneyText
                              minor={table.session.bill.due_minor}
                              className="font-semibold text-foreground"
                            />
                          ) : null}
                        </span>
                      ) : (
                        <span className="block text-sm text-muted-foreground">
                          {t("seats", { count: table.seats })}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
