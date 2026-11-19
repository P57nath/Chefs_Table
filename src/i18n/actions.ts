"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE } from "./config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Persist the chosen UI language. The caller refreshes the router afterwards. */
export async function setLocale(locale: unknown): Promise<{ ok: boolean }> {
  if (!isLocale(locale)) return { ok: false };
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false,
  });
  return { ok: true };
}
