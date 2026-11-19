import { dhakaDay, dhakaDayStart, parseDayRange, type DayRange } from "../date-range";

/** Shapes returned by sales_report() / sales_daily() (Postgres numerics may arrive as strings). */
export interface SalesReport {
  revenue_minor: number;
  orders: number;
  avg_ticket_minor: number;
  avg_confirm_seconds: number;
  avg_kitchen_seconds: number;
  by_method: Record<string, number>;
  top_items: { name: string; qty: number; revenue_minor: number }[];
  by_hour: { hour: number; orders: number }[];
  avg_rating: number | null;
}

export interface DailyPoint {
  day: string;
  revenue_minor: number;
  orders: number;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Normalises numeric strings from jsonb into numbers. */
export function normaliseReport(raw: unknown): SalesReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const byMethod = (r.by_method ?? {}) as Record<string, unknown>;
  return {
    revenue_minor: num(r.revenue_minor),
    orders: num(r.orders),
    avg_ticket_minor: num(r.avg_ticket_minor),
    avg_confirm_seconds: num(r.avg_confirm_seconds),
    avg_kitchen_seconds: num(r.avg_kitchen_seconds),
    by_method: Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, num(v)])),
    top_items: ((r.top_items ?? []) as Record<string, unknown>[]).map((t) => ({
      name: String(t.name ?? ""),
      qty: num(t.qty),
      revenue_minor: num(t.revenue_minor),
    })),
    by_hour: ((r.by_hour ?? []) as Record<string, unknown>[]).map((h) => ({
      hour: num(h.hour),
      orders: num(h.orders),
    })),
    avg_rating: r.avg_rating === null || r.avg_rating === undefined ? null : Number(r.avg_rating),
  };
}

export const PRESETS = ["today", "7d", "30d"] as const;
export type Preset = (typeof PRESETS)[number] | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Range from the URL: a preset (default today) or custom from/to days.
 * `previous` is the same number of days immediately before, for deltas.
 */
export function reportRange(
  params: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
): { preset: Preset; current: DayRange; previous: DayRange; days: number } {
  let preset: Preset = (PRESETS as readonly string[]).includes(params.range ?? "")
    ? (params.range as Preset)
    : "today";
  if (params.range === "custom" && dhakaDayStart(params.from) && dhakaDayStart(params.to)) {
    preset = "custom";
  }
  const length = preset === "7d" ? 7 : preset === "30d" ? 30 : 1;
  const current =
    preset === "custom"
      ? parseDayRange(params.from, params.to, 1, now)
      : parseDayRange(undefined, undefined, length, now);
  const days = Math.round((current.end.getTime() - current.start.getTime()) / DAY_MS);
  const prevEnd = current.start;
  const prevStart = new Date(prevEnd.getTime() - days * DAY_MS);
  return {
    preset,
    current,
    previous: {
      from: dhakaDay(prevStart),
      to: dhakaDay(new Date(prevEnd.getTime() - DAY_MS)),
      start: prevStart,
      end: prevEnd,
    },
    days,
  };
}

/** Change vs the previous period; null when there is nothing to compare with. */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** 0–23, zero-filled. */
export function hours24(
  byHour: { hour: number; orders: number }[],
): { hour: number; orders: number }[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: byHour.find((h) => h.hour === hour)?.orders ?? 0,
  }));
}

export const SPLIT_CHANNELS = ["cash", "card", "bkash", "nagad", "bank"] as const;

/** Payment split, largest first, with shares that add up to 100 (largest remainder). */
export function paymentSplit(
  byMethod: Record<string, number>,
): { key: string; amount: number; share: number }[] {
  const rows = Object.entries(byMethod)
    .map(([key, amount]) => ({ key: key === "sslcommerz" ? "card" : key, amount }))
    .reduce<{ key: string; amount: number }[]>((acc, r) => {
      const hit = acc.find((a) => a.key === r.key);
      if (hit) hit.amount += r.amount;
      else acc.push({ ...r });
      return acc;
    }, [])
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (total === 0) return [];
  const raw = rows.map((r) => (r.amount / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    left -= 1;
  }
  return rows.map((r, i) => ({ ...r, share: floors[i] ?? 0 }));
}

/** "3m 20s" / "45s" / "1h 05m". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/** Clean axis ticks from 0 to ≥ max (1-2-5 steps), at most `count + 1` ticks. */
export function niceTicks(max: number, count = 4, minStep = 1): number[] {
  if (max <= 0) return [0, minStep];
  const rough = max / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(minStep, ([1, 2, 5, 10].find((m) => m * pow >= rough) ?? 10) * pow);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}
