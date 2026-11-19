import { getTranslations } from "next-intl/server";

import { accentKey } from "@/config/accents";
import { AdminPageHeader } from "@/features/admin/page-header";
import { SettingsForm } from "@/features/admin/settings/settings-form";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { serverEnv } from "@/lib/env.server";
import { getServerSupabase } from "@/lib/supabase/server";

const pct = (bps: number) => (bps / 100).toString();

export default async function AdminSettingsPage() {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/settings");
  if (!access.ok) return null;
  const t = await getTranslations("admin.settings");
  const { data: r, error } = await (
    await getServerSupabase()
  )
    .from("restaurants")
    .select("name, tagline, logo_path, vat_bps, service_charge_bps, settings")
    .eq("id", access.staff.restaurantId)
    .single();
  if (error) throw error;
  const s = (r.settings ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : "");
  const gateway =
    serverEnv.PAYMENT_GATEWAY === "mock"
      ? t("gatewayMock")
      : `SSLCommerz · ${serverEnv.SSLCOMMERZ_MODE === "live" ? t("gatewayLive") : t("gatewaySandbox")}`;

  return (
    <>
      <AdminPageHeader title={t("title")} description={t("description")} />
      <SettingsForm
        gateway={gateway}
        initial={{
          name: r.name,
          tagline: r.tagline ?? "",
          logoPath: r.logo_path,
          address: str("address"),
          phone: str("phone"),
          openingHours: str("opening_hours"),
          wifi: str("wifi"),
          vat: pct(r.vat_bps),
          serviceCharge: pct(r.service_charge_bps),
          defaultLocale: str("default_locale") === "bn" ? "bn" : "en",
          accent: accentKey(s.accent),
        }}
      />
    </>
  );
}
