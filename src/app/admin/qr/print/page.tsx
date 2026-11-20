import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/features/admin/qr/print-button";
import { qrSvg, tableUrl } from "@/features/admin/qr/qr";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import { getServerSupabase } from "@/lib/supabase/server";

const PER_PAGE = 6; // A4 portrait, 2 × 3 tents

/** A4 print sheet of table tents: brand, table label, "Scan to order", URL fallback. */
export default async function AdminQrPrintPage() {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/qr/print");
  if (!access.ok) return null;
  const t = await getTranslations("admin.qr");
  const supabase = await getServerSupabase();
  const [tables, restaurant] = await Promise.all([
    supabase
      .from("dining_tables")
      .select("id, label, qr_token")
      .eq("restaurant_id", access.staff.restaurantId)
      .eq("is_active", true),
    supabase
      .from("restaurants")
      .select("name, tagline, logo_path")
      .eq("id", access.staff.restaurantId)
      .single(),
  ]);
  if (tables.error) throw tables.error;
  if (restaurant.error) throw restaurant.error;
  const sorted = [...tables.data].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );
  const tents = await Promise.all(
    sorted.map(async (tb) => {
      const url = tableUrl(tb.qr_token);
      return { ...tb, url, svg: await qrSvg(url) };
    }),
  );
  const pages = Array.from({ length: Math.ceil(tents.length / PER_PAGE) }, (_, i) =>
    tents.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
  );
  const r = restaurant.data;

  return (
    <div className="qr-print">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          header, nav { display: none !important; }
          main { padding: 0 !important; }
          .qr-sheet { break-after: page; box-shadow: none !important; margin: 0 !important; }
          .qr-sheet:last-child { break-after: auto; }
        }
      `}</style>
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Button asChild variant="secondary">
          <Link href="/admin/qr">
            <ArrowLeft aria-hidden />
            {t("back")}
          </Link>
        </Button>
        <PrintButton label={t("print")} />
        <p className="text-sm text-muted-foreground">{t("printHint")}</p>
      </div>
      {pages.map((page, pi) => (
        <section
          key={pi}
          aria-label={t("pageN", { n: pi + 1 })}
          className="qr-sheet mx-auto mb-8 grid aspect-[210/297] w-full max-w-[210mm] grid-cols-2 grid-rows-3 gap-[4mm] bg-white p-[6mm] text-[#1C1612] shadow-float"
        >
          {page.map((tb) => (
            <article
              key={tb.id}
              className="flex flex-col items-center justify-between rounded-[4mm] border-2 border-dashed border-[#D6CBBE] p-[4mm] text-center"
            >
              <div className="flex items-center gap-2">
                <BrandMark logoPath={r.logo_path} className="text-[9mm]" />
                <span className="text-[5mm] leading-tight font-medium">{r.name}</span>
              </div>
              <div
                className="w-[38mm] [&_svg]:h-auto [&_svg]:w-full"
                role="img"
                aria-label={t("qrFor", { label: tb.label })}
                dangerouslySetInnerHTML={{ __html: tb.svg }}
              />
              <div>
                <p className="text-[9mm] leading-none font-medium">{tb.label}</p>
                <p className="mt-1 text-[4mm] font-medium">
                  {t("scanToOrder")} · <span lang="bn">স্ক্যান করে অর্ডার দিন</span>
                </p>
                <p className="mt-1 text-[2.6mm] break-all text-[#5C5048]">{tb.url}</p>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
