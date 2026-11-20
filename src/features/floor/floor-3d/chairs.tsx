"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { chairPositions } from "../layout-geometry";
import type { FloorTable } from "../types";

import { ROOM } from "./palette";

/** Chair parts in chair-local space (front = +z, toward the table). */
const PARTS = {
  seat: { pos: new THREE.Vector3(0, 0.44, 0), size: [0.42, 0.06, 0.42] },
  back: { pos: new THREE.Vector3(0, 0.72, -0.19), size: [0.42, 0.5, 0.05] },
} as const;
const LEG_SIZE = [0.04, 0.42, 0.04] as const;
const LEGS = [
  new THREE.Vector3(-0.17, 0.21, -0.17),
  new THREE.Vector3(0.17, 0.21, -0.17),
  new THREE.Vector3(-0.17, 0.21, 0.17),
  new THREE.Vector3(0.17, 0.21, 0.17),
];

/** Every chair's seat, backrest and four legs as three instanced meshes (three draw calls). */
export function Chairs({ tables }: { tables: FloorTable[] }) {
  const seat = useRef<THREE.InstancedMesh>(null);
  const back = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);

  const chairs = useMemo(() => {
    const out: { pos: THREE.Vector3; q: THREE.Quaternion }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (const t of tables) {
      const rot = (-t.rotation * Math.PI) / 180;
      for (const c of chairPositions(t)) {
        const local = new THREE.Vector3(c.x, 0, c.z).applyAxisAngle(up, rot);
        out.push({
          pos: local.add(new THREE.Vector3(t.pos_x, 0, t.pos_y)),
          q: new THREE.Quaternion().setFromAxisAngle(up, rot + c.angle),
        });
      }
    }
    return out;
  }, [tables]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);
    const apply = (mesh: THREE.InstancedMesh | null, offsets: THREE.Vector3[]) => {
      if (!mesh) return;
      let i = 0;
      for (const c of chairs) {
        for (const offset of offsets) {
          const p = offset.clone().applyQuaternion(c.q).add(c.pos);
          mesh.setMatrixAt(i++, m.compose(p, c.q, one));
        }
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
    };
    apply(seat.current, [PARTS.seat.pos]);
    apply(back.current, [PARTS.back.pos]);
    apply(legs.current, LEGS);
  }, [chairs]);

  const n = Math.max(chairs.length, 1);
  return (
    <group>
      <instancedMesh ref={seat} args={[undefined, undefined, n]} castShadow receiveShadow>
        <boxGeometry args={PARTS.seat.size} />
        <meshStandardMaterial color={ROOM.chairSeat} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={back} args={[undefined, undefined, n]} castShadow receiveShadow>
        <boxGeometry args={PARTS.back.size} />
        <meshStandardMaterial color={ROOM.chair} roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, n * LEGS.length]} castShadow>
        <boxGeometry args={LEG_SIZE} />
        <meshStandardMaterial color={ROOM.chair} roughness={0.7} />
      </instancedMesh>
    </group>
  );
}
