"use client";

import { createContext, use, useMemo, type ReactNode } from "react";

import type { ConnectionStatus } from "@/components/states/connection-banner";
import type { StaffRole } from "@/features/auth/roles";
import { qk } from "@/lib/query-keys";
import { pollingInterval, useRealtimeInvalidate } from "@/lib/realtime";

import { useShiftSettings, type ShiftSettings } from "./shift";

export interface StaffProfile {
  userId: string;
  role: StaffRole;
  displayName: string;
  avatarColor: string;
  restaurantId: string;
  restaurantName: string;
}

interface StaffContextValue {
  staff: StaffProfile;
  connection: ConnectionStatus;
  poll: number | false;
  shift: ShiftSettings;
}

const StaffContext = createContext<StaffContextValue | null>(null);

export function useStaff(): StaffContextValue {
  const v = use(StaffContext);
  if (!v) throw new Error("useStaff must be used inside <StaffProvider>");
  return v;
}

/** Staff session: profile, one realtime channel for the restaurant, shift settings. */
export function StaffProvider({ staff, children }: { staff: StaffProfile; children: ReactNode }) {
  const rid = staff.restaurantId;
  const filter = `restaurant_id=eq.${rid}`;
  const connection = useRealtimeInvalidate({
    channel: `floor:${rid}`,
    listeners: [
      { table: "orders", filter },
      { table: "order_items", filter },
      { table: "service_requests", filter },
      { table: "table_sessions", filter },
      { table: "payments", filter },
      { table: "menu_items", filter },
    ],
    keys: [qk.staff(), qk.menu(rid)],
  });
  const shift = useShiftSettings();
  const value = useMemo(
    () => ({ staff, connection, poll: pollingInterval(connection), shift }),
    [staff, connection, shift],
  );
  return <StaffContext value={value}>{children}</StaffContext>;
}
