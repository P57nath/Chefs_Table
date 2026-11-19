"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useGuestSession } from "@/features/guest/session/guest-session";
import { AppErrorException, toAppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { getBrowserSupabase } from "@/lib/supabase/client";

import type { GuestOrder, GuestRequest } from "./types";

const ORDER_COLUMNS = `
  id, order_no, status, placed_at, confirmed_at, sent_at, preparing_at, ready_at, served_at,
  cancelled_at, cancel_reason, customer_note, subtotal_minor,
  order_items ( id, name_snapshot, quantity, modifiers, note, is_voided, line_total_minor,
    menu_items ( name_bn, prep_minutes ) )
`;

/** All orders of this table session (every phone sees them), oldest first. */
export function useSessionOrders() {
  const { join, poll } = useGuestSession();
  const sessionId = join?.session_id;
  return useQuery({
    queryKey: qk.sessionOrders(sessionId ?? "none"),
    enabled: !!sessionId,
    refetchInterval: poll,
    queryFn: async (): Promise<GuestOrder[]> => {
      const { data, error } = await getBrowserSupabase()
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("session_id", sessionId!)
        .order("placed_at", { ascending: true })
        .order("created_at", { referencedTable: "order_items", ascending: true });
      if (error) throw new AppErrorException(toAppError(error));
      return data as unknown as GuestOrder[];
    },
  });
}

/** Open (not yet resolved) service requests for this table. */
export function useSessionRequests() {
  const { join, poll } = useGuestSession();
  const sessionId = join?.session_id;
  return useQuery({
    queryKey: qk.sessionRequests(sessionId ?? "none"),
    enabled: !!sessionId,
    refetchInterval: poll,
    queryFn: async (): Promise<GuestRequest[]> => {
      const { data, error } = await getBrowserSupabase()
        .from("service_requests")
        .select("id, type, status, created_at")
        .eq("session_id", sessionId!)
        .neq("status", "resolved")
        .order("created_at", { ascending: false });
      if (error) throw new AppErrorException(toAppError(error));
      return data;
    },
  });
}

export function useCancelOrder() {
  const { join } = useGuestSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await getBrowserSupabase().rpc("cancel_my_order", { p_order_id: orderId });
      if (error) throw new AppErrorException(toAppError(error));
    },
    // Success or "already confirmed": either way the list must reflect the server.
    onSettled: () => qc.invalidateQueries({ queryKey: qk.session(join?.session_id ?? "none") }),
  });
}

export function useCreateRequest() {
  const { join } = useGuestSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: GuestRequest["type"]; note?: string }) => {
      const sessionId = join?.session_id;
      if (!sessionId) throw new AppErrorException(toAppError({ message: "AUTH_REQUIRED" }));
      // Server de-duplicates open requests per type, so double taps are harmless.
      const { error } = await getBrowserSupabase().rpc("create_service_request", {
        p_session_id: sessionId,
        p_type: input.type,
        ...(input.note?.trim() ? { p_note: input.note.trim() } : {}),
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.session(join?.session_id ?? "none") }),
  });
}
