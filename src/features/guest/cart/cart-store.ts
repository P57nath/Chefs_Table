"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { uuidv4 } from "@/lib/uuid";

export const MAX_QTY = 20;
export const MAX_LINES = 50;

export interface CartLine {
  lineId: string;
  menuItemId: string;
  name: string;
  nameBn: string | null;
  /** Display-only preview (base + modifiers). The server prices the order. */
  unitPriceMinor: number;
  quantity: number;
  modifierOptionIds: string[];
  modifierLabels: { en: string[]; bn: string[] };
  note: string;
  imagePath: string | null;
  categoryId: string;
}

export type NewLine = Omit<CartLine, "lineId" | "quantity"> & { quantity?: number };

/**
 * Submission lifecycle (CLAUDE.md rule 5):
 * - `beginSubmit()` creates `requestId` once and reuses it for every retry.
 * - A network failure leaves the outcome unknown: the id is kept and the cart is
 *   frozen (no edits) until a retry succeeds or the server definitively rejects.
 * - A definitive rejection (Postgres rolled back) releases the id and unfreezes.
 */
export interface CartState {
  scope: string | null;
  sessionId: string | null;
  lines: CartLine[];
  orderNote: string;
  requestId: string | null;
  /** True after a network failure with unknown outcome. */
  awaitingRetry: boolean;

  bind: (scope: string, sessionId: string | null) => void;
  add: (line: NewLine) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  setOrderNote: (note: string) => void;
  beginSubmit: () => string;
  submitSucceeded: () => void;
  submitFailed: (outcome: "unknown" | "rejected") => void;
  clear: () => void;
}

const lineKey = (l: Pick<CartLine, "menuItemId" | "modifierOptionIds" | "note">) =>
  `${l.menuItemId}|${[...l.modifierOptionIds].sort().join(",")}|${l.note.trim()}`;

const clamp = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.trunc(n)));

const EMPTY = {
  lines: [] as CartLine[],
  orderNote: "",
  requestId: null,
  awaitingRetry: false,
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => {
      /** Edits are refused while a submission's outcome is unknown. */
      const editable = () => !get().awaitingRetry;

      return {
        scope: null,
        sessionId: null,
        ...EMPTY,

        bind: (scope, sessionId) => {
          const s = get();
          const otherTable = s.scope !== null && s.scope !== scope;
          const newSession =
            sessionId !== null && s.sessionId !== null && s.sessionId !== sessionId;
          if (otherTable || newSession) set({ ...EMPTY, scope, sessionId });
          else set({ scope, sessionId: sessionId ?? s.sessionId });
        },

        add: (line) => {
          if (!editable()) return;
          const qty = clamp(line.quantity ?? 1) || 1;
          const key = lineKey(line);
          const lines = get().lines;
          const existing = lines.find((l) => lineKey(l) === key);
          if (existing) {
            set({
              lines: lines.map((l) =>
                l === existing ? { ...l, quantity: clamp(l.quantity + qty) } : l,
              ),
            });
          } else if (lines.length < MAX_LINES) {
            set({
              lines: [
                ...lines,
                { ...line, note: line.note.trim(), quantity: qty, lineId: uuidv4() },
              ],
            });
          }
        },

        setQuantity: (lineId, quantity) => {
          if (!editable()) return;
          const q = clamp(quantity);
          set({
            lines:
              q === 0
                ? get().lines.filter((l) => l.lineId !== lineId)
                : get().lines.map((l) => (l.lineId === lineId ? { ...l, quantity: q } : l)),
          });
        },

        remove: (lineId) => {
          if (!editable()) return;
          set({ lines: get().lines.filter((l) => l.lineId !== lineId) });
        },

        setOrderNote: (note) => {
          if (!editable()) return;
          set({ orderNote: note.slice(0, 300) });
        },

        beginSubmit: () => {
          const existing = get().requestId;
          if (existing) return existing;
          const id = uuidv4();
          set({ requestId: id });
          return id;
        },

        submitSucceeded: () => set({ ...EMPTY }),

        submitFailed: (outcome) =>
          set(
            outcome === "unknown"
              ? { awaitingRetry: true }
              : { requestId: null, awaitingRetry: false },
          ),

        clear: () => set({ ...EMPTY }),
      };
    },
    {
      name: "es-cart",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        scope: s.scope,
        sessionId: s.sessionId,
        lines: s.lines,
        orderNote: s.orderNote,
        requestId: s.requestId,
        awaitingRetry: s.awaitingRetry,
      }),
    },
  ),
);

export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function cartSubtotalPreview(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPriceMinor * l.quantity, 0);
}

/** Payload for place_order: ids and quantities only — never prices. */
export function toOrderItems(lines: readonly CartLine[]) {
  return lines.map((l) => ({
    menu_item_id: l.menuItemId,
    quantity: l.quantity,
    modifier_option_ids: l.modifierOptionIds,
    ...(l.note ? { note: l.note } : {}),
  }));
}
