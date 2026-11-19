"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks which section (by element id) sits under the sticky header. Returns
 * the active id and a `scrollTo` that pins the spy until the smooth scroll ends.
 */
export function useScrollSpy(ids: readonly string[], offsetPx = 130) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const pinnedUntil = useRef(0);
  const idsKey = ids.join("|");

  useEffect(() => {
    const list = idsKey ? idsKey.split("|") : [];
    if (list.length === 0) return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        if (Date.now() < pinnedUntil.current) return;
        const first = list.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: `-${offsetPx}px 0px -55% 0px`, threshold: 0 },
    );
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [idsKey, offsetPx]);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    pinnedUntil.current = Date.now() + 900;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return { active, scrollTo };
}
