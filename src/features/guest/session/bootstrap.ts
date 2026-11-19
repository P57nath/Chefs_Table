"use client";

import { publicEnv } from "@/lib/env";
import { AppErrorException, toAppError } from "@/lib/errors";
import type { BrowserSupabase } from "@/lib/supabase/client";

import { getTurnstileToken } from "./turnstile";

export interface JoinResult {
  session_id: string;
  session_status: "open" | "billing" | "closed";
  table_id: string;
  table_label: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  currency: string;
  vat_bps: number;
  service_charge_bps: number;
}

/** Reuse any existing session (anonymous guest or logged-in staff); otherwise sign in anonymously. */
async function ensureSignedIn(supabase: BrowserSupabase): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;

  const siteKey = publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaToken = siteKey ? await getTurnstileToken(siteKey) : undefined;
  const { error } = await supabase.auth.signInAnonymously(
    captchaToken ? { options: { captchaToken } } : undefined,
  );
  if (error) throw new AppErrorException(toAppError(error));
}

/** Silent anonymous sign-in, then join (or reuse) the live session for this table. */
export async function joinTable(supabase: BrowserSupabase, token: string): Promise<JoinResult> {
  await ensureSignedIn(supabase);
  const { data, error } = await supabase.rpc("join_table", { p_qr_token: token });
  if (error) throw new AppErrorException(toAppError(error));
  return data as unknown as JoinResult;
}
