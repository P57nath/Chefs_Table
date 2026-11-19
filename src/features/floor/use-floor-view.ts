"use client";

import { useCallback, useSyncExternalStore } from "react";

export type FloorView = "3d" | "2d" | "list";
const KEY = "es-floor-view";
const listeners = new Set<() => void>();

function read(): FloorView | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "3d" || v === "2d" || v === "list" ? v : null;
  } catch {
    return null;
  }
}

/** WebGL available? (cached; the 3D floor auto-falls back to 2D without it). */
let webgl: boolean | null = null;
export function hasWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return webgl;
}

/** View choice remembered per device; default 3D on tablets, list on phones. */
export function useFloorView(): [FloorView | null, (v: FloorView) => void] {
  const stored = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
  const set = useCallback((v: FloorView) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // private mode: lasts for this page only
    }
    listeners.forEach((l) => l());
  }, []);
  return [stored, set];
}
