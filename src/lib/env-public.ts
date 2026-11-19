/**
 * Public (browser-safe) env parsing WITHOUT zod, so the guest bundle doesn't
 * carry a schema library just to read five variables (spec §8 JS budget).
 * Server env keeps using zod in env-schema.ts.
 */
export type Locale = "en" | "bn";

export interface PublicEnv {
  NEXT_PUBLIC_APP_URL: string;
  NEXT_PUBLIC_DEFAULT_LOCALE: Locale;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: string | undefined;
}

type Source = Record<string, string | undefined>;

const blank = (v: string | undefined) =>
  v === undefined || v.trim() === "" ? undefined : v.trim();

function isUrl(v: string | undefined): v is string {
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function parsePublicEnv(source: Source): PublicEnv {
  const issues: string[] = [];
  const appUrl = blank(source.NEXT_PUBLIC_APP_URL);
  const supabaseUrl = blank(source.NEXT_PUBLIC_SUPABASE_URL);
  const key = blank(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const locale = blank(source.NEXT_PUBLIC_DEFAULT_LOCALE) ?? "en";
  if (!isUrl(appUrl)) issues.push("NEXT_PUBLIC_APP_URL: must be a URL");
  if (!isUrl(supabaseUrl)) issues.push("NEXT_PUBLIC_SUPABASE_URL: must be a URL");
  if (!key) issues.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: required");
  if (locale !== "en" && locale !== "bn")
    issues.push('NEXT_PUBLIC_DEFAULT_LOCALE: must be "en" or "bn"');
  if (issues.length) {
    throw new Error(
      `Invalid public environment variables:\n${issues.map((i) => `  - ${i}`).join("\n")}`,
    );
  }
  return {
    NEXT_PUBLIC_APP_URL: appUrl!,
    NEXT_PUBLIC_DEFAULT_LOCALE: locale as Locale,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl!,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key!,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: blank(source.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  };
}
