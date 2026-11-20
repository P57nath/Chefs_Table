"use client";

import { Box, RotateCcw, RotateCw, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { SkeletonBlock } from "@/components/states/skeletons";
import { Button } from "@/components/ui/button";
import { chairPositions, footprint } from "@/features/floor/layout-geometry";
import { tableStatus } from "@/features/floor/status";
import type { FloorTable } from "@/features/floor/types";
import { cn } from "@/lib/utils";

import { saveLayout } from "../server/floor-actions";
import { useRun } from "../use-run";
import {
  changedPlacements,
  clampPos,
  keyToChange,
  moveBy,
  rotateBy,
  type Placement,
} from "./layout-model";
import type { AdminTable, AdminZone } from "./types";

const FloorScene = dynamic(() => import("@/features/floor/floor-3d/floor-scene"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-full w-full rounded-2xl" />,
});

const U = 40; // SVG units per metre
const noop = () => {};

const toPlacements = (tables: AdminTable[]) =>
  Object.fromEntries(
    tables.map((t) => [t.id, { x: Number(t.pos_x), y: Number(t.pos_y), rotation: t.rotation }]),
  ) as Record<string, Placement>;

/**
 * Drag tables on a 0.5 m grid (pointer or keyboard), rotate, then save the
 * whole layout atomically. The live floor (2D and 3D) uses the same positions.
 */
export function LayoutEditor({ tables, zones }: { tables: AdminTable[]; zones: AdminZone[] }) {
  const t = useTranslations("admin.floor");
  const { run, pending } = useRun();
  const active = tables.filter((x) => x.is_active);
  const [saved, setSaved] = useState(() => toPlacements(active));
  const [pos, setPos] = useState(saved);
  const [source, setSource] = useState(tables);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [announce, setAnnounce] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  // Fresh server data (after save / table edits) resets the editor.
  if (source !== tables) {
    const next = toPlacements(tables.filter((x) => x.is_active));
    setSource(tables);
    setSaved(next);
    setPos(next);
  }

  const changes = changedPlacements(saved, pos);
  const maxX = Math.max(18, ...Object.values(pos).map((p) => p.x + 2));
  const maxY = Math.max(12, ...Object.values(pos).map((p) => p.y + 2));

  function toFloor(e: React.PointerEvent) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x / U, y: pt.y / U };
  }

  function update(id: string, next: Placement, label: string) {
    setPos((p) => ({ ...p, [id]: next }));
    setAnnounce(t("position", { label, x: next.x, y: next.y, rotation: next.rotation }));
  }

  const asFloorTable = (tb: AdminTable): FloorTable => {
    const p = pos[tb.id] ?? { x: Number(tb.pos_x), y: Number(tb.pos_y), rotation: tb.rotation };
    return {
      table_id: tb.id,
      label: tb.label,
      seats: tb.seats,
      shape: tb.shape,
      pos_x: p.x,
      pos_y: p.y,
      rotation: p.rotation,
      zone_id: tb.zone_id,
      session: null,
    };
  };
  const sel = active.find((x) => x.id === selected) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() =>
            run(() => saveLayout(changes), {
              success: t("layoutSaved"),
              onDone: () => setSaved(pos),
            })
          }
          disabled={changes.length === 0}
          loading={pending}
        >
          {changes.length ? t("saveLayout", { count: changes.length }) : t("noChanges")}
        </Button>
        <Button variant="secondary" disabled={changes.length === 0} onClick={() => setPos(saved)}>
          <Undo2 aria-hidden />
          {t("discard")}
        </Button>
        <Button
          variant={preview ? "default" : "outline"}
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          <Box aria-hidden />
          {t("preview3d")}
        </Button>
        {sel ? (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-medium">{sel.label}</span>
            <Button
              size="sm"
              variant="secondary"
              aria-label={t("rotateLeft", { label: sel.label })}
              onClick={() => {
                const p = pos[sel.id]!;
                update(sel.id, { ...p, rotation: rotateBy(p.rotation, -15) }, sel.label);
              }}
            >
              <RotateCcw aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              aria-label={t("rotateRight", { label: sel.label })}
              onClick={() => {
                const p = pos[sel.id]!;
                update(sel.id, { ...p, rotation: rotateBy(p.rotation, 15) }, sel.label);
              }}
            >
              <RotateCw aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{t("layoutHint")}</p>

      {preview ? (
        <div className="h-[420px] overflow-hidden rounded-2xl border border-border">
          <FloorScene
            rows={active.map((tb) => {
              const table = asFloorTable(tb);
              return { table, status: tableStatus(table, 0) };
            })}
            zones={zones.map((z) => ({ id: z.id, name: z.name, sort: z.sort }))}
            selectedId={selected}
            focusedId={null}
            waiterColor="#F59E0B"
            onOpen={(ft) => setSelected(ft.table_id)}
            onTooSlow={noop}
          />
        </div>
      ) : null}

      <div className="overflow-auto rounded-2xl border border-border bg-surface">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${maxX * U} ${maxY * U}`}
          className="block h-auto min-w-[640px] touch-none select-none"
          style={{ width: "100%" }}
          role="group"
          aria-label={t("planLabel")}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const f = toFloor(e);
            const tb = active.find((x) => x.id === d.id);
            if (!f || !tb) return;
            const p = pos[d.id]!;
            update(d.id, { ...p, x: clampPos(f.x - d.dx), y: clampPos(f.y - d.dy) }, tb.label);
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
        >
          <defs>
            <pattern id="grid" width={U / 2} height={U / 2} patternUnits="userSpaceOnUse">
              <path
                d={`M ${U / 2} 0 L 0 0 0 ${U / 2}`}
                className="fill-none stroke-border"
                strokeWidth={1}
              />
            </pattern>
          </defs>
          <rect width={maxX * U} height={maxY * U} fill="url(#grid)" />
          <rect width={maxX * U} height={U * 0.4} className="fill-muted" />
          <text x={U * 0.3} y={U * 0.28} className="fill-muted-foreground text-[11px] font-medium">
            {t("kitchenPass")}
          </text>
          {active.map((tb) => {
            const p = pos[tb.id]!;
            const f = footprint(tb);
            const isSel = tb.id === selected;
            return (
              <g
                key={tb.id}
                role="button"
                tabIndex={0}
                data-table={tb.label}
                aria-label={t("tableHandle", {
                  label: tb.label,
                  x: p.x,
                  y: p.y,
                  rotation: p.rotation,
                })}
                aria-pressed={isSel}
                transform={`translate(${p.x * U} ${p.y * U}) rotate(${p.rotation})`}
                className={cn(
                  "cursor-grab outline-none active:cursor-grabbing [&:focus-visible_.ring]:opacity-100",
                  isSel ? "text-primary-text" : "text-muted-foreground",
                )}
                onPointerDown={(e) => {
                  const fp = toFloor(e);
                  if (!fp) return;
                  setSelected(tb.id);
                  drag.current = { id: tb.id, dx: fp.x - p.x, dy: fp.y - p.y };
                  (e.currentTarget.ownerSVGElement ?? e.currentTarget).setPointerCapture?.(
                    e.pointerId,
                  );
                }}
                onFocus={() => setSelected(tb.id)}
                onKeyDown={(e) => {
                  const c = keyToChange(e.key, e.shiftKey);
                  if (!c) return;
                  e.preventDefault();
                  const moved = moveBy(p, c.dx, c.dy);
                  update(tb.id, { ...moved, rotation: rotateBy(p.rotation, c.dr) }, tb.label);
                }}
              >
                {chairPositions(tb).map((c, i) => (
                  <circle
                    key={i}
                    cx={c.x * U}
                    cy={c.z * U}
                    r={U * 0.16}
                    className="fill-muted-foreground/40"
                  />
                ))}
                {f.round ? (
                  <circle
                    r={f.hx * U}
                    className="fill-card stroke-current"
                    strokeWidth={isSel ? 4 : 2.5}
                  />
                ) : (
                  <rect
                    x={-f.hx * U}
                    y={-f.hz * U}
                    width={f.hx * 2 * U}
                    height={f.hz * 2 * U}
                    rx={6}
                    className="fill-card stroke-current"
                    strokeWidth={isSel ? 4 : 2.5}
                  />
                )}
                <circle
                  r={Math.max(f.hx, f.hz) * U + 10}
                  className="fill-none stroke-ring opacity-0 ring"
                  strokeWidth={3}
                />
                <text
                  transform={`rotate(${-p.rotation})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground text-[15px] font-medium"
                >
                  {tb.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
