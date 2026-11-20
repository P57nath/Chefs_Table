import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";

/**
 * Re-skinned shadcn button (docs/04-DESIGN-SYSTEM.md §9).
 * Every size keeps a ≥ 44 × 44 px hit area (smaller visuals extend it with ::after).
 * `loading` keeps the button's width: the label stays in the layout, invisible.
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform,opacity] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.15em]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-highlight hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_8%)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]",
        outline: "border-border bg-surface text-foreground hover:bg-muted aria-expanded:bg-muted",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-ember text-white hover:bg-[color-mix(in_oklch,var(--ember),black_10%)] dark:text-[var(--primary-ink)] dark:hover:bg-[color-mix(in_oklch,var(--ember),white_8%)]",
        "destructive-soft": "bg-ember/12 text-ember hover:bg-ember/20 focus-visible:ring-ember/30",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 gap-1.5 px-3 text-sm after:absolute after:inset-x-0 after:-inset-y-1",
        default: "h-11 gap-2 px-5 text-[0.9375rem]",
        lg: "h-12 gap-2 px-6 text-base",
        xl: "h-14 gap-2.5 px-7 text-[1.0625rem]",
        icon: "size-11",
        "icon-sm": "size-9 after:absolute after:-inset-1",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner over the (invisible) label; the button keeps its width and is disabled. */
    loading?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span
            className={cn(
              "inline-flex items-center justify-center gap-[inherit]",
              loading && "invisible",
            )}
          >
            {children}
          </span>
          {loading ? (
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <Loader2 className="size-[1.2em] animate-spin" />
            </span>
          ) : null}
        </>
      )}
    </Comp>
  );
}

export { Button, buttonVariants, type ButtonProps };
