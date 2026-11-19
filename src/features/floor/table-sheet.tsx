"use client";

import { Check, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ResponsiveSheet } from "@/components/common/responsive-sheet";
import { StatusPill } from "@/components/common/status-pill";
import { Timer } from "@/components/common/timer";
import { SkeletonCard } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { allowedActions } from "@/features/staff/board-model";
import { LinesEditor } from "@/features/staff/orders/lines-editor";
import { OrderActionsBar } from "@/features/staff/orders/order-actions-bar";
import { useStaff } from "@/features/staff/staff-context";
import { localizeDigits } from "@/lib/digits";
import { formatAge, formatClock } from "@/lib/time";
import { useNow } from "@/lib/use-now";

import { BillPanel } from "./bill-panel";
import { useResolveRequest, useSessionOrders } from "./floor-data";
import { tableStatus } from "./status";
import type { FloorTable } from "./types";

/** Everything about one table: requests, orders (with actions), bill, payment, close. */
export function TableSheet({ table, onClose }: { table: FloorTable | null; onClose: () => void }) {
  const t = useTranslations("floor");
  const tStaff = useTranslations("staff");
  const locale = useLocale();
  const now = useNow();
  const { staff } = useStaff();
  const session = table?.session ?? null;
  const orders = useSessionOrders(session?.id ?? null);
  const resolve = useResolveRequest();
  const status = table ? tableStatus(table, now ?? 0) : null;

  return (
    <ResponsiveSheet
      open={table !== null}
      onClose={onClose}
      title={table ? t("tableTitle", { label: table.label }) : ""}
      description={
        table && status ? (
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill kind="table" state={status.state} size="sm" />
            {session ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-4" aria-hidden />
                  {t("guests", { count: session.guest_count })}
                </span>
                <span>
                  ·{" "}
                  {t("seatedFor", {
                    time: now === null ? "" : formatAge(session.opened_at, now, locale),
                  })}
                </span>
              </>
            ) : (
              <span>{t("seats", { count: table.seats })}</span>
            )}
          </span>
        ) : null
      }
    >
      {!table ? null : !session ? (
        <div className="space-y-2 py-8 text-center">
          <p className="font-display text-xl font-semibold">{t("freeTitle")}</p>
          <p className="text-muted-foreground">{t("freeBody")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {session.open_requests.length > 0 ? (
            <section aria-labelledby="sheet-requests" className="space-y-2">
              <h3 id="sheet-requests" className="font-semibold">
                {t("requests")}
              </h3>
              <ul className="space-y-2">
                {session.open_requests.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-ember/40 bg-ember/8 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{tStaff(`req_${r.type}`)}</p>
                      {r.note ? <p className="text-sm">{r.note}</p> : null}
                      <Timer
                        since={r.created_at}
                        warnAtMin={1}
                        lateAtMin={3}
                        className="text-sm font-semibold"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resolve.mutate(r.id)}
                      disabled={resolve.isPending && resolve.variables === r.id}
                    >
                      <Check aria-hidden />
                      {tStaff("resolve")}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="sheet-orders" className="space-y-3">
            <h3 id="sheet-orders" className="font-semibold">
              {t("orders")}
            </h3>
            {orders.isPending ? (
              <SkeletonCard />
            ) : (orders.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
            ) : (
              <ol className="space-y-4">
                {orders.data!.map((o) => (
                  <li key={o.id} className="space-y-3 rounded-2xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold tabular-nums">
                        #{localizeDigits(o.order_no, locale)} · {formatClock(o.placed_at, locale)}
                      </span>
                      <StatusPill kind="order" state={o.status} size="sm" />
                    </div>
                    {o.customer_note ? (
                      <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm">
                        {o.customer_note}
                      </p>
                    ) : null}
                    <LinesEditor
                      key={o.id + o.status}
                      order={o}
                      editable={allowedActions(o.status, staff.role).editLines}
                    />
                    <OrderActionsBar order={o} />
                  </li>
                ))}
              </ol>
            )}
          </section>

          <BillPanel sessionId={session.id} tableLabel={table.label} onClosed={onClose} />
        </div>
      )}
    </ResponsiveSheet>
  );
}
