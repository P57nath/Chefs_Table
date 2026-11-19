import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { publicEnv } from "@/lib/env";

import { isLocale, LOCALE_COOKIE, TIME_ZONE, type Locale } from "./config";

/** Cookie-based locale, no URL prefix. Falls back to NEXT_PUBLIC_DEFAULT_LOCALE. */
export async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : publicEnv.NEXT_PUBLIC_DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
