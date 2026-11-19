"use client";

import { useLocale, useTranslations } from "next-intl";
import type { KeyboardEvent } from "react";

import { formatElapsedShort } from "@/lib/time";
import { STATUS_VISUALS } from "@/lib/status";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

import type { TableWithStatus } from "./floor-list";
import { chairPositions, floorBounds, footprint } from "./layout-geometry";
import type { FloorTable, Zone } from "./types";

const U = 60; // SVG units per floor unit

/** 2D top-down plan: tables as shapes with status ring, seat dots and a badge. */
export function FloorMap({
  rows,
  zones,
  selectedId,
  onOpen,
}: {
  rows: TableWithStatus[];
  zones: Zone[];
  selectedId: string | null;
  onOpen: (t: FloorTable) => void;
}) {
  const tState = useTranslations("tableState");
  const t = useTranslations("floor");
  const locale = useLocale();
  const now = useNow();
  const b = floorBounds(rows.map((r) => r.table));
  const width = (b.maxX - b.minX) * U;
  const height = (b.maxY - b.minY) * U;
  const X = (x: number) => (x - b.minX) * U;
  const Y = (y: number) => (y - b.minY) * U;

  const zoneBoxes = zones
    .map((z) => {
      const ts = rows.filter((r) => r.table.zone_id === z.id).map((r) => r.table);
      if (ts.length === 0) return null;
      const pad = 1.1;
      return {
        zone: z,
        x: X(Math.min(...ts.map((t) => t.pos_x)) - pad),
        y: Y(Math.min(...ts.map((t) => t.pos_y)) - pad),
        w:
          (Math.max(...ts.map((t) => t.pos_x)) - Math.min(...ts.map((t) => t.pos_x)) + pad * 2) * U,
        h:
          (Math.max(...ts.map((t) => t.pos_y)) - Math.min(...ts.map((t) => t.pos_y)) + pad * 2) * U,
      };
    })
    .filter((z): z is NonNullable<typeof z> => z !== null);

  const onKey = (e: KeyboardEvent, table: FloorTable) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(table);
    }
  };

  return (
    <div className="surface-raised overflow-auto rounded-3xl border border-border bg-surface">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={t("tablesLabel")}
        className="h-auto w-full min-w-[640px] touch-manipulation select-none"
      >
        {/* kitchen pass */}
        <rect
          x={X(b.minX) + U * 0.5}
          y={Y(0) + 4}
          width={width - U}
          height={U * 0.35}
          rx={12}
          className="fill-muted"
        />
        {zoneBoxes.map((z) => (
          <g key={z.zone.id} aria-hidden>
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx={24}
              className="fill-primary/5 stroke-border"
              strokeDasharray="6 8"
            />
            <text
              x={z.x + 14}
              y={z.y + 26}
              className="fill-muted-foreground text-[18px] font-semibold"
            >
              {z.zone.name}
            </text>
          </g>
        ))}
        {rows.map(({ table, status }) => {
          const f = footprint(table);
          const visual = STATUS_VISUALS[status.state];
          const cx = X(table.pos_x);
          const cy = Y(table.pos_y);
          const selected = selectedId === table.table_id;
          const pulse = visual.pulse !== "none" || status.overdue;
          const elapsed =
            status.since && now !== null
              ? formatElapsedShort(now - new Date(status.since).getTime(), locale)
              : null;
          return (
            <g
              key={table.table_id}
              role="button"
              tabIndex={0}
              data-table={table.label}
              aria-label={
                status.counts.toReview > 0
                  ? `${t("openTable", { label: table.label, state: tState(status.state) })} · ${t("toReview")}`
                  : t("openTable", { label: table.label, state: tState(status.state) })
              }
              onClick={() => onOpen(table)}
              onKeyDown={(e) => onKey(e, table)}
              className={cn(
                "cursor-pointer outline-none [&:focus-visible_.focus-ring]:opacity-100",
                status.overdue ? "text-ember" : visual.tone,
              )}
              transform={`translate(${cx} ${cy}) rotate(${table.rotation})`}
            >
              {chairPositions(table).map((c, i) => (
                <circle
                  key={i}
                  cx={c.x * U}
                  cy={c.z * U}
                  r={U * 0.16}
                  className={
                    table.session && i < table.session.guest_count ? "fill-current" : "fill-muted"
                  }
                  opacity={0.75}
                />
              ))}
              {pulse ? (
                f.round ? (
                  <circle
                    r={f.hx * U + 10}
                    className={cn(
                      "fill-none stroke-current",
                      status.overdue || visual.pulse === "fast"
                        ? "animate-ring-pulse-fast"
                        : "animate-ring-pulse",
                    )}
                    strokeWidth={6}
                  />
                ) : (
                  <rect
                    x={-f.hx * U - 10}
                    y={-f.hz * U - 10}
                    width={f.hx * 2 * U + 20}
                    height={f.hz * 2 * U + 20}
                    rx={18}
                    className={cn(
                      "fill-none stroke-current",
                      status.overdue || visual.pulse === "fast"
                        ? "animate-ring-pulse-fast"
                        : "animate-ring-pulse",
                    )}
                    strokeWidth={6}
                  />
                )
              ) : null}
              {f.round ? (
                <circle
                  r={f.hx * U}
                  className="fill-card stroke-current"
                  strokeWidth={selected ? 8 : 5}
                />
              ) : (
                <rect
                  x={-f.hx * U}
                  y={-f.hz * U}
                  width={f.hx * 2 * U}
                  height={f.hz * 2 * U}
                  rx={12}
                  className="fill-card stroke-current"
                  strokeWidth={selected ? 8 : 5}
                />
              )}
              {f.round ? (
                <circle
                  r={f.hx * U + 14}
                  className="focus-ring fill-none stroke-ring opacity-0"
                  strokeWidth={4}
                />
              ) : (
                <rect
                  x={-f.hx * U - 14}
                  y={-f.hz * U - 14}
                  width={f.hx * 2 * U + 28}
                  height={f.hz * 2 * U + 28}
                  rx={20}
                  className="focus-ring fill-none stroke-ring opacity-0"
                  strokeWidth={4}
                />
              )}
              <g transform={`rotate(${-table.rotation})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  y={elapsed ? -9 : 0}
                  className="fill-foreground font-display text-[22px] font-semibold"
                >
                  {table.label}
                </text>
                {status.counts.toReview > 0 ? (
                  <g transform={`translate(${f.hx * U - 4} ${-f.hz * U + 4})`} aria-hidden>
                    <circle r={13} className="fill-ember" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-white text-[17px] font-bold"
                    >
                      !
                    </text>
                  </g>
                ) : null}
                {elapsed ? (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={14}
                    className="fill-current text-[15px] font-semibold tabular-nums"
                  >
                    {elapsed}
                  </text>
                ) : null}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
