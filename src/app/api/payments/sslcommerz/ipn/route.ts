import { NextResponse, type NextRequest } from "next/server";

import {
  processGatewayCallback,
  readCallbackFields,
  TransientCallbackError,
} from "@/features/payments/server/process-callback";
import { reportError } from "@/lib/errors";

/**
 * SSLCommerz IPN (server to server, form-encoded). Validates with the
 * Validation API and settles idempotently. 503 only when the outcome is
 * unknown (gateway or database unreachable) so the IPN is retried.
 */
export async function POST(request: NextRequest) {
  try {
    await processGatewayCallback(await readCallbackFields(request));
    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    reportError(err, { route: "ipn" });
    const status = err instanceof TransientCallbackError ? 503 : 500;
    return new NextResponse("RETRY", { status });
  }
}
