"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

import { useStaff } from "@/features/staff/staff-context";
import type { BoardOrder } from "@/features/staff/types";
import { AppErrorException, asAppError, toAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { uuidv4 } from "@/lib/uuid";

import type { FloorBill, FloorTable, Zone } from "./types";

export const floorKeys = {
  zones: () => ["staff", "zones"] as const,
  sessionOrders: (sessionId: string) => ["staff", "session", sessionId, "orders"] as const,
  bill: (sessionId: string) => ["staff", "session", sessionId, "bill"] as const,
};

export function useFloor() {
  const { poll } = useStaff();
  return useQuery({
    queryKey: qk.floor(),
    refetchInterval: poll,
    queryFn: async (): Promise<FloorTable[]> => {
      const { data, error } = await getBrowserSupabase().rpc("floor_live");
      if (error) throw new AppErrorException(toAppError(error));
      return (data as unknown as FloorTable[]).map((t) => ({
        ...t,
        pos_x: Number(t.pos_x),
        pos_y: Number(t.pos_y),
      }));
    },
  });
}

export function useZones() {
  const { staff } = useStaff();
  return useQuery({
    queryKey: floorKeys.zones(),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Zone[]> => {
      const { data, error } = await getBrowserSupabase()
        .from("zones")
        .select("id, name, sort")
        .eq("restaurant_id", staff.restaurantId)
        .order("sort");
      if (error) throw new AppErrorException(toAppError(error));
      return data;
    },
  });
}

const ORDER_COLUMNS = `
  id, order_no, status, placed_at, confirmed_at, sent_at, preparing_at, ready_at, served_at,
  customer_note, subtotal_minor, session_id, table_id,
  dining_tables ( label ),
  order_items ( id, name_snapshot, quantity, modifiers, note, is_voided, unit_price_minor, line_total_minor )
`;

/** All non-cancelled orders of one table session, newest first (for the table sheet). */
export function useSessionOrders(sessionId: string | null) {
  const { poll } = useStaff();
  return useQuery({
    queryKey: floorKeys.sessionOrders(sessionId ?? "none"),
    enabled: !!sessionId,
    refetchInterval: poll,
    queryFn: async (): Promise<BoardOrder[]> => {
      const { data, error } = await getBrowserSupabase()
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("session_id", sessionId!)
        .neq("status", "cancelled")
        .order("placed_at", { ascending: false })
        .order("created_at", { referencedTable: "order_items", ascending: true });
      if (error) throw new AppErrorException(toAppError(error));
      return data as unknown as BoardOrder[];
    },
  });
}

export function useBill(sessionId: string | null) {
  const { poll } = useStaff();
  return useQuery({
    queryKey: floorKeys.bill(sessionId ?? "none"),
    enabled: !!sessionId,
    refetchInterval: poll,
    queryFn: async (): Promise<FloorBill & { service_charge_bps: number; vat_bps: number }> => {
      const { data, error } = await getBrowserSupabase().rpc("session_bill", {
        p_session_id: sessionId!,
      });
      if (error) throw new AppErrorException(toAppError(error));
      return data as unknown as FloorBill & { service_charge_bps: number; vat_bps: number };
    },
  });
}

/**
 * Cash / card-machine payment. One request id per payment attempt, reused on
 * retry, so a double tap or a lost response never records money twice.
 */
export function useRecordCash() {
  const qc = useQueryClient();
  const tErr = useTranslations("errors");
  const requestId = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (v: { sessionId: string; amountMinor: number; channel: "cash" | "card" }) => {
      requestId.current ??= uuidv4();
      const { data, error } = await getBrowserSupabase().rpc("record_cash_payment_once", {
        p_session_id: v.sessionId,
        p_amount_minor: v.amountMinor,
        p_channel: v.channel,
        p_client_request_id: requestId.current,
      });
      if (error) {
        const e = toAppError(error);
        // A definitive rejection means nothing was written: next attempt is a new payment.
        if (!e.network && e.key !== "unknown") requestId.current = null;
        throw new AppErrorException(e);
      }
      requestId.current = null;
      return data;
    },
    onError: (err) => {
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.staff() }),
  });
  return mutation;
}

export function useCloseSession() {
  const qc = useQueryClient();
  const tErr = useTranslations("errors");
  return useMutation({
    mutationFn: async ({ sessionId, force }: { sessionId: string; force: boolean }) => {
      const { error } = await getBrowserSupabase().rpc("close_session", {
        p_session_id: sessionId,
        p_force: force,
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onError: (err) => {
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.staff() }),
  });
}

export function useResolveRequest() {
  const qc = useQueryClient();
  const tErr = useTranslations("errors");
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getBrowserSupabase().rpc("update_service_request", {
        p_request_id: id,
        p_status: "resolved",
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onError: (err) => {
      const e = asAppError(err);
      toast.error(tErr(e.key, e.params));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.staff() }),
  });
}
