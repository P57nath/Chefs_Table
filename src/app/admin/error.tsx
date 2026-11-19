"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/states/error-state";
import { reportError } from "@/lib/errors";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "admin", digest: error.digest });
  }, [error]);
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <ErrorState onRetry={reset} />
    </div>
  );
}
