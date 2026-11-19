"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "@/lib/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockAudio } from "@/lib/sound";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { homeFor, type StaffRole } from "./roles";

const schema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(200),
});
type Values = z.infer<typeof schema>;

type FormError = "wrongCredentials" | "tooManyAttempts" | "notStaff" | "network";

export function LoginForm({ next }: { next: string | null }) {
  const t = useTranslations("login");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    void unlockAudio(); // the tap counts as a gesture for later alert chimes
    const supabase = getBrowserSupabase();
    // A guest (anonymous) session on this device is replaced by the staff session.
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error || !data.user) {
      setFormError(
        error?.status === 429
          ? "tooManyAttempts"
          : error?.code === "invalid_credentials" || error?.status === 400
            ? "wrongCredentials"
            : "network",
      );
      return;
    }
    const { data: staff } = await supabase
      .from("staff_members")
      .select("role, is_active")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!staff) {
      await supabase.auth.signOut();
      setFormError("notStaff");
      return;
    }
    router.replace(next ?? homeFor(staff.role as StaffRole));
    router.refresh();
  }

  const message = formError === "network" ? tErr("network") : formError ? t(formError) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {message ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-ember/10 p-3 text-sm font-medium"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden />
          {message}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          aria-invalid={!!errors.email || undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-ember">
            {t("invalidEmail")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={!!errors.password || undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {showPassword ? (
              <EyeOff className="size-5" aria-hidden />
            ) : (
              <Eye className="size-5" aria-hidden />
            )}
          </button>
        </div>
        {errors.password ? (
          <p id="password-error" className="text-sm text-ember">
            {t("passwordRequired")}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        <LogIn aria-hidden />
        {t("submit")}
      </Button>
    </form>
  );
}
