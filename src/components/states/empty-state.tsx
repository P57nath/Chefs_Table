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

/** Friendly empty state: soft illustration (icon in layered rings) + one action. */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      <div aria-hidden className="relative grid size-24 place-items-center">
        <span className="absolute inset-0 rounded-full bg-primary/8" />
        <span className="absolute inset-3 rounded-full bg-primary/12" />
        <span className="relative grid size-12 place-items-center rounded-full bg-surface text-primary-text shadow-glow">
          <Icon className="size-6" />
        </span>
      </div>
      <div className="max-w-xs space-y-1.5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}
