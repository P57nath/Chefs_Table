"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/states/error-state";
import { reportError } from "@/lib/errors";

/** Fallback boundary for pages without their own (landing, login). */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "root", digest: error.digest });
  }, [error]);
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-6">
      <ErrorState onRetry={reset} />
    </main>
  );
}
