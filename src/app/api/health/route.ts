import { NextResponse } from "next/server";

import { getPublicSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Liveness + database reachability for uptime monitors (docs/06). */
export async function GET() {
  const started = Date.now();
  const { error } = await getPublicSupabase().from("restaurants").select("id").limit(1);
  const body = { ok: !error, db: error ? "down" : "up", ms: Date.now() - started };
  return NextResponse.json(body, {
    status: error ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
