import { z } from "zod";

/**
 * Pure, side-effect-free environment schemas. Instances are created in
 * `env.ts` (public, client-safe) and `env.server.ts` (server-only).
 */

/** Blank lines in .env files arrive as "" — treat them as "not set". */
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().min(1).optional(),
);

export const localeSchema = z.enum(["en", "bn"]);
export type Locale = z.infer<typeof localeSchema>;

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_DEFAULT_LOCALE: localeSchema.default("en"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
});
export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const serverEnvSchema = z
  .object({
    SUPABASE_SECRET_KEY: z.string().trim().min(1),
    TURNSTILE_SECRET_KEY: optionalString,
    PAYMENT_GATEWAY: z.enum(["mock", "sslcommerz"]),
    SSLCOMMERZ_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
    SSLCOMMERZ_STORE_ID: optionalString,
    SSLCOMMERZ_STORE_PASSWORD: optionalString,
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  })
  .superRefine((env, ctx) => {
    // The mock gateway marks payments paid without real money — never in production.
    if (env.PAYMENT_GATEWAY === "mock" && env.VERCEL_ENV === "production") {
      ctx.addIssue({
        code: "custom",
        path: ["PAYMENT_GATEWAY"],
        message: "PAYMENT_GATEWAY=mock is not allowed when VERCEL_ENV=production",
      });
    }
    if (env.PAYMENT_GATEWAY === "sslcommerz") {
      for (const key of ["SSLCOMMERZ_STORE_ID", "SSLCOMMERZ_STORE_PASSWORD"] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when PAYMENT_GATEWAY=sslcommerz`,
          });
        }
      }
    }
  });
export type ServerEnv = z.infer<typeof serverEnvSchema>;

type EnvSource = Record<string, string | undefined>;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

function parseWith<S extends z.ZodType>(schema: S, source: EnvSource, label: string): z.infer<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid ${label} environment variables:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

export const parsePublicEnv = (source: EnvSource): PublicEnv =>
  parseWith(publicEnvSchema, source, "public");

export const parseServerEnv = (source: EnvSource): ServerEnv =>
  parseWith(serverEnvSchema, source, "server");
