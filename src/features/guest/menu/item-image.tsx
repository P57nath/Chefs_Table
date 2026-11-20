import Image from "next/image";

import { menuImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { CategoryIcon } from "./category-style";

interface ItemImageProps {
  /** Dish name (kept for callers; the image itself is decorative, alt=""). */
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
 * Menu photo from Supabase Storage, or the designed placeholder: an empty
 * plate seen from above on the raised surface, with the category's line icon
 * in the well. Quiet on purpose, so real photos stay the richest thing on screen.
 */
export function ItemImage({
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
        <div aria-hidden className="absolute inset-0 grid place-items-center text-subtle">
          <svg
            viewBox="0 0 100 100"
            className={cn(
              "absolute h-[82%] w-auto",
              variant === "thumb" ? "h-[88%]" : variant === "hero" ? "h-[72%]" : "",
            )}
          >
            <circle cx="50" cy="50" r="48" className="fill-surface stroke-foreground/10" />
            <circle cx="50" cy="50" r="33" className="fill-none stroke-foreground/8" />
          </svg>
          <CategoryIcon
            icon={iconName}
            className={cn(
              "relative",
              variant === "hero" ? "size-14" : variant === "thumb" ? "size-5" : "size-7",
            )}
            strokeWidth={1.5}
          />
        </div>
      )}
    </div>
  );
}
