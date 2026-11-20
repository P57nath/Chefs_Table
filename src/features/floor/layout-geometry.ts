import type { FloorTable } from "./types";

/** Shared floor-plan geometry for the 2D map and the 3D diorama (units ≈ metres). */
export interface TableFootprint {
  /** Half-width / half-depth before rotation. */
  hx: number;
  hz: number;
  round: boolean;
}

export function footprint(table: Pick<FloorTable, "shape" | "seats">): TableFootprint {
  if (table.shape === "round") {
    const r = 0.45 + Math.min(table.seats, 10) * 0.05;
    return { hx: r, hz: r, round: true };
  }
  if (table.shape === "rect") {
    return { hx: 0.45 + Math.ceil(table.seats / 2) * 0.28, hz: 0.5, round: false };
  }
  return { hx: 0.5, hz: 0.5, round: false };
}

/**
 * Chair positions (local, before rotation) spaced evenly around the table.
 * `angle` is a Y rotation that turns local +z (a seated guest's front) toward the table.
 */
export function chairPositions(
  table: Pick<FloorTable, "shape" | "seats">,
): { x: number; z: number; angle: number }[] {
  const f = footprint(table);
  const n = Math.max(1, Math.min(table.seats, 12));
  const gap = 0.38;
  if (f.round) {
    const r = f.hx + gap;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      // Facing the table centre: local +z rotated by `angle` must point at -(cos a, sin a).
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, angle: -a - Math.PI / 2 };
    });
  }
  if (table.shape === "rect" && n > 2) {
    const perSide = Math.ceil(n / 2);
    return Array.from({ length: n }, (_, i) => {
      const side = i < perSide ? -1 : 1;
      const idx = i < perSide ? i : i - perSide;
      const count = i < perSide ? perSide : n - perSide;
      const x = -f.hx + ((idx + 0.5) * (2 * f.hx)) / count;
      return { x, z: side * (f.hz + gap), angle: side < 0 ? 0 : Math.PI };
    });
  }
  // Square / small tables: chairs on the four sides, first top & bottom.
  const sides = [
    { x: 0, z: -(f.hz + gap), angle: 0 },
    { x: 0, z: f.hz + gap, angle: Math.PI },
    { x: -(f.hx + gap), z: 0, angle: Math.PI / 2 },
    { x: f.hx + gap, z: 0, angle: -Math.PI / 2 },
  ];
  return sides.slice(0, Math.min(n, 4));
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Room bounds with padding; the kitchen pass sits at y = 0 (top edge). */
export function floorBounds(tables: readonly Pick<FloorTable, "pos_x" | "pos_y">[]): Bounds {
  if (tables.length === 0) return { minX: 0, minY: 0, maxX: 10, maxY: 8 };
  const xs = tables.map((t) => t.pos_x);
  const ys = tables.map((t) => t.pos_y);
  return {
    minX: Math.min(0, Math.min(...xs) - 1.5),
    minY: Math.min(0, Math.min(...ys) - 2),
    maxX: Math.max(...xs) + 1.5,
    maxY: Math.max(...ys) + 1.5,
  };
}
