import "server-only";

import { param, parseDayRange, type DayRange } from "../date-range";

export const PAYMENT_STATUSES = [
  "paid",
  "pending_review",
  "initiated",
  "failed",
  "cancelled",
  "refunded",
] as const;
export const PAYMENT_CHANNELS = ["cash", "card", "bkash", "nagad", "bank"] as const;

export interface PaymentFilters {
  range: DayRange;
  status: (typeof PAYMENT_STATUSES)[number] | undefined;
  channel: (typeof PAYMENT_CHANNELS)[number] | undefined;
}

export function parsePaymentFilters(
  sp: Record<string, string | string[] | undefined>,
): PaymentFilters {
  return {
    range: parseDayRange(param(sp.from), param(sp.to)),
    status: PAYMENT_STATUSES.find((s) => s === param(sp.status)),
    channel: PAYMENT_CHANNELS.find((c) => c === param(sp.channel)),
  };
}

export const PAYMENT_COLUMNS = `
  id, method, channel, amount_minor, status, tran_id, created_at, paid_at, received_by, gateway_payload,
  table_sessions ( dining_tables ( label ) )
`;
