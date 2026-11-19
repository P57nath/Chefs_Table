import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

type ChipProps = Omit<ComponentProps<"button">, "children"> & {
  /** Toggle chips announce their state with aria-pressed. */
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md";
};

/** Pill-shaped filter/category chip (44 px hit area at every size). */
export function Chip({
  active = false,
  icon,
  children,
  size = "md",
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-active={active || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        size === "md"
          ? "h-10 px-4 text-sm after:absolute after:inset-x-0 after:-inset-y-0.5"
          : "h-8 px-3 text-[0.8125rem] after:absolute after:inset-x-0 after:-inset-y-1.5",
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-glow"
          : "border-border bg-surface text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
