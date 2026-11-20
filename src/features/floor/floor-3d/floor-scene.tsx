"use client";

import {
  AdaptiveDpr,
  MapControls,
  OrthographicCamera,
  PerformanceMonitor,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";

import { IconButton } from "@/components/common/icon-button";
import { useNow } from "@/lib/use-now";

import type { TableWithStatus } from "../floor-list";
import { floorBounds } from "../layout-geometry";
import type { FloorTable, Zone } from "../types";

import { Chairs } from "./chairs";
import { dayNight } from "./palette";
import { Waiter } from "./people";
import { Room } from "./room";
import { ZoneTints } from "./zone-tints";
import { Table3D } from "./table-3d";

const ISO_AZIMUTH = Math.PI / 4; // 45° around
const ISO_ELEVATION = (35 * Math.PI) / 180; // ≈35° down
const MAX_ROTATE = (25 * Math.PI) / 180;

export interface FloorSceneProps {
  rows: TableWithStatus[];
  zones: Zone[];
  selectedId: string | null;
  focusedId: string | null;
  waiterColor: string;
  onOpen: (t: FloorTable) => void;
  /** Called when the device can't keep up (FPS < 30 after degrading). */
  onTooSlow: () => void;
}

/**
 * Isometric orthographic camera whose zoom fits the room's projected footprint
 * (floor plus wall height) to the canvas, so the room fills the frame.
 */
function IsoCamera({
  position,
  width,
  depth,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
}) {
  const size = useThree((s) => s.size);
  const span = (width + depth) * Math.SQRT1_2;
  const projW = span;
  const projH = span * Math.sin(ISO_ELEVATION) + 2.2 * Math.cos(ISO_ELEVATION);
  const zoom = Math.min(size.width / (projW * 1.04), size.height / (projH * 1.1));
  return <OrthographicCamera makeDefault position={position} zoom={zoom} near={0.1} far={200} />;
}

export default function FloorScene({
  rows,
  zones,
  selectedId,
  focusedId,
  waiterColor,
  onOpen,
  onTooSlow,
}: FloorSceneProps) {
  const t = useTranslations("floor");
  const now = useNow();
  const [shadows, setShadows] = useState(true);
  const [dpr, setDpr] = useState(1.5);
  const [resetKey, setResetKey] = useState(0);
  const declines = useRef(0);
  const controls = useRef<ComponentRef<typeof MapControls>>(null);

  const tables = useMemo(() => rows.map((r) => r.table), [rows]);
  const b = floorBounds(tables);
  const center = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minY + b.maxY) / 2);
  const dist = 40;
  const camPos: [number, number, number] = [
    center.x + dist * Math.cos(ISO_ELEVATION) * Math.sin(ISO_AZIMUTH),
    dist * Math.sin(ISO_ELEVATION),
    center.z + dist * Math.cos(ISO_ELEVATION) * Math.cos(ISO_AZIMUTH),
  ];
  const light = dayNight(now ?? 0);
  const sunTarget = useMemo(() => new THREE.Object3D(), []);
  const shadowSpan = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.8 + 2;
  const anyCooking = rows.some((r) => r.status.counts.cooking > 0);
  const readyPlates = rows.reduce((n, r) => n + r.status.counts.ready, 0);
  const openTickets = rows.reduce(
    (n, r) => n + r.status.counts.cooking + r.status.counts.newOrders,
    0,
  );
  const selected = rows.find((r) => r.table.table_id === selectedId)?.table ?? null;
  const waiterHome = useMemo(
    () => new THREE.Vector3(center.x + 3.4, 0, b.minY + 1.4),
    [center.x, b.minY],
  );
  const waiterTarget = useMemo(
    () => (selected ? new THREE.Vector3(selected.pos_x + 1.1, 0, selected.pos_y + 1.1) : null),
    [selected],
  );

  function reset() {
    controls.current?.reset();
    setResetKey((k) => k + 1);
  }

  return (
    <div className="relative h-full w-full" onDoubleClick={reset}>
      <Canvas
        shadows={shadows}
        dpr={[1, dpr]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        style={{ background: light.sky }}
      >
        <PerformanceMonitor
          onDecline={() => {
            declines.current += 1;
            if (declines.current === 1) setDpr(1);
            else if (declines.current === 2) setShadows(false);
            else onTooSlow();
          }}
        />
        <AdaptiveDpr pixelated />
        <IsoCamera
          key={resetKey}
          position={camPos}
          width={b.maxX - b.minX}
          depth={b.maxY - b.minY}
        />
        <MapControls
          ref={controls}
          target={center}
          enableRotate
          enableDamping
          screenSpacePanning
          minZoom={8}
          maxZoom={160}
          minAzimuthAngle={ISO_AZIMUTH - MAX_ROTATE}
          maxAzimuthAngle={ISO_AZIMUTH + MAX_ROTATE}
          minPolarAngle={Math.PI / 2 - ISO_ELEVATION}
          maxPolarAngle={Math.PI / 2 - ISO_ELEVATION}
        />
        <ambientLight intensity={light.ambient} color="#fff6ea" />
        <hemisphereLight args={[light.hemiSky, light.hemiGround, light.hemi]} />
        <primitive object={sunTarget} position={[center.x, 0, center.z]} />
        <directionalLight
          position={[center.x + 8, 16, center.z + 6]}
          target={sunTarget}
          intensity={light.sun}
          color={light.sunColor}
          castShadow={shadows}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-radius={4}
          shadow-camera-left={-shadowSpan}
          shadow-camera-right={shadowSpan}
          shadow-camera-top={shadowSpan}
          shadow-camera-bottom={-shadowSpan}
          shadow-camera-near={1}
          shadow-camera-far={60}
        />
        <Room
          bounds={b}
          cooking={anyCooking}
          readyPlates={readyPlates}
          openTickets={openTickets}
          evening={light.evening}
        />
        <ZoneTints zones={zones} tables={tables} />
        <Chairs tables={tables} />
        {rows.map(({ table, status }) => (
          <Table3D
            key={table.table_id}
            table={table}
            status={status}
            selected={table.table_id === selectedId}
            focused={table.table_id === focusedId}
            now={now}
            onOpen={onOpen}
          />
        ))}
        <Waiter color={waiterColor} home={waiterHome} target={waiterTarget} />
      </Canvas>
      <div className="absolute right-3 bottom-3">
        <IconButton label={t("resetView")} variant="secondary" onClick={reset}>
          <RotateCcw aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
