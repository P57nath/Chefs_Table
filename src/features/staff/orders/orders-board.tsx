"use client";

import { ClipboardList } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { SegmentedControl } from "@/components/common/segmented-control";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard } from "@/components/states/skeletons";
import { localizeDigits } from "@/lib/digits";
import { asAppError } from "@/lib/errors";
import { useMediaQuery } from "@/lib/use-media-query";

import { COLUMNS, groupByColumn, type ColumnKey } from "../board-model";
import { useBoardOrders } from "../queries";

import { BoardCard } from "./board-card";
import { OrderSheet } from "./order-sheet";

const COL_LABEL: Record<
  ColumnKey,
  "colNew" | "colConfirmed" | "colKitchen" | "colReady" | "colServed"
> = {
  new: "colNew",
  confirmed: "colConfirmed",
  kitchen: "colKitchen",
  ready: "colReady",
  served: "colServed",
};

/** Kanban: New · Confirmed · In kitchen · Ready · Served (today). Tabs on phones. */
export function OrdersBoard() {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const wide = useMediaQuery("(min-width: 768px)", true);
  const orders = useBoardOrders();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ColumnKey>("new");
  const columns = useMemo(() => groupByColumn(orders.data ?? []), [orders.data]);
  const selected = orders.data?.find((o) => o.id === selectedId) ?? null;

  if (orders.isPending) {
    return (
      <div
        role="status"
        aria-label={tCommon("loading")}
        className="grid gap-3 p-4 md:grid-cols-5 md:p-6"
      >
        {COLUMNS.map((c) => (
          <SkeletonCard key={c.key} />
        ))}
      </div>
    );
  }
  if (orders.isError) {
    return (
      <ErrorState
        title={t("boardErrorTitle")}
        variant={asAppError(orders.error).network ? "offline" : "error"}
        onRetry={() => void orders.refetch()}
        retrying={orders.isFetching}
      />
    );
  }
  if ((orders.data ?? []).length === 0) {
    return (
      <EmptyState icon={ClipboardList} title={t("boardEmptyTitle")} body={t("boardEmptyBody")} />
    );
  }

  const visible = wide ? COLUMNS : COLUMNS.filter((c) => c.key === tab);
  return (
    <div className="space-y-3 p-4 md:p-6">
      {!wide ? (
        <SegmentedControl<ColumnKey>
          label={t("navOrders")}
          size="sm"
          value={tab}
          onChange={setTab}
          className="w-full justify-between overflow-x-auto"
          options={COLUMNS.map((c) => ({
            value: c.key,
            label: `${t(COL_LABEL[c.key])} ${localizeDigits(columns[c.key].length, locale)}`,
          }))}
        />
      ) : null}
      <div
        className={
          wide
            ? "grid auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-3 overflow-x-auto"
            : "space-y-3"
        }
      >
        {visible.map((c) => (
          <section
            key={c.key}
            aria-labelledby={`col-${c.key}`}
            className="flex min-w-0 flex-col gap-3 rounded-2xl bg-muted/50 p-2"
          >
            <h2
              id={`col-${c.key}`}
              className={
                wide ? "flex items-center justify-between px-1 pt-1 text-sm font-medium" : "sr-only"
              }
            >
              {t(COL_LABEL[c.key])}
              <span className="rounded-sm bg-surface px-1.5 py-0.5 font-mono tabular-nums">
                {localizeDigits(columns[c.key].length, locale)}
              </span>
            </h2>
            {columns[c.key].length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t("columnEmpty")}
              </p>
            ) : (
              <ol className="space-y-3">
                {columns[c.key].map((o) => (
                  <li key={o.id}>
                    <BoardCard order={o} onOpen={(order) => setSelectedId(order.id)} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
      <OrderSheet order={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
