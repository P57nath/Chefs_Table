"use client";

import { useQuery } from "@tanstack/react-query";

import { AppErrorException, toAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { startOfDayDhaka } from "@/lib/time";

import { useStaff } from "./staff-context";
import type { BoardOrder, StaffMenuItem, StaffRequest } from "./types";

const ORDER_COLUMNS = `
  id, order_no, status, placed_at, confirmed_at, sent_at, preparing_at, ready_at, served_at,
  customer_note, subtotal_minor, session_id, table_id,
  dining_tables ( label ),
  order_items ( id, name_snapshot, quantity, modifiers, note, is_voided, unit_price_minor, line_total_minor )
`;

const ACTIVE_STATUSES = ["placed", "confirmed", "in_kitchen", "preparing", "ready"] as const;
const SERVED_SHOWN = 50;

/**
 * Every active order (never truncated — a missing new order is a missed table)
 * plus the latest served ones of today's Dhaka business day.
 * RLS limits rows to the staff member's restaurant.
 */
export async function fetchBoardOrders(restaurantId: string): Promise<BoardOrder[]> {
  const supabase = getBrowserSupabase();
  const since = startOfDayDhaka().toISOString();
  const [active, served] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("restaurant_id", restaurantId)
      .in("status", [...ACTIVE_STATUSES])
      .order("placed_at", { ascending: true })
      .order("created_at", { referencedTable: "order_items", ascending: true }),
    supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("restaurant_id", restaurantId)
      .eq("status", "served")
      .gte("served_at", since)
      .order("served_at", { ascending: false })
      .order("created_at", { referencedTable: "order_items", ascending: true })
      .limit(SERVED_SHOWN),
  ]);
  if (active.error) throw new AppErrorException(toAppError(active.error));
  if (served.error) throw new AppErrorException(toAppError(served.error));
  return [...active.data, ...served.data] as unknown as BoardOrder[];
}

export function useBoardOrders(enabled = true) {
  const { staff, poll } = useStaff();
  return useQuery({
    queryKey: qk.staffOrders(),
    queryFn: () => fetchBoardOrders(staff.restaurantId),
    refetchInterval: poll,
    enabled,
  });
}

export function useOpenRequests(enabled = true) {
  const { staff, poll } = useStaff();
  return useQuery({
    queryKey: qk.staffRequests(),
    enabled,
    refetchInterval: poll,
    queryFn: async (): Promise<StaffRequest[]> => {
      const { data, error } = await getBrowserSupabase()
        .from("service_requests")
        .select(
          "id, type, status, note, created_at, acknowledged_at, session_id, table_id, dining_tables ( label )",
        )
        .eq("restaurant_id", staff.restaurantId)
        .neq("status", "resolved")
        .order("created_at", { ascending: true });
      if (error) throw new AppErrorException(toAppError(error));
      return data as StaffRequest[];
    },
  });
}

export function useStaffMenu() {
  const { staff, poll } = useStaff();
  return useQuery({
    queryKey: qk.staffMenu(),
    refetchInterval: poll,
    queryFn: async (): Promise<StaffMenuItem[]> => {
      const { data, error } = await getBrowserSupabase()
        .from("menu_items")
        .select(
          "id, name, name_bn, is_available, sort, category_id, menu_categories ( name, name_bn, sort )",
        )
        .eq("restaurant_id", staff.restaurantId)
        .eq("is_active", true)
        .order("sort");
      if (error) throw new AppErrorException(toAppError(error));
      return data as StaffMenuItem[];
    },
  });
}
