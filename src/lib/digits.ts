import type { Locale } from "@/i18n/config";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Replace ASCII digits 0–9 with Bangla digits; everything else is untouched. */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** Localise digits for display: Bangla digits in `bn`, unchanged in `en`. */
export function localizeDigits(input: string | number, locale: Locale): string {
  return locale === "bn" ? toBanglaDigits(input) : String(input);
}
