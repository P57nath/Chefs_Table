import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "@/lib/env-schema";

const validPublic = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

const validServer = {
  SUPABASE_SECRET_KEY: "sb_secret_test",
  PAYMENT_GATEWAY: "mock",
};

describe("parsePublicEnv", () => {
  it("accepts a minimal valid env and applies defaults", () => {
    const env = parsePublicEnv(validPublic);
    expect(env.NEXT_PUBLIC_DEFAULT_LOCALE).toBe("en");
    expect(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBeUndefined();
  });

  it("treats blank optional values as unset", () => {
    const env = parsePublicEnv({ ...validPublic, NEXT_PUBLIC_TURNSTILE_SITE_KEY: "  " });
    expect(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBeUndefined();
  });

  it("rejects a missing Supabase URL with a readable message", () => {
    expect(() => parsePublicEnv({ ...validPublic, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects an unknown locale", () => {
    expect(() => parsePublicEnv({ ...validPublic, NEXT_PUBLIC_DEFAULT_LOCALE: "fr" })).toThrow(
      /NEXT_PUBLIC_DEFAULT_LOCALE/,
    );
  });
});

describe("parseServerEnv", () => {
  it("accepts mock gateway outside production", () => {
    expect(parseServerEnv({ ...validServer, VERCEL_ENV: "preview" }).PAYMENT_GATEWAY).toBe("mock");
  });

  it("refuses the mock gateway in Vercel production", () => {
    expect(() => parseServerEnv({ ...validServer, VERCEL_ENV: "production" })).toThrow(
      /mock is not allowed/,
    );
  });

  it("requires SSLCommerz credentials when that gateway is selected", () => {
    expect(() => parseServerEnv({ ...validServer, PAYMENT_GATEWAY: "sslcommerz" })).toThrow(
      /SSLCOMMERZ_STORE_ID[\s\S]*SSLCOMMERZ_STORE_PASSWORD/,
    );
    const env = parseServerEnv({
      ...validServer,
      PAYMENT_GATEWAY: "sslcommerz",
      SSLCOMMERZ_STORE_ID: "store",
      SSLCOMMERZ_STORE_PASSWORD: "pass",
    });
    expect(env.SSLCOMMERZ_MODE).toBe("sandbox");
  });

  it("requires the secret key", () => {
    expect(() => parseServerEnv({ PAYMENT_GATEWAY: "mock" })).toThrow(/SUPABASE_SECRET_KEY/);
  });
});
