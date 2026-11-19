import { cn } from "@/lib/utils";

/**
 * Drifting ember particles (CSS only, no JS). Deterministic positions so SSR and
 * client match. Hidden for prefers-reduced-motion via the global rule plus
 * `motion-reduce:hidden`.
 */
const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 7) % 4),
  delay: (i * 1.3) % 9,
  duration: 9 + ((i * 5) % 7),
  drift: ((i % 5) - 2) * 14,
}));

export function EmberField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden",
        className,
      )}
    >
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="absolute bottom-[-12px] rounded-full bg-primary"
          style={
            {
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              boxShadow: "0 0 8px 2px color-mix(in oklch, var(--primary) 60%, transparent)",
              animation: `ember-rise ${e.duration}s linear ${e.delay}s infinite`,
              "--drift": `${e.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
