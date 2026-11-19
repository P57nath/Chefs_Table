import { intlLocale, type Locale } from "@/i18n/config";

import { localizeDigits } from "./digits";

/**
 * Money is always integer minor units (poisha): ৳420.00 = 42000.
 * Never do arithmetic on floats; format only at the edge.
 */
export type Minor = number;

const CURRENCY_SYMBOL = "৳";

export interface FormatMoneyOptions {
  /** "auto" (default) shows poisha only when non-zero; "always" forces two decimals. */
  decimals?: "auto" | "always" | "never";
  /** Prefix with the ৳ symbol (default true). */
  symbol?: boolean;
}

function assertMinor(minor: number): void {
  if (!Number.isSafeInteger(minor)) {
    throw new TypeError(`Money must be an integer number of poisha, got ${minor}`);
  }
}

/** `formatMoney(123400, "en")` → "৳1,234"; `formatMoney(123450, "bn")` → "৳১,২৩৪.৫০". */
export function formatMoney(minor: Minor, locale: Locale, opts: FormatMoneyOptions = {}): string {
  assertMinor(minor);
  const { decimals = "auto", symbol = true } = opts;
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / 100);
  const fraction = abs % 100;

  // Grouping comes from Intl on an integer (exact); digits are localised by Intl for bn-BD.
  const grouped = new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(whole);

  const showFraction = decimals === "always" || (decimals === "auto" && fraction !== 0);
  const fractionText = showFraction
    ? `.${localizeDigits(String(fraction).padStart(2, "0"), locale)}`
    : "";

  return `${negative ? "-" : ""}${symbol ? CURRENCY_SYMBOL : ""}${grouped}${fractionText}`;
}

/** Exact decimal string for machines (gateways, `<data value>`): 78343 → "783.43". */
export function toDecimalString(minor: Minor): string {
  assertMinor(minor);
  const abs = Math.abs(minor);
  return `${minor < 0 ? "-" : ""}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Parse a user-typed taka amount ("1,234.5", "৳ 420", "১২৩") into poisha without
 * floating-point maths. Returns null for anything that isn't a valid amount.
 */
export function toMinor(input: string): Minor | null {
  const ascii = input
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[৳,\s]/g, "")
    .replace(/^tk\.?/i, "");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(ascii);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + fraction;
}

/** Percentage stored in basis points (750 = 7.5 %) for display. */
export function formatBps(bps: number, locale: Locale): string {
  const whole = Math.trunc(bps / 100);
  const rest = bps % 100;
  const text =
    rest === 0 ? `${whole}` : `${whole}.${String(rest).padStart(2, "0").replace(/0$/, "")}`;
  return `${localizeDigits(text, locale)}%`;
}

/** Axis / tile shorthand: 1250000 → "৳12.5K" (whole taka, never used for exact amounts). */
export function formatMoneyCompact(minor: Minor, locale: Locale): string {
  assertMinor(minor);
  const taka = Math.trunc(minor / 100);
  const text = new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(taka);
  return `${CURRENCY_SYMBOL}${text}`;
}
