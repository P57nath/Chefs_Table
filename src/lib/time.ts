import { intlLocale, TIME_ZONE, type Locale } from "@/i18n/config";

import { localizeDigits } from "./digits";

type DateInput = Date | string | number;

const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

/** Clock time in Dhaka, e.g. "7:42 PM" / "৭:৪২ PM". */
export function formatClock(date: DateInput, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(toDate(date));
}

/** Calendar date in Dhaka, e.g. "19 Nov 2026". */
export function formatDate(date: DateInput, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(toDate(date));
}

/**
 * Elapsed time for timers, tabular-friendly: "0:42", "12:05", "1:02:05".
 * Negative durations (clock skew) clamp to 0.
 */
export function formatElapsed(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return localizeDigits(text, locale);
}

/** Compact timer for small badges: "0:42", "12:05", then "1h02", "11h18". */
export function formatElapsedShort(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total < 3600) return formatElapsed(ms, locale);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return localizeDigits(`${h}h${String(m).padStart(2, "0")}`, locale);
}

/** "just now", "2 min ago", "1 hr ago" — localised. */
export function formatAge(from: DateInput, now: DateInput, locale: Locale): string {
  const seconds = Math.max(0, Math.round((toDate(now).getTime() - toDate(from).getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto", style: "short" });
  if (seconds < 45) return rtf.format(0, "second");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/** Asia/Dhaka is UTC+6 all year (no DST). */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Start of the current business day in Dhaka, as a UTC instant. */
export function startOfDayDhaka(now: DateInput = Date.now()): Date {
  const local = new Date(toDate(now).getTime() + DHAKA_OFFSET_MS);
  const midnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnightLocal - DHAKA_OFFSET_MS);
}

export type TimerTone = "ok" | "warn" | "late";

/** Colour band for age timers; KDS default: green < 10 min, amber < 20 min, red ≥ 20 min. */
export function timerTone(ms: number, warnAtMin = 10, lateAtMin = 20): TimerTone {
  const minutes = ms / 60_000;
  if (minutes >= lateAtMin) return "late";
  if (minutes >= warnAtMin) return "warn";
  return "ok";
}
