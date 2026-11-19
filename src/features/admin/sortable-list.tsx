"use client";

import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { IconButton } from "@/components/common/icon-button";
import { cn } from "@/lib/utils";

interface RowProps<T> {
  item: T;
  index: number;
  count: number;
  label: string;
  onMove: (from: number, to: number) => void;
  onDragEnd: () => void;
  children: ReactNode;
  className?: string;
}

function Row<T>({
  item,
  index,
  count,
  label,
  onMove,
  onDragEnd,
  children,
  className,
}: RowProps<T>) {
  const t = useTranslations("admin.sort");
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cn("flex items-center gap-1 rounded-2xl border border-border bg-card", className)}
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center text-muted-foreground active:cursor-grabbing"
        aria-hidden
      >
        <GripVertical className="size-5" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col">
        <IconButton
          size="icon-sm"
          label={t("up", { name: label })}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ChevronUp aria-hidden />
        </IconButton>
        <IconButton
          size="icon-sm"
          label={t("down", { name: label })}
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ChevronDown aria-hidden />
        </IconButton>
      </div>
    </Reorder.Item>
  );
}

/**
 * Drag (handle, works with touch) or ▲/▼ buttons (keyboard / screen reader)
 * to reorder. Calls `onCommit(ids)` once per finished move.
 */
export function SortableList<T extends { id: string }>({
  items,
  labelOf,
  onCommit,
  children,
  rowClassName,
  ariaLabel,
}: {
  items: T[];
  labelOf: (item: T) => string;
  onCommit: (ids: string[]) => void;
  children: (item: T) => ReactNode;
  rowClassName?: (item: T) => string | undefined;
  ariaLabel: string;
}) {
  const [order, setOrder] = useState(items);
  const [source, setSource] = useState(items);
  // New data from the server (after save/refresh) replaces the local order.
  if (source !== items) {
    setSource(items);
    setOrder(items);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setOrder(next);
    onCommit(next.map((i) => i.id));
  }

  return (
    <Reorder.Group
      axis="y"
      values={order}
      onReorder={setOrder}
      className="space-y-2"
      aria-label={ariaLabel}
    >
      {order.map((item, index) => (
        <Row
          key={item.id}
          item={item}
          index={index}
          count={order.length}
          label={labelOf(item)}
          onMove={move}
          onDragEnd={() => onCommit(order.map((i) => i.id))}
          className={rowClassName?.(item)}
        >
          {children(item)}
        </Row>
      ))}
    </Reorder.Group>
  );
}
