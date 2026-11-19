import { useTranslations } from "next-intl";

import {
  orderStatusVisual,
  PULSE_CLASS,
  STATUS_VISUALS,
  type OrderStatus,
  type TableState,
} from "@/lib/status";
import { cn } from "@/lib/utils";

type StatusPillProps = (
  { kind: "table"; state: TableState } | { kind: "order"; state: OrderStatus }
) & {
  size?: "sm" | "md" | "lg";
  /** Extra text after the label, e.g. an age timer. */
  children?: React.ReactNode;
  className?: string;
};

const SIZE: Record<NonNullable<StatusPillProps["size"]>, string> = {
  sm: "h-6 gap-1 px-2 text-xs [&_svg]:size-3.5",
  md: "h-8 gap-1.5 px-3 text-sm [&_svg]:size-4",
  lg: "h-10 gap-2 px-4 text-base [&_svg]:size-5",
};

/**
 * Status chip used everywhere (floor list, 2D/3D badges, order cards, KDS, tracker).
 * Text stays in the foreground colour for contrast; colour lives in the icon,
 * tinted background and pulsing ring.
 */
export function StatusPill({ size = "md", children, className, ...props }: StatusPillProps) {
  const tTable = useTranslations("tableState");
  const tOrder = useTranslations("orderStatus");
  const visual =
    props.kind === "table" ? STATUS_VISUALS[props.state] : orderStatusVisual(props.state);
  const label = props.kind === "table" ? tTable(props.state) : tOrder(props.state);
  const Icon = visual.icon;

  return (
    <span
      data-state={props.state}
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full font-semibold whitespace-nowrap text-foreground",
        "bg-[color-mix(in_oklch,currentColor_14%,transparent)]",
        visual.tone,
        PULSE_CLASS[visual.pulse],
        SIZE[size],
        className,
      )}
    >
      <Icon aria-hidden className="shrink-0" />
      <span className="text-foreground">{label}</span>
      {children ? <span className="text-foreground/80 tabular-nums">{children}</span> : null}
    </span>
  );
}
