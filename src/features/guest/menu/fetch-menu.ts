import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import type { MenuData, MenuItem } from "./types";

const ITEM_COLUMNS = `
  id, category_id, name, name_bn, description, description_bn, price_minor, image_path,
  tags, spice_level, prep_minutes, is_available, sort,
  modifier_groups ( id, name, name_bn, min_select, max_select, sort,
    modifier_options ( id, name, name_bn, price_delta_minor, is_default, is_available, sort ) )
`;

const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort;

/**
 * Loads the active menu. Works with the cookie-less public client on the server
 * (inside unstable_cache) and with the browser client for live refetches.
 */
export async function fetchMenu(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
): Promise<MenuData> {
  const [categories, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, name_bn, icon, sort")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort"),
    supabase
      .from("menu_items")
      .select(ITEM_COLUMNS)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort"),
  ]);
  if (categories.error) throw categories.error;
  if (items.error) throw items.error;

  const shaped: MenuItem[] = items.data.map(({ modifier_groups, ...item }) => ({
    ...item,
    groups: modifier_groups
      .map(({ modifier_options, ...group }) => ({
        ...group,
        options: [...modifier_options].sort(bySort),
      }))
      .sort(bySort),
  }));

  return { restaurantId, categories: categories.data, items: shaped };
}
