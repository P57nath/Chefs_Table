"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { Bounds } from "../layout-geometry";

/** Procedural wooden planks (drawn once to a canvas — no image assets). */
function usePlankTexture(width: number, depth: number) {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const tones = ["#8A5A35", "#94633C", "#7F5230", "#9A6A42", "#86573A"];
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      let x = -((r * 97) % 200);
      while (x < 512) {
        const len = 140 + ((r * 53 + x) % 120);
        ctx.fillStyle = tones[(r + Math.abs(x)) % tones.length]!;
        ctx.fillRect(x, (r * 512) / rows, len - 3, 512 / rows - 3);
        x += len;
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width / 3, depth / 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [width, depth]);
}

/** Floor, two low walls, kitchen pass with heat lamps, plants, entrance mat, string lights. */
export function Room({
  bounds,
  cooking,
  readyPlates,
  evening,
}: {
  bounds: Bounds;
  cooking: boolean;
  readyPlates: number;
  evening: boolean;
}) {
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxY - bounds.minY;
  const cx = bounds.minX + w / 2;
  const cz = bounds.minY + d / 2;
  const planks = usePlankTexture(w, d);
  const steam = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!steam.current) return;
    steam.current.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.6 + i * 0.33) % 1;
      c.position.y = 1.3 + t * 0.9;
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.opacity = 0.45 * (1 - t);
    });
  });

  const plants = [
    [bounds.minX + 0.6, bounds.maxY - 0.6],
    [bounds.maxX - 0.6, bounds.maxY - 0.6],
    [bounds.minX + 0.6, cz],
  ] as const;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={planks} roughness={0.85} />
      </mesh>
      {/* low walls: back (top edge) and left */}
      <mesh position={[cx, 0.35, bounds.minY - 0.1]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.2, 0.7, 0.2]} />
        <meshStandardMaterial color="#E8DCCB" />
      </mesh>
      <mesh position={[bounds.minX - 0.1, 0.35, cz]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.7, d]} />
        <meshStandardMaterial color="#E8DCCB" />
      </mesh>
      {/* kitchen pass counter */}
      <group position={[cx, 0, bounds.minY + 0.55]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[Math.min(w * 0.7, 10), 1, 0.7]} />
          <meshStandardMaterial color="#3A2A1F" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <boxGeometry args={[Math.min(w * 0.7, 10) + 0.1, 0.05, 0.8]} />
          <meshStandardMaterial color="#C9C3BB" metalness={0.6} roughness={0.3} />
        </mesh>
        {[-2, 0, 2].map((x) => (
          <mesh key={x} position={[x, 1.75, 0]}>
            <cylinderGeometry args={[0.12, 0.2, 0.18, 16]} />
            <meshStandardMaterial
              color="#F5A524"
              emissive="#FF8A1F"
              emissiveIntensity={cooking ? 1.4 : 0.3}
            />
          </mesh>
        ))}
        {Array.from({ length: Math.min(readyPlates, 5) }, (_, i) => (
          <group key={i} position={[-1.6 + i * 0.8, 1.08, 0.05]}>
            <mesh>
              <cylinderGeometry args={[0.26, 0.22, 0.04, 24]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0, 0.07, 0]}>
              <sphereGeometry args={[0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#C97A06" />
            </mesh>
          </group>
        ))}
        <group ref={steam} visible={cooking}>
          {[-0.4, 0, 0.4].map((x) => (
            <mesh key={x} position={[x + 2.6, 1.3, 0]}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color="#FFFFFF" transparent opacity={0.4} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
      {/* potted plants */}
      {plants.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.17, 0.4, 16]} />
            <meshStandardMaterial color="#B5651D" />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <icosahedronGeometry args={[0.38, 0]} />
            <meshStandardMaterial color="#3E8E4E" flatShading />
          </mesh>
        </group>
      ))}
      {/* entrance mat */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.01, bounds.maxY - 0.4]}>
        <planeGeometry args={[1.8, 0.7]} />
        <meshStandardMaterial color="#5A3B2A" />
      </mesh>
      {/* evening string lights over the room */}
      {evening
        ? Array.from({ length: 14 }, (_, i) => (
            <mesh
              key={i}
              position={[bounds.minX + 1 + (i * (w - 2)) / 13, 2.6 + Math.sin(i * 0.9) * 0.08, cz]}
            >
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color="#FFD27A" emissive="#FFC24D" emissiveIntensity={2} />
            </mesh>
          ))
        : null}
    </group>
  );
}
