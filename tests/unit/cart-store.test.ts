import { beforeEach, describe, expect, it } from "vitest";

import {
  cartCount,
  cartSubtotalPreview,
  toOrderItems,
  useCart,
  type NewLine,
} from "@/features/guest/cart/cart-store";

const burger: NewLine = {
  menuItemId: "burger",
  name: "Ember Smash Burger",
  nameBn: null,
  unitPriceMinor: 66000,
  modifierOptionIds: ["double", "cheese"],
  modifierLabels: { en: ["Double", "Cheddar cheese"], bn: ["ডাবল", "চেডার চিজ"] },
  note: "",
  imagePath: null,
  categoryId: "grill",
};
const lassi: NewLine = {
  ...burger,
  menuItemId: "lassi",
  name: "Mango Lassi",
  unitPriceMinor: 18000,
  modifierOptionIds: [],
  modifierLabels: { en: [], bn: [] },
};

const cart = () => useCart.getState();

beforeEach(() => {
  sessionStorage.clear();
  useCart.setState({
    scope: null,
    sessionId: null,
    lines: [],
    orderNote: "",
    requestId: null,
    awaitingRetry: false,
  });
  cart().bind("demo-table-04", "s1");
});

describe("cart lines", () => {
  it("merges identical lines (same item, modifiers in any order, note)", () => {
    cart().add(burger);
    cart().add({ ...burger, modifierOptionIds: ["cheese", "double"], quantity: 2 });
    expect(cart().lines).toHaveLength(1);
    expect(cart().lines[0]?.quantity).toBe(3);
    cart().add({ ...burger, note: "no onion" });
    expect(cart().lines).toHaveLength(2);
  });

  it("caps quantity at 20 and removes at 0", () => {
    cart().add({ ...burger, quantity: 19 });
    cart().add({ ...burger, quantity: 5 });
    const id = cart().lines[0]!.lineId;
    expect(cart().lines[0]?.quantity).toBe(20);
    cart().setQuantity(id, 0);
    expect(cart().lines).toEqual([]);
  });

  it("computes count and preview subtotal in integer poisha", () => {
    cart().add({ ...burger, quantity: 2 });
    cart().add(lassi);
    expect(cartCount(cart().lines)).toBe(3);
    expect(cartSubtotalPreview(cart().lines)).toBe(150000);
  });

  it("sends ids and quantities only — never prices", () => {
    cart().add({ ...burger, note: "no onion" });
    expect(toOrderItems(cart().lines)).toEqual([
      {
        menu_item_id: "burger",
        quantity: 1,
        modifier_option_ids: ["double", "cheese"],
        note: "no onion",
      },
    ]);
    expect(JSON.stringify(toOrderItems(cart().lines))).not.toContain("66000");
  });

  it("persists to sessionStorage", () => {
    cart().add(lassi);
    expect(sessionStorage.getItem("es-cart")).toContain("Mango Lassi");
  });
});

describe("binding to a table session", () => {
  it("keeps the cart when the same session re-binds (reload)", () => {
    cart().add(lassi);
    cart().bind("demo-table-04", "s1");
    expect(cart().lines).toHaveLength(1);
  });

  it("clears the cart for a new session or another table", () => {
    cart().add(lassi);
    cart().bind("demo-table-04", "s2");
    expect(cart().lines).toEqual([]);
    cart().add(lassi);
    cart().bind("demo-table-07", null);
    expect(cart().lines).toEqual([]);
  });
});

describe("idempotent submission", () => {
  it("reuses the same client_request_id across retries", () => {
    cart().add(lassi);
    const first = cart().beginSubmit();
    cart().submitFailed("unknown");
    expect(cart().beginSubmit()).toBe(first);
  });

  it("freezes the cart while the outcome is unknown", () => {
    cart().add(lassi);
    cart().beginSubmit();
    cart().submitFailed("unknown");
    cart().add(burger);
    cart().setQuantity(cart().lines[0]!.lineId, 5);
    expect(cart().lines).toHaveLength(1);
    expect(cart().lines[0]?.quantity).toBe(1);
  });

  it("releases the id after a definitive rejection (server rolled back)", () => {
    cart().add(lassi);
    const first = cart().beginSubmit();
    cart().submitFailed("rejected");
    expect(cart().awaitingRetry).toBe(false);
    expect(cart().beginSubmit()).not.toBe(first);
  });

  it("clears everything on success", () => {
    cart().add(lassi);
    cart().setOrderNote("birthday");
    cart().beginSubmit();
    cart().submitSucceeded();
    expect(cart()).toMatchObject({
      lines: [],
      orderNote: "",
      requestId: null,
      awaitingRetry: false,
    });
  });
});
