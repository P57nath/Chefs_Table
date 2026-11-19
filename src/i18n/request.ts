import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { publicEnv } from "@/lib/env";
import { getPublicSupabase } from "@/lib/supabase/server";

import { isLocale, LOCALE_COOKIE, TIME_ZONE, type Locale } from "./config";
import admin from "./messages/admin.en.json";

/**
 * The restaurant's default language (Admin → Settings). One restaurant per
 * deployment, so the first row is the restaurant. Cached 60 s, tag `menu`
 * (settings saves revalidate it). Falls back to the env default.
 */
const restaurantDefaultLocale = unstable_cache(
  async (): Promise<Locale | null> => {
    const { data } = await getPublicSupabase()
      .from("restaurants")
      .select("settings")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const value = (data?.settings as { default_locale?: unknown } | null)?.default_locale;
    return isLocale(value) ? value : null;
  },
  ["restaurant-default-locale"],
  { tags: ["menu"], revalidate: 60 },
);

/** Cookie (the visitor's choice) → restaurant default → NEXT_PUBLIC_DEFAULT_LOCALE. */
export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  try {
    return (await restaurantDefaultLocale()) ?? publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE;
  } catch {
    return publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE;
  }
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    timeZone: TIME_ZONE,
    // Admin is English-only (spec §8: Bangla optional there); every other
    // namespace is fully translated (tests/unit/messages.test.ts).
    messages: { ...(await import(`./messages/${locale}.json`)).default, admin },
  };
});
