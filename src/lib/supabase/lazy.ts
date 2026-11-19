"use client";

import type { BrowserSupabase } from "./client";

let pending: Promise<BrowserSupabase> | null = null;

/**
 * The browser Supabase client, loaded on demand. supabase-js is ~67 KB gzip;
 * guest screens and the root providers use this so it isn't part of the
 * first-load JS (spec §8). Same singleton as `getBrowserSupabase()`.
 */
export function loadSupabase(): Promise<BrowserSupabase> {
  pending ??= import("./client").then((m) => m.getBrowserSupabase());
  return pending;
}
