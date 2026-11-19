"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { OrderStatus } from "@/lib/status";
import { playChime, vibrate } from "@/lib/sound";

import { statusChanges } from "./tracker-model";
import type { GuestOrder } from "./types";

/**
 * Haptic + soft chime when an order's status changes (diffing query snapshots,
 * never raw realtime payloads). Returns text for a polite live region.
 */
export function useStatusAlerts(orders: GuestOrder[] | undefined): string {
  const tOrder = useTranslations("orderStatus");
  const t = useTranslations("guest");
  const previous = useRef<Map<string, OrderStatus> | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!orders) return;
    const prev = previous.current;
    previous.current = new Map(orders.map((o) => [o.id, o.status]));
    if (!prev) return; // first load: no alert
    const changed = statusChanges(prev, orders);
    const last = changed.at(-1);
    if (!last) return;
    vibrate(last.status === "ready" ? [60, 40, 60] : 30);
    playChime(last.status === "ready" ? "ready" : last.status === "served" ? "success" : "soft");
    setAnnouncement(t("statusChanged", { status: tOrder(last.status) }));
  }, [orders, t, tOrder]);

  return announcement;
}
