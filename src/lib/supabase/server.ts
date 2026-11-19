import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** Request-scoped client acting as the signed-in user (reads/writes auth cookies). */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component: cookies are read-only there. The proxy
            // refreshes sessions, so ignoring the write is safe.
          }
        },
      },
    },
  );
}

/**
 * Anonymous, cookie-less client for public reads (menu, guest_table_info).
 * Safe inside `unstable_cache` because it never touches the request.
 */
export function getPublicSupabase() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
