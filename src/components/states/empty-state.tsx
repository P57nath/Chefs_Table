import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  /** One action at most (design system §9). */
  action?: ReactNode;
  className?: string;
}

/** Quiet empty state: one line icon on a raised tile, a plain title and one action. */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-2xl border border-border bg-surface-2 text-subtle"
      >
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <div className="max-w-xs space-y-1.5">
        <h2 className="font-display text-xl font-normal">{title}</h2>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
