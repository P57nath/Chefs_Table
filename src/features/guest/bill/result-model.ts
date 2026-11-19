import type { GuestPayment } from "./bill-model";

export type ResultView =
  "paid" | "reviewing" | "confirming" | "confirmingLong" | "failed" | "cancelled" | "notFound";

/**
 * What the return page shows. Our database decides; the `status` query
 * parameter (from the browser redirect) is only a hint while the payment is
 * still "initiated" — it can never make a payment look paid.
 */
export function resultView(
  hint: "success" | "fail" | "cancel",
  payment: GuestPayment | null,
  timedOut: boolean,
): ResultView {
  if (!payment) return "notFound";
  switch (payment.status) {
    case "paid":
      return "paid";
    case "pending_review":
      return "reviewing";
    case "failed":
    case "refunded":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "initiated":
      if (hint === "fail") return "failed";
      if (hint === "cancel") return "cancelled";
      return timedOut ? "confirmingLong" : "confirming";
  }
}
