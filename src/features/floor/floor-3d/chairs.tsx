"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { chairPositions } from "../layout-geometry";
import type { FloorTable } from "../types";

/** Every chair in one instanced mesh (one draw call for the whole room). */
export function Chairs({ tables }: { tables: FloorTable[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const transforms = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    for (const t of tables) {
      const rot = (-t.rotation * Math.PI) / 180;
      for (const c of chairPositions(t)) {
        const local = new THREE.Vector3(c.x, 0.23, c.z).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rot,
        );
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot + c.angle);
        out.push(m.clone().compose(local.add(new THREE.Vector3(t.pos_x, 0, t.pos_y)), q, s));
      }
    }
    return out;
  }, [tables]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    transforms.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.count = transforms.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, Math.max(transforms.length, 1)]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.42, 0.46, 0.42]} />
      <meshStandardMaterial color="#6B4428" roughness={0.8} />
    </instancedMesh>
  );
}
