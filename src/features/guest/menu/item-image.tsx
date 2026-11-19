import Image from "next/image";

import { menuImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { CategoryIcon, categoryGradient, initials, placeholderInk } from "./category-style";

interface ItemImageProps {
  name: string;
  imagePath: string | null;
  categoryIcon: string | null;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Visual size of the placeholder initials/icon. */
  variant?: "card" | "hero" | "thumb";
}

/**
 * Menu photo from Supabase Storage, or the designed placeholder: category
 * gradient, category icon at 40 % opacity, subtle grain and Fraunces initials.
 */
export function ItemImage({
  name,
  imagePath,
  categoryIcon: iconName,
  sizes,
  className,
  priority = false,
  variant = "card",
}: ItemImageProps) {
  const url = menuImageUrl(imagePath);

  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden bg-surface-2", className)}>
      {url ? (
        <Image src={url} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div
          aria-hidden
          className="grain absolute inset-0 flex items-center justify-center"
          style={{ background: categoryGradient(iconName), color: placeholderInk(iconName) }}
        >
          <CategoryIcon
            icon={iconName}
            className={cn(
              "absolute opacity-40",
              variant === "hero" ? "size-40" : variant === "thumb" ? "size-8" : "size-16",
              variant === "thumb" ? "" : "-right-2 -bottom-2 rotate-[-12deg]",
            )}
            strokeWidth={1.5}
          />
          {variant === "thumb" ? null : (
            <span
              className={cn(
                "relative font-display font-semibold tracking-tight drop-shadow-sm",
                variant === "hero" ? "text-6xl" : "text-3xl",
              )}
            >
              {initials(name)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
