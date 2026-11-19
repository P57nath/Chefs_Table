"use client";

import { createContext, use, type ReactNode } from "react";

const NonceContext = createContext<string | undefined>(undefined);

/** Per-request CSP nonce (from the proxy) for the few inline pre-paint scripts. */
export function NonceProvider({
  nonce,
  children,
}: {
  nonce: string | undefined;
  children: ReactNode;
}) {
  return <NonceContext value={nonce}>{children}</NonceContext>;
}

export function useNonce(): string | undefined {
  return use(NonceContext);
}
