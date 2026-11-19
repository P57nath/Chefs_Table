import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = () => {
  const p = process.env.DEMO_STAFF_PASSWORD;
  if (!p) throw new Error("DEMO_STAFF_PASSWORD missing (.env.local)");
  return p;
};

/** Sign in through the real login form. Skips the start-shift overlay unless asked. */
export async function loginAs(page: Page, email: string, opts: { skipShift?: boolean } = {}) {
  if (opts.skipShift !== false) {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("es-shift-started", "1");
      } catch {
        // ignore
      }
    });
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD());
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export function boardCard(page: Page, orderId: string) {
  return page.locator(`article[data-order-id="${orderId}"]`);
}
