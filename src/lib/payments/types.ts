/** Online payment channels offered to guests (all via SSLCommerz hosted checkout). */
export const PAYMENT_CHANNELS = ["bkash", "nagad", "card", "bank"] as const;
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

/** SSLCommerz rejects totals under ৳10.00. */
export const MIN_ONLINE_PAYMENT_MINOR = 1000;

export interface CreateSessionInput {
  tranId: string;
  amountMinor: number;
  currency: string;
  channel: PaymentChannel;
  sessionId: string;
  tableToken: string;
  tableLabel: string;
  restaurantName: string;
  /** Absolute origin used for callback URLs, e.g. https://table.example.com */
  appUrl: string;
}

/** Fields we read from the gateway's Validation API (all strings on the wire). */
export interface GatewayValidation {
  status: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  currency_type?: string;
  currency_amount?: string;
  risk_level?: string;
  risk_title?: string;
  card_type?: string;
  bank_tran_id?: string;
  tran_date?: string;
}

export interface PaymentGateway {
  readonly name: "sslcommerz" | "mock";
  /** Opens a hosted checkout and returns the URL to send the guest to. */
  createSession(input: CreateSessionInput): Promise<{ url: string }>;
  /** Asks the gateway (server to server) whether `valId` is a real payment. */
  validate(valId: string): Promise<GatewayValidation>;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    /** Network / 5xx: the outcome is unknown and the caller may retry. */
    readonly transient: boolean,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}
