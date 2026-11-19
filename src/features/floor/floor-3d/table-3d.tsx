"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type * as THREE from "three";

import { STATUS_VISUALS } from "@/lib/status";
import { localizeDigits } from "@/lib/digits";
import { formatElapsedShort } from "@/lib/time";
import { cn } from "@/lib/utils";

import { chairPositions, footprint } from "../layout-geometry";
import type { TableStatus } from "../status";
import type { FloorTable } from "../types";

import { guestLook, STATE_HEX } from "./palette";
import { animationFor, Guest } from "./people";

interface Table3DProps {
  table: FloorTable;
  status: TableStatus;
  selected: boolean;
  focused: boolean;
  now: number | null;
  onOpen: (t: FloorTable) => void;
}

/** One table: top + legs, glowing status ring, seated guests, Html badge. */
export function Table3D({ table, status, selected, focused, now, onOpen }: Table3DProps) {
  const t = useTranslations("tableState");
  const locale = useLocale();
  const ring = useRef<THREE.Mesh>(null);
  const top = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const f = footprint(table);
  const color = status.overdue ? STATE_HEX.call_waiter : STATE_HEX[status.state];
  const pulse = status.overdue ? "fast" : STATUS_VISUALS[status.state].pulse;
  const chairs = chairPositions(table);
  const seated = table.session ? Math.min(table.session.guest_count, chairs.length) : 0;
  const anim = animationFor(status.state);
  const Icon = STATUS_VISUALS[status.state].icon;

  useFrame(({ clock }) => {
    if (ring.current) {
      const speed = pulse === "fast" ? 7 : pulse === "slow" ? 3.5 : 0;
      const s = speed ? 1 + (Math.sin(clock.elapsedTime * speed) + 1) * 0.06 : 1;
      ring.current.scale.set(s, s, 1);
      const m = ring.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = speed
        ? 0.6 + (Math.sin(clock.elapsedTime * speed) + 1) * 0.6
        : status.state === "free"
          ? 0.05
          : 0.5;
    }
    if (top.current) {
      const lift = hover || selected || focused ? 0.06 : 0;
      top.current.position.y += (lift - top.current.position.y) * 0.2;
    }
  });

  const elapsed =
    status.since && now !== null
      ? formatElapsedShort(now - new Date(status.since).getTime(), locale)
      : null;

  return (
    <group position={[table.pos_x, 0, table.pos_y]} rotation-y={(-table.rotation * Math.PI) / 180}>
      {/* status ring on the floor */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
        {f.round ? (
          <ringGeometry args={[f.hx + 0.62, f.hx + 0.78, 48]} />
        ) : (
          <ringGeometry
            args={[Math.max(f.hx, f.hz) + 0.62, Math.max(f.hx, f.hz) + 0.78, 4, 1, Math.PI / 4]}
          />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={status.state === "free" ? 0.35 : 0.9}
        />
      </mesh>
      <group
        ref={top}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(table);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          {f.round ? (
            <cylinderGeometry args={[f.hx, f.hx, 0.06, 40]} />
          ) : (
            <boxGeometry args={[f.hx * 2, 0.06, f.hz * 2]} />
          )}
          <meshStandardMaterial
            color={selected || focused ? "#FFF3D6" : "#F4EDE4"}
            roughness={0.5}
          />
        </mesh>
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.12, 0.72, 12]} />
          <meshStandardMaterial color="#3A2A1F" />
        </mesh>
        {/* plates while eating / paid */}
        {anim.eating
          ? chairs.slice(0, seated).map((c, i) => (
              <mesh key={i} position={[c.x * 0.55, 0.79, c.z * 0.55]}>
                <cylinderGeometry args={[0.13, 0.11, 0.025, 20]} />
                <meshStandardMaterial color="#FFFFFF" />
              </mesh>
            ))
          : null}
      </group>
      {/* guests */}
      {table.session
        ? chairs.slice(0, seated).map((c, i) => {
            const look = guestLook(table.session!.id, i);
            return (
              <Guest
                key={i}
                position={[c.x * 1.05, 0.12, c.z * 1.05]}
                facing={c.angle}
                skin={look.skin}
                shirt={look.shirt}
                phase={look.phase}
                raiseHand={anim.raiseHand && i === 0}
                waveFast={anim.waveFast && i === 0}
                eating={anim.eating}
              />
            );
          })
        : null}
      {/* badge */}
      <Html position={[0, 2.1, 0]} center zIndexRange={[20, 0]}>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onOpen(table)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border bg-card/95 px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-md backdrop-blur",
            selected || focused ? "border-primary ring-2 ring-primary/50" : "border-border",
          )}
        >
          <span className="font-display text-sm">{table.label}</span>
          <span className={cn("inline-flex items-center gap-1", STATUS_VISUALS[status.state].tone)}>
            <Icon className="size-3.5" aria-hidden />
            <span className="text-foreground">{t(status.state)}</span>
          </span>
          {elapsed ? <span className="text-foreground/70 tabular-nums">{elapsed}</span> : null}
          {table.session ? (
            <span className="text-foreground/70">
              · {localizeDigits(table.session.guest_count, locale)}
            </span>
          ) : null}
        </button>
      </Html>
    </group>
  );
}
