"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export type BrowserSupabase = SupabaseClient<Database>;

let client: BrowserSupabase | null = null;

/** Browser Supabase client (publishable key, cookie session). Singleton per tab. */
export function getBrowserSupabase(): BrowserSupabase {
  client ??= createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return client;
}
