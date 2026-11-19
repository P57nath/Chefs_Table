"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        retry: 2,
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
