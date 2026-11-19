import { NextResponse, type NextRequest } from "next/server";

import {
  lookupTable,
  processGatewayCallback,
  readCallbackFields,
} from "@/features/payments/server/process-callback";
import { reportError } from "@/lib/errors";

const RESULTS = new Set(["success", "fail", "cancel"]);

/**
 * The guest's browser comes back here from SSLCommerz (a cross-site POST, so
 * no auth cookies). Validate exactly like the IPN, then send the guest to
 * the result page of the table we have on record for this transaction.
 */
async function handle(request: NextRequest) {
  const r = request.nextUrl.searchParams.get("r") ?? "";
  const result = RESULTS.has(r) ? r : "fail";
  const fields = await readCallbackFields(request);
  let token: string | null = null;
  let tranId: string | null = null;
  try {
    ({ token, tranId } = await processGatewayCallback(fields));
  } catch (err) {
    // Outcome unknown: the IPN will settle it and the result page keeps polling.
    reportError(err, { route: "return" });
    ({ token, tranId } = await lookupTable(fields.tran_id));
  }
  if (!token) return NextResponse.redirect(new URL("/", request.url), 303);
  const target = new URL(`/t/${encodeURIComponent(token)}/payment/result`, request.url);
  target.searchParams.set("status", result);
  if (tranId) target.searchParams.set("tran", tranId);
  return NextResponse.redirect(target, 303);
}

export const POST = handle;
export const GET = handle;
