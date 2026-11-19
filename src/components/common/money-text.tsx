import { useLocale } from "next-intl";
import type { ComponentProps } from "react";

import { formatMoney, toDecimalString, type FormatMoneyOptions, type Minor } from "@/lib/money";
import { cn } from "@/lib/utils";

type MoneyTextProps = Omit<ComponentProps<"data">, "value" | "children"> &
  FormatMoneyOptions & {
    /** Integer poisha. */
    minor: Minor;
  };

/**
 * Money in the current locale (৳1,234 / ৳১,২৩৪) with tabular digits and an exact
 * machine-readable value. Works in server and client components.
 */
export function MoneyText({ minor, decimals, symbol, className, ...props }: MoneyTextProps) {
  const locale = useLocale();
  return (
    <data value={toDecimalString(minor)} className={cn("tabular-nums", className)} {...props}>
      {formatMoney(minor, locale, { decimals, symbol })}
    </data>
  );
}
