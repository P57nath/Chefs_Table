import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/types/database";

/** Hide the e2e tables again so they never clutter the real floor plan. */
export default async function globalTeardown() {
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  const admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  await admin.from("dining_tables").update({ is_active: false }).like("qr_token", "e2e-%");
}
