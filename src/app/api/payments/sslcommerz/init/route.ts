import { NextResponse, type NextRequest } from "next/server";
import { z } from "@/lib/zod";

import { publicEnv } from "@/lib/env";
import { reportError } from "@/lib/errors";
import { customerDefaults, getPaymentGateway } from "@/lib/payments/gateway";
import { MIN_ONLINE_PAYMENT_MINOR, PAYMENT_CHANNELS } from "@/lib/payments/types";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";

const body = z.object({
  session_id: z.uuid(),
  amount_minor: z.number().int().positive().max(100_000_000).optional(),
  channel: z.enum(PAYMENT_CHANNELS),
});

const startResult = z.object({
  tran_id: z.string(),
  amount_minor: z.number().int().positive(),
  currency: z.string(),
  session_id: z.string(),
  table_label: z.string(),
  qr_token: z.string(),
  restaurant_name: z.string(),
});

const fail = (code: string, status: number) => NextResponse.json({ error: code }, { status });

/**
 * Starts an online payment (docs/02 §7). The guest's own session proves
 * membership; every money rule runs in Postgres (start_gateway_payment).
 */
export async function POST(request: NextRequest) {
  // JSON + same-origin only (blocks cross-site form posts riding on cookies).
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return fail("FORBIDDEN", 403);

  let input: z.infer<typeof body>;
  try {
    input = body.parse(await request.json());
  } catch {
    return fail("INVALID_REQUEST", 400);
  }
  if (input.amount_minor !== undefined && input.amount_minor < MIN_ONLINE_PAYMENT_MINOR) {
    return fail("AMOUNT_TOO_SMALL", 400);
  }

  const supabase = await getServerSupabase();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return fail("AUTH_REQUIRED", 401);

  // Default amount = full due; check the gateway minimum before creating a row.
  if (input.amount_minor === undefined) {
    const { data: bill, error } = await supabase.rpc("session_bill", {
      p_session_id: input.session_id,
    });
    if (error) return fail(error.message.split(":")[0] ?? "UNKNOWN", 400);
    const due = Number((bill as { due_minor?: number } | null)?.due_minor ?? 0);
    if (due > 0 && due < MIN_ONLINE_PAYMENT_MINOR) return fail("AMOUNT_TOO_SMALL", 400);
  }

  const { data, error } = await supabase.rpc("start_gateway_payment", {
    p_session_id: input.session_id,
    p_channel: input.channel,
    ...(input.amount_minor !== undefined ? { p_amount_minor: input.amount_minor } : {}),
  });
  if (error) {
    const code = error.message.split(":")[0] ?? "UNKNOWN";
    return fail(code, error.code === "42501" ? 403 : 409);
  }
  const started = startResult.parse(data);

  const { data: session } = await supabase
    .from("table_sessions")
    .select("restaurants ( settings )")
    .eq("id", started.session_id)
    .maybeSingle();
  const gateway = getPaymentGateway(customerDefaults(session?.restaurants?.settings));
  // The mock checkout lives on this server; SSLCommerz needs the public URL.
  const appUrl = gateway.name === "mock" ? request.nextUrl.origin : publicEnv.NEXT_PUBLIC_APP_URL;

  try {
    const { url } = await gateway.createSession({
      tranId: started.tran_id,
      amountMinor: started.amount_minor,
      currency: started.currency,
      channel: input.channel,
      sessionId: started.session_id,
      tableToken: started.qr_token,
      tableLabel: started.table_label,
      restaurantName: started.restaurant_name,
      appUrl: appUrl.replace(/\/$/, ""),
    });
    return NextResponse.json({ url, tran_id: started.tran_id });
  } catch (err) {
    reportError(err, { tranId: started.tran_id });
    // The checkout never opened: close the row so it can't linger as "initiated".
    await getAdminSupabase().rpc("settle_gateway_payment", {
      p_tran_id: started.tran_id,
      p_val_id: "",
      p_amount_minor: started.amount_minor,
      p_status: "failed",
      p_payload: { reject_reason: "INIT_FAILED" },
    });
    return fail("GATEWAY_UNAVAILABLE", 502);
  }
}
