import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/types/database";

/**
 * Creates dedicated tables for e2e tests (tokens `e2e-01` … `e2e-24`, labels
 * `E1` … `E24`) so parallel tests never share a table with each other or with
 * the demo tables you click around in. Idempotent.
 */
export const E2E_TABLES = 24;

export default async function globalSetup() {
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const restaurantId = process.env.DEMO_RESTAURANT_ID ?? "00000000-0000-4000-8000-000000000001";
  if (!url || !key)
    throw new Error("e2e needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (.env.local)");

  const admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  const rows = Array.from({ length: E2E_TABLES }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      restaurant_id: restaurantId,
      label: `E${i + 1}`,
      qr_token: `e2e-${n}`,
      seats: 2,
      shape: "round" as const,
      pos_x: 30 + (i % 6) * 2,
      pos_y: 30 + Math.floor(i / 6) * 2,
      is_active: true,
    };
  });
  const { error } = await admin.from("dining_tables").upsert(rows, { onConflict: "qr_token" });
  if (error) throw new Error(`e2e table setup failed: ${error.message}`);
}
