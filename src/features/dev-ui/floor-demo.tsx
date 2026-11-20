"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { SkeletonBlock } from "@/components/states/skeletons";
import { FloorMap } from "@/features/floor/floor-map";
import type { TableWithStatus } from "@/features/floor/floor-list";
import { tableStatus } from "@/features/floor/status";
import type { FloorOrder, FloorSession, FloorTable, Zone } from "@/features/floor/types";
import { useNow } from "@/lib/use-now";
import type { OrderStatus } from "@/lib/status";

import { Section } from "./section";

const FloorScene = dynamic(() => import("@/features/floor/floor-3d/floor-scene"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-full w-full rounded-2xl" />,
});

const ZONES: Zone[] = [
  { id: "z-main", name: "Main Hall", sort: 1 },
  { id: "z-window", name: "Window", sort: 2 },
  { id: "z-terrace", name: "Terrace", sort: 3 },
];

/** Same layout as supabase/seed.sql, with a few live sessions in different states. */
const LAYOUT: [string, number, FloorTable["shape"], number, number, string][] = [
  ["T1", 2, "square", 2, 3, "z-window"],
  ["T2", 2, "square", 2, 6, "z-window"],
  ["T3", 2, "square", 2, 9, "z-window"],
  ["T4", 4, "round", 6, 4, "z-main"],
  ["T5", 4, "round", 9, 4, "z-main"],
  ["T6", 4, "round", 12, 4, "z-main"],
  ["T7", 6, "rect", 6, 8, "z-main"],
  ["T8", 6, "rect", 10, 8, "z-main"],
  ["T9", 8, "rect", 8, 11, "z-main"],
  ["T10", 4, "square", 16, 3, "z-terrace"],
  ["T11", 4, "square", 16, 7, "z-terrace"],
  ["T12", 2, "round", 16, 10, "z-terrace"],
];

const DEMO: Record<string, { guests: number; orders: OrderStatus[]; call?: boolean }> = {
  T1: { guests: 2, orders: ["served"] },
  T4: { guests: 3, orders: ["placed"] },
  T5: { guests: 4, orders: ["preparing"] },
  T7: { guests: 5, orders: ["ready"] },
  T8: { guests: 4, orders: ["served"], call: true },
  T10: { guests: 2, orders: ["in_kitchen"] },
  T12: { guests: 2, orders: [] },
};

function demoSession(
  id: string,
  now: number,
  guests: number,
  statuses: OrderStatus[],
  call: boolean,
): FloorSession {
  const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();
  const orders: FloorOrder[] = statuses.map((status, i) => ({
    id: `${id}-o${i}`,
    order_no: 180 + i,
    status,
    placed_at: at(9),
    confirmed_at: status === "placed" ? null : at(8),
    sent_at: status === "placed" || status === "confirmed" ? null : at(7),
    ready_at: status === "ready" || status === "served" ? at(2) : null,
    served_at: status === "served" ? at(1) : null,
    subtotal_minor: 128_000,
    item_count: 3,
  }));
  return {
    id: `s-${id}`,
    status: "open",
    guest_count: guests,
    opened_at: at(30),
    orders,
    open_requests: call
      ? [{ id: `${id}-r`, type: "call_waiter", status: "open", note: null, created_at: at(1) }]
      : [],
    pending_review: 0,
    bill: {
      subtotal_minor: 0,
      service_charge_minor: 0,
      vat_minor: 0,
      total_minor: 0,
      paid_minor: 0,
      due_minor: 0,
      unconfirmed_orders: 0,
    },
  };
}

/** Dev-only: the live 3D floor with demo data, so the scene can be checked without a database. */
export function FloorDemo() {
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows: TableWithStatus[] = useMemo(() => {
    const t = now ?? 0;
    return LAYOUT.map(([label, seats, shape, x, y, zone]) => {
      const demo = DEMO[label];
      const table: FloorTable = {
        table_id: label,
        label,
        seats,
        shape,
        pos_x: x,
        pos_y: y,
        rotation: 0,
        zone_id: zone,
        session: demo ? demoSession(label, t, demo.guests, demo.orders, demo.call ?? false) : null,
      };
      return { table, status: tableStatus(table, t) };
    });
  }, [now]);

  return (
    <Section title="Floor">
      <div className="relative h-[640px] overflow-hidden rounded-2xl border border-border">
        {now === null ? null : (
          <FloorScene
            rows={rows}
            zones={ZONES}
            selectedId={selectedId}
            focusedId={null}
            waiterColor="#3f5a73"
            onOpen={(tb) => setSelectedId(tb.table_id)}
            onTooSlow={() => {}}
          />
        )}
      </div>
      <FloorMap
        rows={rows}
        zones={ZONES}
        selectedId={selectedId}
        onOpen={(tb) => setSelectedId(tb.table_id)}
      />
    </Section>
  );
}
