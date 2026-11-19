"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useGuestSession } from "@/features/guest/session/guest-session";
import { AppErrorException, reportError, toAppError, type AppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { unlockAudio } from "@/lib/sound";
import { loadSupabase } from "@/lib/supabase/lazy";

import { toOrderItems, useCart } from "./cart-store";

/**
 * Places the cart as an order. Idempotent: the same client_request_id is sent
 * on every retry until the server answers definitively (CLAUDE.md rule 5).
 * Errors without a known server code are treated as "unknown outcome".
 */
export function usePlaceOrder() {
  const { join, token } = useGuestSession();
  const qc = useQueryClient();
  const router = useRouter();
  const t = useTranslations("guest");
  const [error, setError] = useState<AppError | null>(null);

  const submit = useCallback(async () => {
    void unlockAudio(); // the slide gesture lets us play status chimes later
    const sessionId = join?.session_id;
    if (!sessionId) throw new Error("SESSION_NOT_READY");

    const cart = useCart.getState();
    if (cart.lines.length === 0) throw new Error("CART_EMPTY");
    const requestId = cart.beginSubmit();
    setError(null);

    let data: string | null = null;
    let rpcError: unknown = null;
    try {
      const res = await (
        await loadSupabase()
      ).rpc("place_order", {
        p_session_id: sessionId,
        p_items: toOrderItems(cart.lines),
        p_client_request_id: requestId,
        ...(cart.orderNote.trim() ? { p_note: cart.orderNote.trim() } : {}),
      });
      data = res.data;
      rpcError = res.error;
    } catch (thrown) {
      rpcError = thrown; // e.g. aborted fetch — outcome unknown
    }

    if (rpcError || !data) {
      const appError = toAppError(rpcError ?? new Error("EMPTY_RESPONSE"));
      const definitive = !appError.network && appError.key !== "unknown";
      useCart.getState().submitFailed(definitive ? "rejected" : "unknown");
      setError(appError);
      if (!definitive) reportError(rpcError, { where: "place_order", requestId });
      throw new AppErrorException(appError);
    }

    useCart.getState().submitSucceeded();
    await qc.invalidateQueries({ queryKey: qk.session(sessionId) });
    toast.success(t("placedToast"));
    router.push(`/t/${encodeURIComponent(token)}/track`);
    return data;
  }, [join, qc, router, token, t]);

  return { submit, error, clearError: () => setError(null) };
}
