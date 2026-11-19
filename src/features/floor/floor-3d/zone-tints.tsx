"use client";

import { Html } from "@react-three/drei";

import type { FloorTable, Zone } from "../types";

const TINTS = ["#F5A524", "#5AA9F0", "#3FB37F", "#A78BFA", "#E5533D"];

/** Faint floor tint + label per zone (design system §6.1). */
export function ZoneTints({ zones, tables }: { zones: Zone[]; tables: FloorTable[] }) {
  return (
    <group>
      {zones.map((z, i) => {
        const ts = tables.filter((t) => t.zone_id === z.id);
        if (ts.length === 0) return null;
        const pad = 1.2;
        const minX = Math.min(...ts.map((t) => t.pos_x)) - pad;
        const maxX = Math.max(...ts.map((t) => t.pos_x)) + pad;
        const minZ = Math.min(...ts.map((t) => t.pos_y)) - pad;
        const maxZ = Math.max(...ts.map((t) => t.pos_y)) + pad;
        return (
          <group key={z.id}>
            <mesh
              rotation-x={-Math.PI / 2}
              position={[(minX + maxX) / 2, 0.006, (minZ + maxZ) / 2]}
            >
              <planeGeometry args={[maxX - minX, maxZ - minZ]} />
              <meshBasicMaterial
                color={TINTS[i % TINTS.length]}
                transparent
                opacity={0.1}
                depthWrite={false}
              />
            </mesh>
            <Html position={[minX + 0.4, 0.05, minZ + 0.3]} zIndexRange={[10, 0]}>
              <span className="pointer-events-none rounded-full bg-card/80 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-muted-foreground">
                {z.name}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
