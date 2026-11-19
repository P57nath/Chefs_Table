import { cn } from "@/lib/utils";

/** Shimmering block. Skeletons mirror the final layout so nothing shifts on load. */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton-shimmer rounded-lg", className)} />;
}

export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBlock
          key={i}
          className={cn("h-3.5", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Guest menu item card: photo 4:3 + name + 2-line description + price row. */
export function SkeletonMenuItem() {
  return (
    <div aria-hidden className="flex gap-3 rounded-2xl border border-border bg-card p-3">
      <SkeletonBlock className="aspect-[4/3] w-28 shrink-0 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonText lines={2} />
        <div className="mt-auto flex items-center justify-between">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="size-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Generic card row (orders board, lists). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("space-y-3 rounded-2xl border border-border bg-card p-4", className)}
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

/** Accessible wrapper: announces loading once, hides the decorative blocks. */
export function SkeletonList({
  count = 4,
  label,
  item: Item = SkeletonCard,
  className,
}: {
  count?: number;
  label: string;
  item?: React.ComponentType;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-3", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}
