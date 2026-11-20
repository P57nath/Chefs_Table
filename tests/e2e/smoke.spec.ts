import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("landing", () => {
  test("renders the brand and has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("switches to Bangla and remembers it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "বাংলা" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "টেবিল থেকেই অর্ডার দিন, সুবিধামতো বিল দিন",
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  });

  test("has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const theme of ["dark", "light"] as const) {
    test(`passes axe WCAG 2.2 AA checks (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("es-theme-guest", t), theme);
      await page.goto("/");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test("sends baseline security headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });

  test("dev UI kit is not served in production", async ({ request }) => {
    const res = await request.get("/dev/ui");
    expect(res.status()).toBe(404);
  });
});
