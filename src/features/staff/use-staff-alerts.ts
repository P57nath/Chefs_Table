"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { playChime, vibrate } from "@/lib/sound";

import { diffAlerts, liveItemCount, snapshotOf, type Snapshot } from "./board-model";
import { useStaff } from "./staff-context";
import type { BoardOrder, StaffRequest } from "./types";

/** Chime + vibration + toast for new orders, ready orders and new requests (diff-based). */
export function useStaffAlerts(
  orders: BoardOrder[] | undefined,
  requests: StaffRequest[] | undefined,
) {
  const { shift } = useStaff();
  const t = useTranslations("staff");
  const prev = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!orders || !requests) return;
    const alerts = diffAlerts(prev.current, orders, requests);
    prev.current = snapshotOf(orders, requests);
    if (alerts.length === 0) return;

    const urgent = alerts.some((a) => a.kind !== "ready");
    if (shift.sound) playChime(urgent ? "alert" : "ready");
    if (shift.vibration) vibrate(urgent ? [80, 40, 80] : [60]);

    for (const a of alerts) {
      if (a.kind === "new_order") {
        toast(
          t("alertNewOrder", {
            table: a.order.dining_tables?.label ?? "",
            items: t("itemsCount", { count: liveItemCount(a.order) }),
          }),
        );
      } else if (a.kind === "ready") {
        toast.success(t("alertReady", { table: a.order.dining_tables?.label ?? "" }));
      } else {
        toast(
          t("alertRequest", {
            table: a.request.dining_tables?.label ?? "",
            type: t(`req_${a.request.type}`),
          }),
        );
      }
    }
  }, [orders, requests, shift.sound, shift.vibration, t]);
}
