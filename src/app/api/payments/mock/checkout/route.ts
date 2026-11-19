import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env.server";
import { formatMoney } from "@/lib/money";
import { mockValId } from "@/lib/payments/mock";
import { getAdminSupabase } from "@/lib/supabase/admin";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Stand-in for the SSLCommerz hosted page (PAYMENT_GATEWAY=mock only, which
 * env-schema refuses in production). Each button posts to the real return
 * route exactly like SSLCommerz would.
 */
export async function GET(request: NextRequest) {
  if (serverEnv.PAYMENT_GATEWAY !== "mock") return new NextResponse("Not found", { status: 404 });
  const tran = request.nextUrl.searchParams.get("tran") ?? "";
  const { data: payment } = await getAdminSupabase()
    .from("payments")
    .select("tran_id, amount_minor, channel, status, table_sessions ( dining_tables ( label ) )")
    .eq("tran_id", tran)
    .maybeSingle();
  if (!payment || !payment.tran_id) return new NextResponse("Unknown transaction", { status: 404 });

  const form = (r: string, label: string, fields: Record<string, string>, primary = false) => `
    <form method="post" action="/api/payments/sslcommerz/return?r=${r}">
      ${Object.entries(fields)
        .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
        .join("")}
      <button type="submit" class="${primary ? "primary" : ""}">${esc(label)}</button>
    </form>`;
  const id = payment.tran_id;
  const amount = payment.amount_minor;
  const open = payment.status === "initiated";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Test checkout</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f4f1ea;color:#1c1917;margin:0;padding:24px;display:grid;place-items:center;min-height:100vh}
  main{background:#fff;border-radius:20px;padding:28px;max-width:380px;width:100%;box-shadow:0 10px 30px #0001}
  .tag{display:inline-block;background:#fde68a;color:#78350f;border-radius:999px;padding:4px 10px;font-size:13px;font-weight:600}
  h1{font-size:22px;margin:14px 0 4px} p{margin:4px 0;color:#57534e}
  .amount{font-size:36px;font-weight:700;color:#1c1917;margin:16px 0}
  form{margin:10px 0} button{width:100%;min-height:48px;border-radius:12px;border:1px solid #d6d3d1;background:#fafaf9;font-size:16px;cursor:pointer}
  button.primary{background:#1c1917;color:#fff;border-color:#1c1917}
  button:focus-visible{outline:3px solid #b45309;outline-offset:2px}
</style></head>
<body><main>
  <span class="tag">Test gateway · no real money</span>
  <h1>Pay table ${esc(payment.table_sessions?.dining_tables?.label ?? "")}</h1>
  <p>Channel: ${esc(payment.channel ?? "")} · ${esc(id)}</p>
  <div class="amount">${esc(formatMoney(amount, "en"))}</div>
  ${
    open
      ? form(
          "success",
          "Pay now",
          { tran_id: id, val_id: mockValId(id, amount), status: "VALID" },
          true,
        ) +
        form("success", "Pay with a risky card", {
          tran_id: id,
          val_id: mockValId(id, amount, 1),
          status: "VALID",
        }) +
        form("fail", "Decline", { tran_id: id, status: "FAILED" }) +
        form("cancel", "Cancel", { tran_id: id, status: "CANCELLED" })
      : `<p>This payment is already <strong>${esc(payment.status)}</strong>.</p>`
  }
</main></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
