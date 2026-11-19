import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { fetchMenu } from "@/features/guest/menu/fetch-menu";
import type { MenuData, TableInfo } from "@/features/guest/menu/types";
import { getPublicSupabase } from "@/lib/supabase/server";

export const MENU_TAG = "menu";

/** Table + branding for a QR token, or null when the code is unknown/inactive. Deduped per request. */
export const getTableInfo = cache(async (token: string): Promise<TableInfo | null> => {
  if (!token || token.length > 128) return null;
  const { data, error } = await getPublicSupabase().rpc("guest_table_info", { p_qr_token: token });
  if (error) throw error;
  return (data as TableInfo | null) ?? null;
});

/**
 * Menu shared by every guest of a restaurant. Cached for 60 s and tagged `menu`
 * (admin edits call revalidateTag). Sold-out changes reach open screens through
 * realtime + client refetch, so a short server cache is safe.
 */
export const getCachedMenu = unstable_cache(
  async (restaurantId: string): Promise<MenuData> => fetchMenu(getPublicSupabase(), restaurantId),
  ["guest-menu"],
  { tags: [MENU_TAG], revalidate: 60 },
);
