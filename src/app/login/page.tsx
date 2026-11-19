import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/common/language-toggle";
import { SurfaceTheme } from "@/components/providers/surface-theme";
import { brand } from "@/config/brand";
import { LoginForm } from "@/features/auth/login-form";
import { homeFor, safeNext } from "@/features/auth/roles";
import { getCurrentStaff } from "@/features/auth/staff-server";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = sp.next;
  const expired = sp.expired === "1";
  const next = safeNext(typeof raw === "string" ? raw : null);
  const staff = await getCurrentStaff();
  if (staff && staff !== "not-staff" && staff.isActive) redirect(next ?? homeFor(staff.role));
  const t = await getTranslations("login");

  return (
    <SurfaceTheme surface="staff">
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="flex items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo
              name={staff && staff !== "not-staff" ? staff.restaurantName : brand.name}
              className="text-lg"
            />
          </Link>
          <LanguageToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="surface-raised w-full max-w-sm space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
              <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            {expired ? (
              <p role="status" className="rounded-xl bg-muted p-3 text-sm">
                {t("sessionExpired")}
              </p>
            ) : null}
            <LoginForm next={next} />
            <Link
              href="/"
              className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("backHome")}
            </Link>
          </div>
        </main>
      </div>
    </SurfaceTheme>
  );
}
