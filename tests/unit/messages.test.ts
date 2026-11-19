import { describe, expect, it } from "vitest";

import bn from "@/i18n/messages/bn.json";
import en from "@/i18n/messages/en.json";
import { TABLE_STATES } from "@/lib/status";

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();
}

function lookup(tree: Tree, path: string): string {
  return path
    .split(".")
    .reduce<string | Tree>((node, k) => (node as Tree)[k] ?? "", tree) as string;
}

describe("translations", () => {
  it("bn has exactly the same keys as en", () => {
    expect(keys(bn as Tree).sort()).toEqual(keys(en as Tree).sort());
  });

  it("uses the same placeholders in both languages", () => {
    for (const key of keys(en as Tree)) {
      expect(placeholders(lookup(bn as Tree, key)), key).toEqual(
        placeholders(lookup(en as Tree, key)),
      );
    }
  });

  it("has no empty strings", () => {
    for (const key of keys(en as Tree)) expect(lookup(en as Tree, key), key).not.toBe("");
    for (const key of keys(bn as Tree)) expect(lookup(bn as Tree, key), key).not.toBe("");
  });

  it("labels every table state", () => {
    for (const state of TABLE_STATES) expect(en.tableState[state]).toBeTruthy();
  });
});
