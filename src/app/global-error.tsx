"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/errors";

/**
 * Last-resort boundary (the root layout itself failed): no providers, no
 * translations, no CSS bundle guaranteed — plain inline styles, both languages.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { boundary: "global", digest: error.digest });
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0E0A07",
          color: "#F6EFE6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <main>
          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 4px", opacity: 0.85 }} lang="bn">
            কিছু একটা সমস্যা হয়েছে
          </p>
          <p style={{ margin: "0 0 24px", opacity: 0.85 }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 48,
              padding: "0 24px",
              borderRadius: 12,
              border: 0,
              background: "#F5A524",
              color: "#1A1206",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again · আবার চেষ্টা করুন
          </button>
        </main>
      </body>
    </html>
  );
}
