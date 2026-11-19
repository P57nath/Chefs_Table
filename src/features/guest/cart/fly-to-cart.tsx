"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";

interface Flight {
  id: number;
  from: DOMRect;
  to: DOMRect;
  background: string;
}

interface FlyApi {
  /** Animate a thumbnail from `from` into the cart bar (visual only — the cart is already updated). */
  fly: (from: HTMLElement | null) => void;
  /** The cart bar registers its target element. */
  setTarget: (el: HTMLElement | null) => void;
  /** Increments on each landing so the bar can bump. */
  landings: number;
}

const FlyContext = createContext<FlyApi | null>(null);

export function useFlyToCart(): FlyApi {
  const api = use(FlyContext);
  if (!api) throw new Error("useFlyToCart must be used inside <FlyToCartProvider>");
  return api;
}

/** Add-to-cart "fly" animation layer (design system §5 signature moment). */
export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const target = useRef<HTMLElement | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [landings, setLandings] = useState(0);
  const nextId = useRef(0);

  const setTarget = useCallback((el: HTMLElement | null) => {
    target.current = el;
  }, []);

  const fly = useCallback(
    (from: HTMLElement | null) => {
      const to = target.current?.getBoundingClientRect();
      if (reduce || !from || !to || to.width === 0) {
        setLandings((n) => n + 1);
        return;
      }
      const inner = from.querySelector<HTMLElement>("img, [aria-hidden]") ?? from;
      const style = getComputedStyle(inner);
      const background =
        style.backgroundImage !== "none" ? style.backgroundImage : "var(--primary)";
      const id = nextId.current++;
      setFlights((f) => [...f, { id, from: from.getBoundingClientRect(), to, background }]);
      setTimeout(() => {
        setFlights((f) => f.filter((x) => x.id !== id));
        setLandings((n) => n + 1);
      }, 560);
    },
    [reduce],
  );

  return (
    <FlyContext value={{ fly, setTarget, landings }}>
      {children}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
        <AnimatePresence>
          {flights.map((f) => {
            const size = Math.min(f.from.width, 96);
            const startX = f.from.left + f.from.width / 2 - size / 2;
            const startY = f.from.top + f.from.height / 2 - size / 2;
            const endX = f.to.left + 28 - size / 2;
            const endY = f.to.top + f.to.height / 2 - size / 2;
            return (
              <m.div
                key={f.id}
                className="absolute rounded-2xl shadow-glow"
                style={{
                  width: size,
                  height: size * 0.75,
                  background: f.background,
                  backgroundSize: "cover",
                }}
                initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
                animate={{
                  x: [startX, (startX + endX) / 2, endX],
                  y: [startY, Math.min(startY, endY) - 80, endY],
                  scale: [1, 0.8, 0.25],
                  opacity: [1, 1, 0.6],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </FlyContext>
  );
}
