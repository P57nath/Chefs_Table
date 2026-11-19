"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useEffect, useMemo, type ReactNode } from "react";

import type { ConnectionStatus } from "@/components/states/connection-banner";
import { useCart } from "@/features/guest/cart/cart-store";
import type { TableInfo } from "@/features/guest/menu/types";
import { asAppError, type AppError } from "@/lib/errors";
import { qk } from "@/lib/query-keys";
import { pollingInterval, useRealtimeInvalidate } from "@/lib/realtime";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { joinTable, type JoinResult } from "./bootstrap";

export type GuestPhase = "joining" | "ready" | "error" | "closed";

interface GuestSessionValue {
  token: string;
  table: TableInfo;
  phase: GuestPhase;
  join: JoinResult | null;
  error: AppError | null;
  connection: ConnectionStatus;
  /** Poll interval while realtime is down (false when live). */
  poll: number | false;
  retry: () => void;
  /** After the table was closed: open a fresh session for this table. */
  rejoin: () => void;
}

const GuestSessionContext = createContext<GuestSessionValue | null>(null);

export function useGuestSession(): GuestSessionValue {
  const value = use(GuestSessionContext);
  if (!value) throw new Error("useGuestSession must be used inside <GuestSessionProvider>");
  return value;
}

export function GuestSessionProvider({
  token,
  table,
  children,
}: {
  token: string;
  table: TableInfo;
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const supabase = getBrowserSupabase();

  const joinQuery = useQuery({
    queryKey: qk.guestJoin(token),
    queryFn: () => joinTable(supabase, token),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (count, err) => asAppError(err).network && count < 3,
  });
  const join = joinQuery.data ?? null;
  const sessionId = join?.session_id ?? null;

  const connection = useRealtimeInvalidate({
    channel: `guest:${sessionId ?? "pending"}`,
    enabled: sessionId !== null,
    listeners: sessionId
      ? [
          { table: "orders", filter: `session_id=eq.${sessionId}` },
          { table: "service_requests", filter: `session_id=eq.${sessionId}` },
          { table: "payments", filter: `session_id=eq.${sessionId}` },
          { table: "table_sessions", filter: `id=eq.${sessionId}` },
          { table: "order_items" },
          { table: "menu_items", filter: `restaurant_id=eq.${table.restaurant_id}` },
        ]
      : [],
    keys: sessionId ? [qk.session(sessionId), qk.menu(table.restaurant_id)] : [],
  });
  const poll = pollingInterval(connection);

  const statusQuery = useQuery({
    queryKey: qk.sessionStatus(sessionId ?? "none"),
    enabled: sessionId !== null,
    refetchInterval: poll,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_sessions")
        .select("status")
        .eq("id", sessionId!)
        .single();
      if (error) throw error;
      return data.status;
    },
  });

  // Bind the cart to this table + session (a new session starts an empty cart).
  const bind = useCart((s) => s.bind);
  useEffect(() => {
    bind(token, sessionId);
  }, [bind, token, sessionId]);

  const value = useMemo<GuestSessionValue>(() => {
    const phase: GuestPhase = joinQuery.isError
      ? "error"
      : !join
        ? "joining"
        : statusQuery.data === "closed"
          ? "closed"
          : "ready";
    return {
      token,
      table,
      phase,
      join,
      error: joinQuery.error ? asAppError(joinQuery.error) : null,
      connection,
      poll,
      retry: () => void joinQuery.refetch(),
      rejoin: () => void qc.resetQueries({ queryKey: qk.guestJoin(token) }),
    };
  }, [token, table, join, joinQuery, statusQuery.data, connection, poll, qc]);

  return <GuestSessionContext value={value}>{children}</GuestSessionContext>;
}
