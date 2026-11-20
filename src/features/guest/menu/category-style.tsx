import {
  Beef,
  Cake,
  ChefHat,
  Coffee,
  CupSoda,
  Drumstick,
  Fish,
  Flame,
  IceCreamCone,
  Leaf,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Sparkles,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { createElement } from "react";

/**
 * Category icons are stored as lucide names in the DB. Only this allow-list is
 * bundled (importing every icon would blow the guest JS budget).
 */
const ICONS: Record<string, LucideIcon> = {
  beef: Beef,
  cake: Cake,
  "chef-hat": ChefHat,
  coffee: Coffee,
  "cup-soda": CupSoda,
  drumstick: Drumstick,
  fish: Fish,
  flame: Flame,
  "ice-cream-cone": IceCreamCone,
  leaf: Leaf,
  pizza: Pizza,
  salad: Salad,
  sandwich: Sandwich,
  soup: Soup,
  sparkles: Sparkles,
  wheat: Wheat,
};

/** Icon names an admin can pick for a category. */
export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

/** Renders the category's icon (static components from the allow-list above). */
export function CategoryIcon({
  icon,
  ...props
}: { icon: string | null | undefined } & Omit<LucideProps, "name">) {
  return createElement((icon && ICONS[icon]) || UtensilsCrossed, props);
}
