"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

/**
 * Per-device shift preferences (sound, vibration) in localStorage and a per-tab
 * "shift started" flag in sessionStorage. Starting the shift is the user gesture
 * that unlocks audio; it also requests a screen wake lock.
 */
export interface ShiftSettings {
  started: boolean;
  sound: boolean;
  vibration: boolean;
  setSound: (on: boolean) => void;
  setVibration: (on: boolean) => void;
  start: () => void;
}

const PREFS_KEY = "es-shift-prefs";
const STARTED_KEY = "es-shift-started";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}
function write(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
  } catch {
    // private mode: settings last for this page only
  }
  notify();
}

const local = () => localStorage;
const session = () => sessionStorage;

export function useShiftSettings(): ShiftSettings {
  const prefs = useSyncExternalStore(
    subscribe,
    () => read(local, PREFS_KEY) ?? "",
    () => "",
  );
  const started = useSyncExternalStore(
    subscribe,
    () => read(session, STARTED_KEY) === "1",
    () => true,
  );
  const parsed = useMemo(() => {
    const [sound = "1", vibration = "1"] = prefs.split(",");
    return { sound: sound !== "0", vibration: vibration !== "0" };
  }, [prefs]);

  const setPrefs = useCallback(
    (next: { sound: boolean; vibration: boolean }) =>
      write(local, PREFS_KEY, `${next.sound ? 1 : 0},${next.vibration ? 1 : 0}`),
    [],
  );

  useWakeLock(started);

  return useMemo(
    () => ({
      started,
      ...parsed,
      setSound: (on: boolean) => setPrefs({ ...parsed, sound: on }),
      setVibration: (on: boolean) => setPrefs({ ...parsed, vibration: on }),
      start: () => write(session, STARTED_KEY, "1"),
    }),
    [started, parsed, setPrefs],
  );
}

/** Keep the tablet awake during a shift; re-acquire when the tab becomes visible again. */
function useWakeLock(active: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible" && !lock.current) {
          lock.current = await navigator.wakeLock.request("screen");
          lock.current.addEventListener("release", () => {
            lock.current = null;
          });
          if (cancelled) await lock.current.release();
        }
      } catch {
        // Battery saver or unsupported: the app still works, the screen may sleep.
      }
    };
    void acquire();
    const onVisible = () => void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock.current?.release();
      lock.current = null;
    };
  }, [active]);
}
