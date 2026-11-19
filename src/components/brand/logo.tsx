import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Original ember mark: a rounded flame cut from a saffron disc with an ember
 * core. Pure SVG (no external asset), inherits size from font-size.
 */
export function EmberMark({ className, title }: { className?: string; title?: string }) {
  const id = useId();
  const disc = `em-disc-${id}`;
  const core = `em-core-${id}`;
  return (
    <svg
      viewBox="0 0 48 48"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("size-[1em] shrink-0", className)}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={disc} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7B84B" />
          <stop offset="1" stopColor="#E5533D" />
        </linearGradient>
        <linearGradient id={core} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF3D6" />
          <stop offset="1" stopColor="#F5A524" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill={`url(#${disc})`} />
      <path
        d="M24 9c1.6 5.2 7.8 8.6 7.8 16.1A7.8 7.8 0 0 1 24 33c-4.6 0-7.8-3.4-7.8-7.5 0-3.6 2.2-5.6 3.9-7.6.4 2.5 1.6 3.9 3 4.4-.8-4.8.4-9.3.9-13.3Z"
        fill="#1A1206"
        opacity="0.92"
      />
      <path
        d="M24 21.5c1.4 2 3.4 3.2 3.4 6.1a3.4 3.4 0 0 1-6.8 0c0-1.8 1-2.8 1.9-3.7.2 1 .7 1.6 1.3 1.8-.2-1.6-.1-2.9.2-4.2Z"
        fill={`url(#${core})`}
      />
      <rect x="15" y="36" width="18" height="2.6" rx="1.3" fill="#1A1206" opacity="0.85" />
    </svg>
  );
}

/** Mark + restaurant name (name always comes from the DB or brand fallback). */
export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <EmberMark className="text-[1.6em]" />
      <span className="font-display font-semibold tracking-tight">{name}</span>
    </span>
  );
}
