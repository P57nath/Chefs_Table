import { Printer, QrCode } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/page-header";
import { qrSvg, tableUrl } from "@/features/admin/qr/qr";
import { QrCard } from "@/features/admin/qr/qr-card";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Every active table's QR code: preview, download, rotate, print sheet (spec §7). */
export default async function AdminQrPage() {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/qr");
  if (!access.ok) return null;
  const t = await getTranslations("admin.qr");
  const { data, error } = await (
    await getServerSupabase()
  )
    .from("dining_tables")
    .select("id, label, qr_token")
    .eq("restaurant_id", access.staff.restaurantId)
    .eq("is_active", true);
  if (error) throw error;
  const tables = [...data].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  const cards = await Promise.all(
    tables.map(async (tb) => {
      const url = tableUrl(tb.qr_token);
      return { ...tb, url, svg: await qrSvg(url) };
    }),
  );

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          tables.length ? (
            <Button asChild>
              <Link href="/admin/qr/print">
                <Printer aria-hidden />
                {t("printSheet")}
              </Link>
            </Button>
          ) : null
        }
      />
      {cards.length === 0 ? (
        <EmptyState icon={QrCode} title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((c) => (
            <QrCard key={c.id} tableId={c.id} label={c.label} url={c.url} svg={c.svg} />
          ))}
        </ul>
      )}
    </>
  );
}
