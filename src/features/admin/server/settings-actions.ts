"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { MENU_TAG } from "@/features/guest/server/table-data";

import { settingsSchema, type SettingsInput } from "../schemas";
import { failure, requireManager, type ActionResult } from "./guard";

/** Restaurant name, branding, contact, taxes (restaurants_update RLS: owner/manager). */
export async function saveSettings(raw: SettingsInput): Promise<ActionResult> {
  try {
    const input = settingsSchema.parse(raw);
    const { staff, supabase } = await requireManager();
    const { data: current, error: readErr } = await supabase
      .from("restaurants")
      .select("settings")
      .eq("id", staff.restaurantId)
      .single();
    if (readErr) throw readErr;
    const prev =
      current.settings && typeof current.settings === "object" && !Array.isArray(current.settings)
        ? current.settings
        : {};
    const { data, error } = await supabase
      .from("restaurants")
      .update({
        name: input.name,
        tagline: input.tagline,
        logo_path: input.logoPath,
        vat_bps: input.vat,
        service_charge_bps: input.serviceCharge,
        settings: {
          ...prev,
          address: input.address,
          phone: input.phone,
          opening_hours: input.openingHours,
          wifi: input.wifi,
          default_locale: input.defaultLocale,
          accent: input.accent,
        },
      })
      .eq("id", staff.restaurantId)
      .select("id");
    if (error) throw error;
    if (!data?.length) return { ok: false, error: "FORBIDDEN" };
    revalidateTag(MENU_TAG, "max");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
