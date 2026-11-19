"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useGuestSession } from "@/features/guest/session/guest-session";
import { AppErrorException, toAppError } from "@/lib/errors";
import type { PaymentChannel } from "@/lib/payments/types";
import { qk } from "@/lib/query-keys";
import { loadSupabase } from "@/lib/supabase/lazy";

import type { BillData, GuestPayment } from "./bill-model";

const PAYMENT_COLUMNS = "id, tran_id, method, channel, amount_minor, status, created_at, paid_at";

/** Totals computed in Postgres (session_bill) — the only source of money on screen. */
export function useGuestBill() {
  const { join, poll } = useGuestSession();
  const sessionId = join?.session_id;
  return useQuery({
    queryKey: qk.bill(sessionId ?? "none"),
    enabled: !!sessionId,
    refetchInterval: poll,
    queryFn: async (): Promise<BillData> => {
      const { data, error } = await (
        await loadSupabase()
      ).rpc("session_bill", {
        p_session_id: sessionId!,
      });
      if (error) throw new AppErrorException(toAppError(error));
      return data as unknown as BillData;
    },
  });
}

/** Payments of this table (cash and online), newest first. */
export function useSessionPayments() {
  const { join, poll } = useGuestSession();
  const sessionId = join?.session_id;
  return useQuery({
    queryKey: qk.sessionPayments(sessionId ?? "none"),
    enabled: !!sessionId,
    refetchInterval: poll,
    queryFn: async (): Promise<GuestPayment[]> => {
      const { data, error } = await (
        await loadSupabase()
      )
        .from("payments")
        .select(PAYMENT_COLUMNS)
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: false });
      if (error) throw new AppErrorException(toAppError(error));
      return data;
    },
  });
}

/**
 * One online payment, polled while the gateway confirmation (IPN) is on its
 * way. `pollUntil` stops polling after the 30 s window (spec §4.6).
 */
export function usePayment(tranId: string | null, polling: boolean) {
  const { join } = useGuestSession();
  const sessionId = join?.session_id;
  return useQuery({
    queryKey: qk.payment(sessionId ?? "none", tranId ?? "none"),
    enabled: !!sessionId && !!tranId,
    refetchInterval: (q) => (polling && q.state.data?.status === "initiated" ? 2_000 : false),
    queryFn: async (): Promise<GuestPayment | null> => {
      const { data, error } = await (
        await loadSupabase()
      )
        .from("payments")
        .select(PAYMENT_COLUMNS)
        .eq("session_id", sessionId!)
        .eq("tran_id", tranId!)
        .maybeSingle();
      if (error) throw new AppErrorException(toAppError(error));
      return data;
    },
  });
}

/** Opens the hosted checkout. The server re-checks every money rule. */
export function useStartPayment() {
  const { join } = useGuestSession();
  return useMutation({
    mutationFn: async (input: { channel: PaymentChannel; amountMinor?: number }) => {
      const sessionId = join?.session_id;
      if (!sessionId) throw new AppErrorException(toAppError({ message: "AUTH_REQUIRED" }));
      let res: Response;
      try {
        res = await fetch("/api/payments/sslcommerz/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            channel: input.channel,
            ...(input.amountMinor !== undefined ? { amount_minor: input.amountMinor } : {}),
          }),
        });
      } catch (err) {
        throw new AppErrorException(toAppError(err));
      }
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        throw new AppErrorException(toAppError({ message: body.error ?? "UNKNOWN" }));
      }
      window.location.assign(body.url);
      return body.url;
    },
  });
}

export function useMyFeedback() {
  const { join } = useGuestSession();
  const sessionId = join?.session_id;
  return useQuery({
    queryKey: qk.feedback(sessionId ?? "none"),
    enabled: !!sessionId,
    queryFn: async () => {
      // RLS returns only this guest's own feedback row.
      const { data, error } = await (
        await loadSupabase()
      )
        .from("feedback")
        .select("rating, comment")
        .eq("session_id", sessionId!)
        .maybeSingle();
      if (error) throw new AppErrorException(toAppError(error));
      return data;
    },
  });
}

export function useSubmitFeedback() {
  const { join } = useGuestSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rating: number; comment: string }) => {
      const sessionId = join?.session_id;
      if (!sessionId) throw new AppErrorException(toAppError({ message: "AUTH_REQUIRED" }));
      const { error } = await (
        await loadSupabase()
      ).rpc("submit_feedback", {
        p_session_id: sessionId,
        p_rating: input.rating,
        ...(input.comment.trim() ? { p_comment: input.comment.trim() } : {}),
      });
      if (error) throw new AppErrorException(toAppError(error));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.feedback(join?.session_id ?? "none") }),
  });
}
