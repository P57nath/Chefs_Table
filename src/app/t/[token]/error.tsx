"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/states/error-state";
import { reportError } from "@/lib/errors";

/** Segment error boundary for guest pages. Never a blank screen. */
export default function GuestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "guest", digest: error.digest });
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background">
      <ErrorState onRetry={reset} />
    </main>
  );
}
