"use client";

import { useEffect } from "react";

/** Registers /sw.js (offline "Reconnecting…" page) for the installable staff/kitchen apps. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the app works without it (e.g. private mode).
    });
  }, []);
  return null;
}
