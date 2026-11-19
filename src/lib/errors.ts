/**
 * Maps Postgres/PostgREST errors from our RPCs (stable message codes such as
 * `ITEM_UNAVAILABLE:Firni`) to i18n keys under `errors.*` (docs/02 §8).
 */
export type ErrorKey =
  | "itemUnavailable"
  | "itemNotFound"
  | "sessionClosed"
  | "tooManyPending"
  | "modifierRules"
  | "invalidModifier"
  | "invalidQuantity"
  | "noteTooLong"
  | "invalidItems"
  | "alreadyUpdated"
  | "alreadyConfirmed"
  | "forbidden"
  | "notAGuest"
  | "unpaidBalance"
  | "amountExceedsDue"
  | "tableNotFound"
  | "notFound"
  | "authRequired"
  | "unconfirmedOrders"
  | "nothingDue"
  | "invalidAmount"
  | "amountTooSmall"
  | "tooManyPaymentAttempts"
  | "gatewayUnavailable"
  | "notPendingReview"
  | "paymentNotFound"
  | "network"
  | "unknown";

export interface AppError {
  key: ErrorKey;
  /** Values for the message, e.g. { name: "Firni" }. */
  params: Record<string, string>;
  /**
   * Network failures have an unknown outcome on the server (the request may
   * have been applied). Callers must retry idempotently, never "fresh".
   */
  network: boolean;
  /** Raw message for logs. */
  raw: string;
}

const EXACT: Record<string, ErrorKey> = {
  SESSION_CLOSED: "sessionClosed",
  TOO_MANY_PENDING_ORDERS: "tooManyPending",
  ITEM_NOT_FOUND: "itemNotFound",
  INVALID_MODIFIER: "invalidModifier",
  INVALID_QUANTITY: "invalidQuantity",
  NOTE_TOO_LONG: "noteTooLong",
  INVALID_ITEMS: "invalidItems",
  ALREADY_CONFIRMED: "alreadyConfirmed",
  ORDER_LOCKED: "alreadyUpdated",
  FORBIDDEN: "forbidden",
  NOT_A_GUEST: "notAGuest",
  UNPAID_BALANCE: "unpaidBalance",
  AMOUNT_EXCEEDS_DUE: "amountExceedsDue",
  TABLE_NOT_FOUND: "tableNotFound",
  NOT_FOUND: "notFound",
  AUTH_REQUIRED: "authRequired",
  UNCONFIRMED_ORDERS: "unconfirmedOrders",
  NOTHING_DUE: "nothingDue",
  INVALID_AMOUNT: "invalidAmount",
  AMOUNT_TOO_SMALL: "amountTooSmall",
  TOO_MANY_PAYMENT_ATTEMPTS: "tooManyPaymentAttempts",
  GATEWAY_UNAVAILABLE: "gatewayUnavailable",
  NOT_PENDING_REVIEW: "notPendingReview",
  PAYMENT_NOT_FOUND: "paymentNotFound",
};

function messageOf(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

function isNetworkError(err: unknown, message: string): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true; // fetch() network failure
  if (err && typeof err === "object" && "name" in err) {
    const name = (err as { name: unknown }).name;
    if (name === "AbortError" || name === "TimeoutError") return true;
  }
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
    message,
  );
}

export function toAppError(err: unknown): AppError {
  const raw = messageOf(err).trim();
  const base = { params: {}, network: false, raw };

  const [code = "", detail = ""] = raw.split(/:(.*)/s).map((s) => s?.trim() ?? "");
  if (code === "ITEM_UNAVAILABLE")
    return { ...base, key: "itemUnavailable", params: { name: detail } };
  if (code === "MODIFIER_RULES")
    return { ...base, key: "modifierRules", params: { group: detail } };
  if (code === "INVALID_TRANSITION") return { ...base, key: "alreadyUpdated", params: {} };
  const exact = EXACT[raw] ?? EXACT[code];
  if (exact) return { ...base, key: exact };

  if (isNetworkError(err, raw)) return { ...base, key: "network", network: true };
  return { ...base, key: "unknown" };
}

/** Throw-friendly wrapper so TanStack mutations get AppErrors. */
export class AppErrorException extends Error {
  readonly appError: AppError;
  constructor(appError: AppError) {
    super(appError.raw || appError.key);
    this.name = "AppErrorException";
    this.appError = appError;
  }
}

export function asAppError(err: unknown): AppError {
  return err instanceof AppErrorException ? err.appError : toAppError(err);
}

/** Hook for Sentry later (docs/06 §5). Logs with context in development. */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") console.error("[reportError]", err, context ?? "");
}
