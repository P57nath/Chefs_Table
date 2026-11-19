export const LOCALES = ["en", "bn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const TIME_ZONE = "Asia/Dhaka";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** BCP-47 tag used with Intl APIs. */
export function intlLocale(locale: Locale): string {
  return locale === "bn" ? "bn-BD" : "en-US";
}
