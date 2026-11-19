import fs from "node:fs";

import { defineConfig, devices } from "@playwright/test";

// Test helpers talk to the local Supabase stack with the same env as the app.
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Viewports from the spec: guest phone 390×844, waiter tablet 1180×820,
 * kitchen display 1920×1080. Runs against a production build + local Supabase.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    timezoneId: "Asia/Dhaka",
  },
  projects: [
    {
      name: "guest-phone",
      testMatch: [/smoke\.spec\.ts/, /guest\.spec\.ts/, /payments\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: "staff-tablet",
      testMatch: [
        /smoke\.spec\.ts/,
        /staff\.spec\.ts/,
        /floor\.spec\.ts/,
        /admin\.spec\.ts/,
        /security\.spec\.ts/,
        /edge\.spec\.ts/,
        /flow\.spec\.ts/,
      ],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1180, height: 820 }, hasTouch: true },
    },
    {
      name: "kitchen-tv",
      testMatch: [/smoke\.spec\.ts/, /kitchen\.spec\.ts/],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
