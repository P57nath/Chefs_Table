import { cn } from "@/lib/utils";

/**
 * The ember mark: a single flat flame over a short hearth line, one solid
 * colour (saffron by default, `currentColor` when a class sets the colour).
 * Pure SVG, no gradients, sized by font-size.
 */
export function EmberMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("size-[1em] shrink-0 text-primary", className)}
      fill="currentColor"
    >
      {title ? <title>{title}</title> : null}
      <path
        fillRule="evenodd"
        d="M12 2.5c.9 3 4.9 5 4.9 9.6A4.9 4.9 0 0 1 12 17c-2.9 0-4.9-2.1-4.9-4.7 0-2.3 1.4-3.5 2.4-4.7.3 1.6 1 2.4 1.9 2.8-.5-3 .2-5.6.6-7.9Zm0 9.2c.8 1.1 1.9 1.8 1.9 3.4a1.9 1.9 0 0 1-3.8 0c0-1 .5-1.6 1-2.1.1.6.4.9.7 1-.1-.9 0-1.6.2-2.3Z"
      />
      <rect x="6.5" y="19.25" width="11" height="1.5" rx="0.75" />
    </svg>
  );
}

/** Mark + restaurant name (name always comes from the DB or brand fallback). */
export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <EmberMark className="text-[1.25em]" />
      <span className="font-display font-medium">{name}</span>
    </span>
  );
}
