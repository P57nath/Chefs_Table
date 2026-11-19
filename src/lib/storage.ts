import { publicEnv } from "@/lib/env";

export const MENU_BUCKET = "menu-images";

/** Public URL of an object in the menu-images bucket (public bucket, migration 0002). */
export function menuImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MENU_BUCKET}/${clean}`;
}
