"use client";

import { ChefHat } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard } from "@/components/states/skeletons";
import { ConnectionBanner } from "@/components/states/connection-banner";
import { useStaff } from "@/features/staff/staff-context";
import { StartShift } from "@/features/staff/start-shift";
import { localizeDigits } from "@/lib/digits";
import { asAppError } from "@/lib/errors";
import { playChime, vibrate } from "@/lib/sound";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import { useKitchenOrders } from "./kitchen-data";
import { allDay, groupKitchen, newTickets, type KitchenOrder } from "./kitchen-model";
import { KitchenHeader } from "./kitchen-header";
import { Ticket } from "./ticket";

const COLS = [
  { key: "new", label: "colNew", tone: "text-info" },
  { key: "preparing", label: "colPreparing", tone: "text-cooking" },
  { key: "ready", label: "colReady", tone: "text-success" },
] as const;

/** Kitchen display: New · Preparing · Ready (last 10 min) + all-day panel. No modals, no auto-scroll. */
export function KitchenBoard() {
  const t = useTranslations("kitchen");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const now = useNow();
  const { shift, connection } = useStaff();
  const orders = useKitchenOrders();
  const [announcement, setAnnouncement] = useState("");
  const seen = useRef<Set<string> | null>(null);

  // Chime when a ticket newly reaches the kitchen (snapshot diff, never raw events).
  useEffect(() => {
    if (!orders.data) return;
    const fresh = newTickets(seen.current, orders.data);
    seen.current = new Set(orders.data.map((o) => o.id));
    if (fresh.length === 0) return;
    if (shift.sound) playChime("alert");
    if (shift.vibration) vibrate([80, 40, 80]);
    setAnnouncement(
      fresh.map((o) => t("newTicket", { table: o.dining_tables?.label ?? "" })).join(". "),
    );
  }, [orders.data, shift.sound, shift.vibration, t]);

  const columns = useMemo(
    () =>
      groupKitchen(
        orders.data ?? [],
        now ?? 0,
      ) /* before the clock ticks the server already limited ready tickets to 10 min */,
    [orders.data, now],
  );
  const totals = useMemo(() => allDay(orders.data ?? []), [orders.data]);
  const empty = columns.new.length + columns.preparing.length + columns.ready.length === 0;

  let body: React.ReactNode;
  if (orders.isPending) {
    body = (
      <div
        role="status"
        aria-label={tCommon("loading")}
        className="grid flex-1 grid-cols-3 gap-4 p-4"
      >
        {COLS.map((c) => (
          <SkeletonCard key={c.key} className="h-64" />
        ))}
      </div>
    );
  } else if (orders.isError) {
    body = (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState
          title={t("errorTitle")}
          variant={asAppError(orders.error).network ? "offline" : "error"}
          onRetry={() => void orders.refetch()}
        />
      </div>
    );
  } else if (empty) {
    body = (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState icon={ChefHat} title={t("emptyTitle")} body={t("emptyBody")} />
      </div>
    );
  } else {
    body = (
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 p-4">
        {COLS.map((c) => {
          const list: KitchenOrder[] = columns[c.key];
          return (
            <section
              key={c.key}
              aria-labelledby={`kds-${c.key}`}
              className="flex min-h-0 flex-col rounded-2xl bg-surface/60"
            >
              <h2
                id={`kds-${c.key}`}
                className="flex items-baseline justify-between px-4 pt-3 pb-2 text-2xl font-semibold"
              >
                <span className={c.tone}>
                  {t(c.label)}
                  {c.key === "ready" ? (
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      {t("readyHint")}
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums">{localizeDigits(list.length, locale)}</span>
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
                {list.length === 0 ? (
                  <p className="py-10 text-center text-xl text-muted-foreground">
                    {t("columnEmpty")}
                  </p>
                ) : (
                  <ol className="space-y-3">
                    <AnimatePresence initial={false}>
                      {list.map((o) => (
                        <Ticket key={o.id} order={o} />
                      ))}
                    </AnimatePresence>
                  </ol>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="kds flex h-dvh flex-col bg-background text-foreground">
      <KitchenHeader />
      <ConnectionBanner status={connection} className="fixed inset-x-0 top-24 z-50" />
      <div className="flex min-h-0 flex-1">
        <main id="main" className="flex min-w-0 flex-1 flex-col">
          {body}
        </main>
        <aside
          aria-labelledby="all-day"
          className="hidden w-60 shrink-0 flex-col border-l border-border lg:flex xl:w-80"
        >
          <h2 id="all-day" className="px-5 pt-4 pb-2 text-2xl font-semibold">
            {t("allDay")}
          </h2>
          {totals.length === 0 ? (
            <p className="px-5 text-lg text-muted-foreground">{t("allDayEmpty")}</p>
          ) : (
            <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
              {totals.map((row) => (
                <li
                  key={row.name}
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-xl px-2 py-2 text-xl",
                  )}
                >
                  <span className="min-w-0 font-medium">{row.name}</span>
                  <span className="text-3xl font-semibold tabular-nums">
                    {localizeDigits(row.quantity, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
      <p className="sr-only" aria-live="assertive">
        {announcement}
      </p>
      <StartShift />
    </div>
  );
}
