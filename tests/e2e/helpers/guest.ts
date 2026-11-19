import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Skip the welcome overlay for this table (as if this tab already saw it). */
export async function skipWelcome(context: BrowserContext, token: string) {
  await context.addInitScript((t) => {
    try {
      sessionStorage.setItem(`es-welcomed:${t}`, "1");
    } catch {
      // ignore
    }
  }, token);
}

export async function openMenu(page: Page, token: string) {
  await page.goto(`/t/${token}`);
  await expect(page.getByRole("heading", { name: "Starters" })).toBeVisible();
}

export async function quickAdd(page: Page, itemName: string) {
  await page
    .getByRole("button", { name: `Add ${itemName}` })
    .first()
    .click();
}

/** Opens the cart and confirms with the keyboard alternative of the slide control. */
export async function placeOrderViaKeyboard(page: Page) {
  await page.getByRole("button", { name: /View cart|Retry sending/ }).click();
  const slide = page.getByRole("button", { name: "Slide to place order" });
  await expect(slide).toBeEnabled();
  await slide.focus();
  await page.keyboard.press("Enter");
}
