import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { MoneyText } from "@/components/common/money-text";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/page-header";
import { MANAGEMENT_ROLES } from "@/features/auth/roles";
import { requireStaff } from "@/features/auth/staff-server";
import type { Locale } from "@/i18n/config";
import { localizeDigits } from "@/lib/digits";
import type { OrderStatus } from "@/lib/status";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatClock, formatDate } from "@/lib/time";

const UUID = /^[0-9a-f-]{36}$/i;

/** One order: items as billed, notes, and the full event timeline (order_events). */
export default async function AdminOrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  const access = await requireStaff(MANAGEMENT_ROLES, "/admin/orders");
  if (!access.ok) return null;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const t = await getTranslations("admin.orders");
  const tStatus = await getTranslations("orderStatus");
  const locale = (await getLocale()) as Locale;
  const supabase = await getServerSupabase();

  const [order, events, team] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `id, order_no, status, placed_at, subtotal_minor, customer_note, cancel_reason,
         dining_tables ( label ),
         order_items ( id, name_snapshot, quantity, modifiers, note, is_voided, unit_price_minor, line_total_minor )`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_events")
      .select("id, from_status, to_status, actor, note, created_at")
      .eq("order_id", id)
      .order("created_at"),
    supabase.from("staff_members").select("user_id, display_name"),
  ]);
  if (order.error) throw order.error;
  if (!order.data) notFound();
  if (events.error) throw events.error;
  const o = order.data;
  const names = new Map((team.data ?? []).map((m) => [m.user_id, m.display_name]));
  const who = (actor: string | null) => (actor ? (names.get(actor) ?? t("guest")) : t("system"));
  const mods = (m: unknown) =>
    Array.isArray(m)
      ? m
          .map((x) =>
            x && typeof x === "object" && "name" in x ? String((x as { name: unknown }).name) : "",
          )
          .filter(Boolean)
          .join(" · ")
      : "";

  return (
    <>
      <div className="mb-4 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">
            <ArrowLeft aria-hidden />
            {t("back")}
          </Link>
        </Button>
      </div>
      <AdminPageHeader
        title={t("orderTitle", { no: localizeDigits(o.order_no, locale) })}
        description={`${t("table")}: ${o.dining_tables?.label ?? "—"} · ${formatDate(o.placed_at, locale)} ${formatClock(o.placed_at, locale)}`}
        actions={<StatusPill kind="order" state={o.status as OrderStatus} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="items-h" className="rounded-2xl border border-border bg-card p-5">
          <h2 id="items-h" className="mb-3 font-semibold">
            {t("items")}
          </h2>
          <ul className="divide-y divide-border">
            {o.order_items.map((i) => (
              <li
                key={i.id}
                className={i.is_voided ? "py-2.5 text-muted-foreground line-through" : "py-2.5"}
              >
                <div className="flex justify-between gap-3">
                  <span>
                    <span className="font-semibold tabular-nums">
                      {localizeDigits(i.quantity, locale)}×
                    </span>{" "}
                    {i.name_snapshot}
                  </span>
                  <MoneyText minor={i.line_total_minor} />
                </div>
                {mods(i.modifiers) ? (
                  <p className="text-sm text-muted-foreground">{mods(i.modifiers)}</p>
                ) : null}
                {i.note ? <p className="text-sm text-muted-foreground italic">{i.note}</p> : null}
                {i.is_voided ? <p className="text-sm no-underline">{t("voided")}</p> : null}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
            <span>{t("colSubtotal")}</span>
            <MoneyText minor={o.subtotal_minor} />
          </div>
          {o.customer_note ? (
            <p className="mt-4 rounded-xl bg-muted p-3 text-sm">
              {t("guestNote")}: {o.customer_note}
            </p>
          ) : null}
        </section>

        <section
          aria-labelledby="timeline-h"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2 id="timeline-h" className="mb-3 font-semibold">
            {t("timeline")}
          </h2>
          <ol className="relative space-y-4 border-l-2 border-border pl-5">
            {events.data.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className="absolute top-1.5 -left-[27px] size-3 rounded-full bg-primary"
                  aria-hidden
                />
                <p className="font-medium">{tStatus(e.to_status)}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatClock(e.created_at, locale)} · {who(e.actor)}
                </p>
                {e.note ? <p className="text-sm">{t("reason", { note: e.note })}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
