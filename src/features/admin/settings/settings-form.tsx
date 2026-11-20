"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SegmentedControl } from "@/components/common/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCENTS } from "@/config/accents";
import { ImageUploader } from "@/features/admin/image/image-uploader";
import { cn } from "@/lib/utils";

import { Field } from "../field";
import { settingsSchema, type SettingsInput } from "../schemas";
import { saveSettings } from "../server/settings-actions";
import { useActionError } from "../use-action-error";

type TextKey =
  "name" | "tagline" | "address" | "phone" | "openingHours" | "wifi" | "vat" | "serviceCharge";

/** Restaurant settings (spec §7). Gateway mode is env-driven and read-only. */
export function SettingsForm({ initial, gateway }: { initial: SettingsInput; gateway: string }) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const errorText = useActionError();
  const [form, setForm] = useState<SettingsInput>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const parsed = settingsSchema.safeParse(form);
  const bad = (k: keyof SettingsInput) =>
    !parsed.success && parsed.error.issues.some((i) => i.path[0] === k);

  const text = (k: TextKey) => ({
    value: form[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
    "aria-invalid": bad(k) || undefined,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success) return;
    start(async () => {
      const res = await saveSettings(form);
      if (res.ok) {
        toast.success(t("saved"));
        router.refresh();
      } else toast.error(errorText(res.error));
    });
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-8" noValidate>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium">{t("brand")}</h2>
        <Field label={t("name")} error={bad("name") ? t("invalidName") : null}>
          <Input {...text("name")} maxLength={80} />
        </Field>
        <Field label={t("tagline")}>
          <Input {...text("tagline")} maxLength={120} />
        </Field>
        <ImageUploader
          label={t("logo")}
          value={form.logoPath}
          onChange={(p) => set("logoPath", p)}
          aspect={1}
          maxWidth={512}
          prefix="logo"
          round
        />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("accent")}</legend>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <label key={a.key} className="cursor-pointer">
                <input
                  type="radio"
                  name="accent"
                  value={a.key}
                  checked={form.accent === a.key}
                  onChange={() => set("accent", a.key)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                    form.accent === a.key && "border-foreground font-medium",
                  )}
                >
                  <span
                    className="grid size-5 place-items-center rounded-full"
                    style={{ background: a.swatch }}
                    aria-hidden
                  >
                    {form.accent === a.key ? <Check className="size-3.5 text-black" /> : null}
                  </span>
                  {a.label}
                </span>
              </label>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{t("accentHint")}</p>
        </fieldset>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <h2 className="font-medium sm:col-span-2">{t("contact")}</h2>
        <Field label={t("address")} className="sm:col-span-2">
          <Input {...text("address")} maxLength={200} />
        </Field>
        <Field label={t("phone")}>
          <Input {...text("phone")} maxLength={40} inputMode="tel" />
        </Field>
        <Field label={t("hours")}>
          <Input {...text("openingHours")} maxLength={80} />
        </Field>
        <Field label={t("wifi")} hint={t("wifiHint")}>
          <Input {...text("wifi")} maxLength={60} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <h2 className="font-medium sm:col-span-2">{t("billing")}</h2>
        <Field label={t("vat")} error={bad("vat") ? t("invalidPercent") : null}>
          <Input {...text("vat")} inputMode="decimal" />
        </Field>
        <Field label={t("service")} error={bad("serviceCharge") ? t("invalidPercent") : null}>
          <Input {...text("serviceCharge")} inputMode="decimal" />
        </Field>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("language")}</span>
          <SegmentedControl<"en" | "bn">
            label={t("language")}
            value={form.defaultLocale}
            onChange={(v) => set("defaultLocale", v)}
            options={[
              { value: "en", label: "English" },
              { value: "bn", label: "বাংলা" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("gateway")}</span>
          <p className="flex min-h-11 items-center rounded-xl bg-muted px-3 text-sm">{gateway}</p>
          <p className="text-sm text-muted-foreground">{t("gatewayHint")}</p>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" loading={pending} disabled={!parsed.success}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
