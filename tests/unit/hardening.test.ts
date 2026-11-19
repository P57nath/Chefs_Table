import { buildCsp, createNonce } from "@/lib/csp";
import { parsePublicEnv } from "@/lib/env-public";
import { toAppError } from "@/lib/errors";

describe("CSP", () => {
  const base = { nonce: "abc123", dev: false, supabaseUrl: "https://x.supabase.co", https: true };
  it("locks scripts to the nonce with strict-dynamic and no eval in production", () => {
    const csp = buildCsp(base);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self' https://x.supabase.co wss://x.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });
  it("allows eval and ws only in development; no upgrade on plain http", () => {
    const csp = buildCsp({
      ...base,
      dev: true,
      https: false,
      supabaseUrl: "http://127.0.0.1:54321",
    });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://127.0.0.1:54321");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
  it("makes a fresh, unguessable nonce each time", () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe("expired sessions", () => {
  it.each([
    { code: "PGRST301", message: "JWT expired" },
    { code: "PGRST303", message: "JWT could not be decoded" },
    { message: "Invalid Refresh Token: Refresh Token Not Found" },
  ])("%o → authRequired", (err) => {
    expect(toAppError(err).key).toBe("authRequired");
  });
  it("leaves business errors alone", () => {
    expect(toAppError({ code: "42501", message: "FORBIDDEN" }).key).toBe("forbidden");
  });
});

describe("public env without zod", () => {
  it("rejects a non-URL app URL", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_APP_URL: "not a url",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k",
      }),
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
