"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { isProtectedPath } from "@/features/auth/roles";
import { asAppError } from "@/lib/errors";
import { loadSupabase } from "@/lib/supabase/lazy";

/**
 * A staff session that expired mid-shift (or was ended elsewhere) must not
 * leave the screen silently failing: send the person to sign in again and
 * bring them back to where they were. Guests are never redirected.
 */
function onAuthLost(err: unknown) {
  if (typeof window === "undefined" || asAppError(err).key !== "authRequired") return;
  const { pathname, search } = window.location;
  if (!isProtectedPath(pathname)) return;
  const go = () =>
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload on purpose: drops all cached data of the dead session
    window.location.assign(`/login?expired=1&next=${encodeURIComponent(pathname + search)}`);
  // Drop the dead session locally so the login page doesn't bounce straight back.
  loadSupabase()
    .then((sb) => sb.auth.signOut({ scope: "local" }))
    .then(go, go);
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: onAuthLost }),
    mutationCache: new MutationCache({ onError: onAuthLost }),
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: (count, err) => asAppError(err).key !== "authRequired" && count < 2,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Mutations are idempotent RPCs, but retries are explicit (user taps Retry).
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
