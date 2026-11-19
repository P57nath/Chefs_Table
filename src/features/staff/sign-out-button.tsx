"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function SignOutButton({ variant = "secondary", ...props }: Omit<ButtonProps, "onClick">) {
  const t = useTranslations("staff");
  const router = useRouter();
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await getBrowserSupabase().auth.signOut();
    qc.clear(); // never leave another person's data in memory on a shared tablet
    try {
      sessionStorage.removeItem("es-shift-started");
    } catch {
      // ignore
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant={variant} onClick={signOut} loading={pending} {...props}>
      <LogOut aria-hidden />
      {t("signOut")}
    </Button>
  );
}
