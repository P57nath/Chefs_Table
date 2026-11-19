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

/** Warm, category-specific gradients for the designed image placeholder (design system §8). */
const GRADIENTS: Record<string, string> = {
  sparkles: "linear-gradient(135deg, #F7B84B 0%, #E07A2E 100%)",
  flame: "linear-gradient(135deg, #E5533D 0%, #7A2614 100%)",
  soup: "linear-gradient(135deg, #F5A524 0%, #E5533D 100%)",
  wheat: "linear-gradient(135deg, #F5C76B 0%, #C97A06 100%)",
  beef: "linear-gradient(135deg, #B4532A 0%, #3A1D10 100%)",
  drumstick: "linear-gradient(135deg, #D9822B 0%, #6E3410 100%)",
  fish: "linear-gradient(135deg, #5AA9F0 0%, #1F4E79 100%)",
  "ice-cream-cone": "linear-gradient(135deg, #F7C6C7 0%, #C2577A 100%)",
  cake: "linear-gradient(135deg, #F3D2B3 0%, #B5651D 100%)",
  "cup-soda": "linear-gradient(135deg, #FFC857 0%, #FBF0DC 100%)",
  coffee: "linear-gradient(135deg, #A47148 0%, #3B2416 100%)",
  leaf: "linear-gradient(135deg, #7BC47F 0%, #2E6B3A 100%)",
  salad: "linear-gradient(135deg, #9BD18B 0%, #3E7B3A 100%)",
};

export function categoryGradient(name: string | null | undefined): string {
  return (name && GRADIENTS[name]) || "linear-gradient(135deg, #F5A524 0%, #8A3B12 100%)";
}

/** Light gradients need dark ink for the initials. */
export function placeholderInk(name: string | null | undefined): string {
  return name === "cup-soda" || name === "ice-cream-cone" ? "#3A2410" : "#FFF7EC";
}

export function initials(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[1]] : [words[0]];
  return letters
    .map((w) => [...(w ?? "")][0] ?? "")
    .join("")
    .toUpperCase();
}
