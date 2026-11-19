import Image from "next/image";

import { menuImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { EmberMark } from "./logo";

/** The restaurant's uploaded logo (Settings), or the built-in ember mark. Sized by font-size. */
export function BrandMark({
  logoPath,
  className,
}: {
  logoPath: string | null | undefined;
  className?: string;
}) {
  const src = menuImageUrl(logoPath);
  if (!src) return <EmberMark className={className} />;
  return (
    <span className={cn("relative inline-block size-[1em] shrink-0", className)} aria-hidden>
      <Image src={src} alt="" fill sizes="96px" className="rounded-full object-cover" />
    </span>
  );
}
