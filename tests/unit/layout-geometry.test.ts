import { describe, expect, it } from "vitest";

import { chairPositions } from "@/features/floor/layout-geometry";

/** Direction a seated guest faces: local +z rotated by `angle` around Y (three.js convention). */
function facing(angle: number) {
  return { x: Math.sin(angle), z: Math.cos(angle) };
}

describe("chairPositions", () => {
  const shapes = [
    { shape: "round" as const, seats: 6 },
    { shape: "round" as const, seats: 3 },
    { shape: "rect" as const, seats: 6 },
    { shape: "square" as const, seats: 4 },
  ];

  for (const table of shapes) {
    it(`seats every guest facing the table (${table.shape}, ${table.seats})`, () => {
      for (const c of chairPositions(table)) {
        const f = facing(c.angle);
        // Vector from chair to table centre is (-x, -z); facing must point the same way.
        const dot = f.x * -c.x + f.z * -c.z;
        expect(dot).toBeGreaterThan(0);
      }
    });
  }
});
