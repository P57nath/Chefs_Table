import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../src/types/database";

/**
 * Test-only helpers that talk to the LOCAL Supabase stack: the secret key is
 * used for fixture setup/cleanup, staff actions go through the real RPCs with
 * a signed-in demo account (so permissions are exercised, not bypassed).
 */
function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing — run e2e with .env.local present (pnpm db:start)`);
  return v;
}

let adminClient: SupabaseClient<Database> | null = null;
export function admin(): SupabaseClient<Database> {
  adminClient ??= createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SECRET_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return adminClient;
}

/** Close any live session on a table so the test starts from "Free". */
export async function resetTable(token: string): Promise<void> {
  const { data: table, error } = await admin()
    .from("dining_tables")
    .select("id")
    .eq("qr_token", token)
    .single();
  if (error) throw error;
  // Mirror close_session(): unconfirmed orders of the live session are cancelled.
  // Test-only: tickets left in the kitchen by earlier runs on this table are cancelled too.
  const { data: past } = await admin().from("table_sessions").select("id").eq("table_id", table.id);
  await admin()
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "Test reset",
    })
    .in(
      "session_id",
      (past ?? []).map((p) => p.id),
    )
    .in("status", ["in_kitchen", "preparing", "ready"]);
  const { data: live } = await admin()
    .from("table_sessions")
    .select("id")
    .eq("table_id", table.id)
    .neq("status", "closed");
  for (const s of live ?? []) {
    await admin()
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: "Test reset",
      })
      .eq("session_id", s.id)
      .in("status", ["placed", "confirmed"]);
    await admin().from("service_requests").update({ status: "resolved" }).eq("session_id", s.id);
  }
  const { error: updErr } = await admin()
    .from("table_sessions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("table_id", table.id)
    .neq("status", "closed");
  if (updErr) throw updErr;
}

export async function setItemAvailable(name: string, available: boolean): Promise<void> {
  const { error } = await admin()
    .from("menu_items")
    .update({ is_available: available })
    .eq("name", name);
  if (error) throw error;
}

export async function liveSession(token: string) {
  const { data: table } = await admin()
    .from("dining_tables")
    .select("id")
    .eq("qr_token", token)
    .single();
  const { data } = await admin()
    .from("table_sessions")
    .select("id, status")
    .eq("table_id", table!.id)
    .neq("status", "closed")
    .maybeSingle();
  return data;
}

export async function ordersForTable(token: string) {
  const session = await liveSession(token);
  if (!session) return [];
  const { data, error } = await admin()
    .from("orders")
    .select("id, status, client_request_id")
    .eq("session_id", session.id);
  if (error) throw error;
  return data;
}

/** A signed-in demo staff client (real RLS + role checks). */
export async function staff(
  email: "waiter@demo.local" | "kitchen@demo.local" | "manager@demo.local",
) {
  const client = createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({
    email,
    password: env("DEMO_STAFF_PASSWORD"),
  });
  if (error)
    throw new Error(`staff sign-in failed for ${email} (run pnpm seed:staff): ${error.message}`);
  return client;
}

export async function advance(
  client: SupabaseClient<Database>,
  orderId: string,
  to: Database["public"]["Enums"]["order_status"],
) {
  const { error } = await client.rpc("advance_order", { p_order_id: orderId, p_to: to });
  if (error) throw error;
}

export async function closeSession(client: SupabaseClient<Database>, sessionId: string) {
  const { error } = await client.rpc("close_session", { p_session_id: sessionId, p_force: true });
  if (error) throw error;
}

/**
 * A guest order placed through the real RPCs (anonymous sign-in → join_table
 * → place_order), for tests that need big or unusual orders quickly.
 * Picks available items without required options when `names` is a number.
 */
export async function apiGuestOrder(token: string, names: string[] | number) {
  const guest = createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: signErr } = await guest.auth.signInAnonymously();
  if (signErr) throw signErr;
  const { data: joined, error: joinErr } = await guest.rpc("join_table", { p_qr_token: token });
  if (joinErr) throw joinErr;
  const sessionId = (joined as { session_id: string }).session_id;

  const { data: items } = await admin()
    .from("menu_items")
    .select("id, name, modifier_groups ( min_select )")
    .eq("is_active", true)
    .eq("is_available", true)
    .order("name");
  const simple = (items ?? []).filter((i) => i.modifier_groups.every((g) => g.min_select === 0));
  const picked =
    typeof names === "number"
      ? simple.slice(0, names)
      : names.map((n) => {
          const hit = simple.find((i) => i.name === n);
          if (!hit) throw new Error(`no simple menu item named ${n}`);
          return hit;
        });
  const { data: orderId, error } = await guest.rpc("place_order", {
    p_session_id: sessionId,
    p_items: picked.map((i) => ({ menu_item_id: i.id, quantity: 1 })),
    p_client_request_id: crypto.randomUUID(),
  });
  if (error) throw error;
  return { orderId: orderId as string, sessionId, count: picked.length };
}
