import { parsePublicEnv, type PublicEnv } from "./env-public";

export type { Locale, PublicEnv } from "./env-public";

/**
 * Public (browser-safe) environment, validated at module load. Server-only
 * values live in `env.server.ts`.
 *
 * Every NEXT_PUBLIC_* variable is referenced explicitly so Next.js inlines it
 * into client bundles.
 */
export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
