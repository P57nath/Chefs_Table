import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline security headers. The full Content-Security-Policy (Supabase https/wss,
 * Turnstile, SSLCommerz form-action) is added in Phase 10 once every origin is known.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Cache Components is off: almost every screen is per-user (guest session, staff auth)
  // and the root layout reads the locale cookie. See PROGRESS.md decisions.
  poweredByHeader: false,
  reactStrictMode: true,
  // `pnpm dev:lan` (phones on the same Wi-Fi) sets DEV_LAN_HOST; dev-only setting.
  allowedDevOrigins: process.env.DEV_LAN_HOST ? [process.env.DEV_LAN_HOST] : [],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1", port: "54321", pathname: "/storage/v1/**" },
      ...(process.env.DEV_LAN_HOST
        ? [
            {
              protocol: "http" as const,
              hostname: process.env.DEV_LAN_HOST,
              port: "54321",
              pathname: "/storage/v1/**",
            },
          ]
        : []),
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
