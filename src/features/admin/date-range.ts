import { startOfDayDhaka } from "@/lib/time";

/**
 * Date-range filters for admin lists, in Dhaka business days (UTC+6, no DST).
 * `from`/`to` are inclusive calendar days ("YYYY-MM-DD"); the query range is
 * [from 00:00, to+1 00:00) Dhaka time.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_MS = 6 * 60 * 60 * 1000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-19" → UTC instant of 00:00 in Dhaka, or null if malformed. */
export function dhakaDayStart(day: string | undefined | null): Date | null {
  const m = ISO_DAY.exec(day ?? "");
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(ms);
  // Reject rollovers such as 2026-02-31.
  if (d.getUTCMonth() !== Number(m[2]) - 1) return null;
  return new Date(ms - OFFSET_MS);
}

/** UTC instant → Dhaka calendar day "YYYY-MM-DD". */
export function dhakaDay(date: Date): string {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export interface DayRange {
  from: string;
  to: string;
  start: Date;
  end: Date;
}

/** Parse ?from&to with defaults (last `defaultDays` days, today included). Swaps reversed ranges. */
export function parseDayRange(
  from: string | undefined,
  to: string | undefined,
  defaultDays = 7,
  now: Date = new Date(),
): DayRange {
  const today = startOfDayDhaka(now);
  let start = dhakaDayStart(from) ?? new Date(today.getTime() - (defaultDays - 1) * DAY_MS);
  let lastDay = dhakaDayStart(to) ?? today;
  if (lastDay < start) [start, lastDay] = [lastDay, start];
  // Cap at one year to keep queries bounded.
  if (lastDay.getTime() - start.getTime() > 366 * DAY_MS) {
    start = new Date(lastDay.getTime() - 366 * DAY_MS);
  }
  return {
    from: dhakaDay(start),
    to: dhakaDay(lastDay),
    start,
    end: new Date(lastDay.getTime() + DAY_MS),
  };
}

/** Single string param from Next's searchParams. */
export function param(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}
