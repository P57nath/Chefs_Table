import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/database";

let admin: SupabaseClient<Database> | null = null;

/**
 * Secret-key client that bypasses RLS. Only for server routes that have no
 * user session (payment IPN / return). Never import from a client component.
 */
export function getAdminSupabase(): SupabaseClient<Database> {
  admin ??= createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return admin;
}
