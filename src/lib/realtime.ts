"use client";

import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { ConnectionStatus } from "@/components/states/connection-banner";
import { getBrowserSupabase } from "@/lib/supabase/client";

export interface RealtimeListener {
  table: string;
  /** PostgREST-style filter, e.g. `session_id=eq.<uuid>`. RLS still applies. */
  filter?: string;
}

interface Options {
  channel: string;
  listeners: readonly RealtimeListener[];
  /** Query keys to invalidate on any event (and everything on reconnect/focus). */
  keys: readonly QueryKey[];
  enabled?: boolean;
  debounceMs?: number;
}

export const POLL_INTERVAL_MS = 10_000;

/**
 * Realtime events are *signals*, never state (CLAUDE.md rule 6): any change
 * invalidates the related queries, which refetch through RLS. On (re)subscribe,
 * tab focus and `online` everything is refetched. While not SUBSCRIBED the
 * caller should poll (`refetchInterval: POLL_INTERVAL_MS`) and show the banner.
 */
export function useRealtimeInvalidate({
  channel,
  listeners,
  keys,
  enabled = true,
  debounceMs = 150,
}: Options): ConnectionStatus {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const keysRef = useRef(keys);
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);
  const listenersKey = JSON.stringify(listeners);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getBrowserSupabase();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let restoredTimer: ReturnType<typeof setTimeout> | null = null;
    let everSubscribed = false;
    let lost = false;

    const invalidateAll = () => {
      for (const key of keysRef.current) void qc.invalidateQueries({ queryKey: key });
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(invalidateAll, debounceMs);
    };

    let ch = supabase.channel(channel);
    for (const l of JSON.parse(listenersKey) as RealtimeListener[]) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: l.table, ...(l.filter ? { filter: l.filter } : {}) },
        schedule,
      );
    }
    ch.subscribe((state) => {
      if (state === "SUBSCRIBED") {
        // Catch up on anything missed before (first join) or while disconnected.
        invalidateAll();
        if (everSubscribed && lost) {
          setStatus("restored");
          restoredTimer = setTimeout(() => setStatus("online"), 2_000);
        } else {
          setStatus("online");
        }
        everSubscribed = true;
        lost = false;
      } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
        lost = true;
        setStatus(
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting",
        );
      }
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") invalidateAll();
    };
    const onOnline = () => invalidateAll();
    const onOffline = () => setStatus("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      if (timer) clearTimeout(timer);
      if (restoredTimer) clearTimeout(restoredTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      void supabase.removeChannel(ch);
    };
  }, [channel, listenersKey, enabled, debounceMs, qc]);

  return status;
}

/** Poll while realtime is down. */
export function pollingInterval(status: ConnectionStatus): number | false {
  return status === "online" || status === "restored" ? false : POLL_INTERVAL_MS;
}
