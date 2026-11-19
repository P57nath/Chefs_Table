import { getTranslations } from "next-intl/server";

import { LayoutEditor } from "@/features/admin/floor/layout-editor";
import { TablesPanel } from "@/features/admin/floor/tables-panel";
import type { AdminTable } from "@/features/admin/floor/types";
import { ZonesPanel } from "@/features/admin/floor/zones-panel";
import { AdminPageHeader } from "@/features/admin/page-header";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { getServerSupabase } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Tables, zones and the floor layout editor with 3D preview (spec §7). */
export default async function AdminFloorPage() {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/floor");
  if (!access.ok) return null;
  const t = await getTranslations("admin.floor");
  const supabase = await getServerSupabase();
  const rid = access.staff.restaurantId;
  const [tables, zones] = await Promise.all([
    supabase
      .from("dining_tables")
      .select("id, label, seats, shape, zone_id, pos_x, pos_y, rotation, is_active, qr_token")
      .eq("restaurant_id", rid)
      .order("label"),
    supabase.from("zones").select("id, name, sort").eq("restaurant_id", rid).order("sort"),
  ]);
  if (tables.error) throw tables.error;
  if (zones.error) throw zones.error;
  // Natural order: T2 before T10.
  const sorted = [...(tables.data as AdminTable[])].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <Tabs defaultValue="layout" className="space-y-4">
        <TabsList className="h-auto p-1">
          <TabsTrigger value="layout" className="min-h-10 px-4">
            {t("tabLayout")}
          </TabsTrigger>
          <TabsTrigger value="tables" className="min-h-10 px-4">
            {t("tabTables")}
          </TabsTrigger>
          <TabsTrigger value="zones" className="min-h-10 px-4">
            {t("tabZones")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="layout">
          <LayoutEditor tables={sorted} zones={zones.data} />
        </TabsContent>
        <TabsContent value="tables">
          <TablesPanel tables={sorted} zones={zones.data} />
        </TabsContent>
        <TabsContent value="zones">
          <ZonesPanel zones={zones.data} tables={sorted} />
        </TabsContent>
      </Tabs>
    </>
  );
}
