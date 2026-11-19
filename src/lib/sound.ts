"use client";

/**
 * Generated WebAudio chimes — no audio files. Browsers only allow audio after
 * a user gesture, so call `unlockAudio()` from a tap (slide-to-order, Start shift).
 */
type Chime = "soft" | "alert" | "ready" | "success";

const NOTES: Record<Chime, { freqs: number[]; gap: number; length: number; gain: number }> = {
  soft: { freqs: [660, 880], gap: 0.12, length: 0.35, gain: 0.08 },
  alert: { freqs: [880, 660, 880], gap: 0.14, length: 0.3, gain: 0.14 },
  ready: { freqs: [1046, 1318], gap: 0.1, length: 0.6, gain: 0.12 },
  success: { freqs: [523, 659, 784], gap: 0.09, length: 0.4, gain: 0.1 },
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export async function unlockAudio(): Promise<boolean> {
  const c = context();
  if (!c) return false;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === "running";
}

export function playChime(kind: Chime = "soft"): void {
  const c = context();
  if (!c || c.state !== "running") return;
  const spec = NOTES[kind];
  const start = c.currentTime + 0.01;
  spec.freqs.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = start + i * spec.gap;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(spec.gain, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.length);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + spec.length + 0.05);
  });
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined") navigator.vibrate?.(pattern);
}
