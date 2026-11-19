import { ShieldX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SurfaceTheme } from "@/components/providers/surface-theme";
import { Button } from "@/components/ui/button";
import { homeFor } from "@/features/auth/roles";
import type { StaffAccess } from "@/features/auth/staff-server";

import { SignOutButton } from "./sign-out-button";

/** Friendly 403 for signed-in users whose role can't open a screen. */
export async function NoAccess({ access }: { access: Extract<StaffAccess, { ok: false }> }) {
  const t = await getTranslations("staff");
  const tLogin = await getTranslations("login");
  const staff = access.staff;
  const title =
    access.reason === "inactive"
      ? t("inactiveTitle")
      : access.reason === "not-staff"
        ? tLogin("notStaff")
        : t("noAccessTitle");
  const body =
    access.reason === "inactive"
      ? t("inactiveBody")
      : access.reason === "role" && staff
        ? t("noAccessBody", { role: t(`role_${staff.role}`) })
        : null;

  return (
    <SurfaceTheme surface="staff">
      <main
        id="main"
        className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-6 text-center"
      >
        <div className="grid size-16 place-items-center rounded-full bg-ember/12 text-ember">
          <ShieldX className="size-8" aria-hidden />
        </div>
        <div className="max-w-sm space-y-2">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {body ? <p className="text-muted-foreground">{body}</p> : null}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {access.reason === "role" && staff ? (
            <Button asChild>
              <Link href={homeFor(staff.role)}>{t("goToMyScreen")}</Link>
            </Button>
          ) : null}
          <SignOutButton />
        </div>
      </main>
    </SurfaceTheme>
  );
}
