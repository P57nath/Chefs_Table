"use client";

import { Html } from "@react-three/drei";

import type { FloorTable, Zone } from "../types";

import { ROOM } from "./palette";

/**
 * Each zone sits on its own rug (neutral woven tones, a darker border) with a
 * quiet label at its corner — zones read apart without colour washes.
 */
export function ZoneTints({ zones, tables }: { zones: Zone[]; tables: FloorTable[] }) {
  return (
    <group>
      {zones.map((z, i) => {
        const ts = tables.filter((t) => t.zone_id === z.id);
        if (ts.length === 0) return null;
        const pad = 1.25;
        const minX = Math.min(...ts.map((t) => t.pos_x)) - pad;
        const maxX = Math.max(...ts.map((t) => t.pos_x)) + pad;
        const minZ = Math.min(...ts.map((t) => t.pos_y)) - pad;
        const maxZ = Math.max(...ts.map((t) => t.pos_y)) + pad;
        const w = maxX - minX;
        const d = maxZ - minZ;
        const color = ROOM.rug[i % ROOM.rug.length];
        return (
          <group key={z.id} position={[(minX + maxX) / 2, 0, (minZ + maxZ) / 2]}>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]} receiveShadow>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color="#000000" transparent opacity={0.16} roughness={1} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.009, 0]} receiveShadow>
              <planeGeometry args={[w - 0.16, d - 0.16]} />
              <meshStandardMaterial color={color} roughness={1} />
            </mesh>
            <Html position={[-w / 2 + 0.3, 0.02, -d / 2 + 0.3]} zIndexRange={[10, 0]}>
              <span className="pointer-events-none rounded-sm border border-border bg-card px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-muted-foreground">
                {z.name}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
