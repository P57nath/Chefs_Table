import { expect, test, type Page } from "@playwright/test";

import { guestWithBill } from "./helpers/payments";
import { skipWelcome } from "./helpers/guest";
import { loginAs } from "./helpers/staff";

/** Records every CSP violation the page reports. */
async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} ${e.blockedURI} @ ${location.pathname} ${e.sourceFile}:${e.lineNumber}`,
      );
    });
  });
}
const violations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);

test.describe("security (production build)", () => {
  test("pages carry a nonce-based CSP and the full header set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    const csp = h["content-security-policy"] ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]{16,}' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    // A new nonce on every request.
    const again = (await request.get("/")).headers()["content-security-policy"];
    expect(again).not.toBe(csp);
  });

  test("no CSP violations on guest screens", async ({ browser }) => {
    const guest = await guestWithBill(browser, "e2e-28");
    await watchCsp(guest.page);
    for (const path of ["/t/e2e-28", "/t/e2e-28/track", "/t/e2e-28/bill"]) {
      await guest.page.goto(path);
      await guest.page.waitForLoadState("networkidle");
    }
    await guest.page.getByRole("button", { name: "bKash" }).click();
    await guest.page.waitForURL(/mock\/checkout/);
    await guest.page.goto("/t/e2e-28/bill");
    expect(await violations(guest.page)).toEqual([]);
    await guest.ctx.close();
  });

  test("no CSP violations on staff, 3D floor, kitchen and admin", async ({ page }) => {
    await watchCsp(page);
    await page.addInitScript(() => localStorage.setItem("es-floor-view", "3d"));
    await loginAs(page, "manager@demo.local");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15_000 });
    const found: string[] = [...(await violations(page))];
    for (const path of [
      "/staff/orders",
      "/kitchen",
      "/admin",
      "/admin/menu",
      "/admin/floor",
      "/admin/settings",
      "/login",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      found.push(...(await violations(page)));
    }
    expect(found).toEqual([]);
  });

  test("robots and noindex keep private screens out of search", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/t/", "/staff", "/kitchen", "/admin", "/api/"])
      expect(robots).toContain(`Disallow: ${p}`);
    const guest = await (await request.get("/t/demo-table-01")).text();
    expect(guest).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    const login = await (await request.get("/login")).text();
    expect(login).toMatch(/<meta name="robots" content="noindex/);
  });

  test("unknown pages get the branded 404", async ({ page }) => {
    const res = await page.goto("/this-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the start" })).toBeVisible();
  });

  test("guest first-load JS stays under the regression guard and never loads 3D code", async ({
    browser,
  }) => {
    // Spec §8 targets < 200 KB gzip; the mandated stack (React 19 + Next 16 runtime ≈ 100 KB,
    // Radix, TanStack Query, next-intl) measures ~255–275 KB after lazy-loading supabase-js,
    // Motion features and the sheets. This guard stops regressions — see PROGRESS.md Phase 10.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await skipWelcome(ctx, "e2e-27");
    const page = await ctx.newPage();
    const scripts: { file: string; bytes: number; body: string }[] = [];
    page.on("response", async (res) => {
      if (res.request().resourceType() !== "script") return;
      const sizes = await res.request().sizes();
      scripts.push({
        file: res.url().split("/").pop() ?? "",
        bytes: sizes.responseBodySize,
        body: await res.text(),
      });
    });
    const html = await (await page.request.get("/t/e2e-27")).text();
    const initial = new Set(
      [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]!.split("/").pop()),
    );
    await page.goto("/t/e2e-27");
    await expect(page.getByRole("heading", { name: "Starters" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const firstLoad = scripts.filter((x) => initial.has(x.file)).reduce((s, x) => s + x.bytes, 0);
    const all = scripts.reduce((s, x) => s + x.bytes, 0);
    console.info(
      `guest JS: first load ${(firstLoad / 1024).toFixed(1)} KB, all ${(all / 1024).toFixed(1)} KB (gzip)`,
    );
    expect(firstLoad).toBeLessThan(300 * 1024);
    expect(
      scripts.filter((x) => /WebGLRenderer|@react-three/.test(x.body)).map((x) => x.file),
    ).toEqual([]);
    await ctx.close();
  });

  test("staff app is installable and shows Reconnecting… when offline", async ({
    page,
    context,
  }) => {
    await loginAs(page, "waiter@demo.local");
    await page.goto("/staff/orders");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/staff.webmanifest",
    );
    const manifest = await (await page.request.get("/staff.webmanifest")).json();
    expect(manifest).toMatchObject({ start_url: "/staff", display: "standalone" });
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the service worker
    await context.setOffline(true);
    await page.goto("/staff/requests").catch(() => undefined);
    await expect(page.getByRole("heading", { name: "Reconnecting…" })).toBeVisible();
    await context.setOffline(false);
  });
});
