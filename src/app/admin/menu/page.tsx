import { getTranslations } from "next-intl/server";

import { MenuEditor } from "@/features/admin/menu/menu-editor";
import { ADMIN_ITEM_COLUMNS, type AdminItem } from "@/features/admin/menu/types";
import { AdminPageHeader } from "@/features/admin/page-header";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Menu editor: categories, items, photos, modifiers, order (spec §7). */
export default async function AdminMenuPage() {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/menu");
  if (!access.ok) return null;
  const t = await getTranslations("admin.menu");
  const supabase = await getServerSupabase();
  const rid = access.staff.restaurantId;
  const [categories, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, name_bn, icon, sort, is_active")
      .eq("restaurant_id", rid)
      .order("sort"),
    supabase.from("menu_items").select(ADMIN_ITEM_COLUMNS).eq("restaurant_id", rid).order("sort"),
  ]);
  if (categories.error) throw categories.error;
  if (items.error) throw items.error;

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <MenuEditor categories={categories.data} items={items.data as unknown as AdminItem[]} />
    </>
  );
}
