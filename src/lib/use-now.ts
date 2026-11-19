"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared 1-second clock for every timer on screen (KDS can show dozens),
 * instead of an interval per component. Returns null during SSR/hydration so
 * server and client markup match; timers render a same-width placeholder.
 */
const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => null;

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
