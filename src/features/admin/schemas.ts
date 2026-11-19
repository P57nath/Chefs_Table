import { z } from "zod";

import { ACCENTS } from "@/config/accents";
import { toMinor } from "@/lib/money";

/**
 * Shared (client + server) validation for admin forms. Money and percentages
 * are typed as text and converted to integers here — never floats.
 */
const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

/** "7.5" → 750 basis points (0–50 %). */
export const percentText = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const bps = toMinor(v === "" ? "0" : v);
    if (bps === null || bps > 5000) {
      ctx.addIssue({ code: "custom", message: "percent" });
      return z.NEVER;
    }
    return bps;
  });

/** "250" / "249.50" / "২৫০" → poisha. */
export const priceText = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const minor = toMinor(v);
    if (minor === null || minor > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "price" });
      return z.NEVER;
    }
    return minor;
  });

export const storagePath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[a-z0-9-]+\.(webp|png|jpe?g)$/)
  .nullable();

export const settingsSchema = z.object({
  name: trimmed(80).min(1),
  tagline: optionalText(120),
  logoPath: storagePath,
  address: optionalText(200),
  phone: optionalText(40),
  openingHours: optionalText(80),
  wifi: optionalText(60),
  vat: percentText,
  serviceCharge: percentText,
  defaultLocale: z.enum(["en", "bn"]),
  accent: z.enum(ACCENTS.map((a) => a.key) as [string, ...string[]]),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export const ITEM_TAGS = ["veg", "chef_special", "new", "bestseller"] as const;

export const categorySchema = z.object({
  id: z.uuid().optional(),
  name: trimmed(40).min(1),
  nameBn: optionalText(40),
  icon: optionalText(40),
});
export type CategoryInput = z.input<typeof categorySchema>;

export const optionSchema = z.object({
  id: z.uuid().optional(),
  name: trimmed(60).min(1),
  nameBn: optionalText(60),
  priceDelta: priceText,
  isDefault: z.boolean(),
  isAvailable: z.boolean(),
});

export const groupSchema = z
  .object({
    id: z.uuid().optional(),
    name: trimmed(60).min(1),
    nameBn: optionalText(60),
    minSelect: z.number().int().min(0).max(20),
    maxSelect: z.number().int().min(1).max(20),
    options: z.array(optionSchema).min(1).max(30),
  })
  .refine((g) => g.minSelect <= g.maxSelect, { message: "minmax", path: ["maxSelect"] })
  .refine((g) => g.minSelect <= g.options.length, { message: "minOptions", path: ["minSelect"] })
  .refine((g) => g.options.filter((o) => o.isDefault).length <= g.maxSelect, {
    message: "defaults",
    path: ["options"],
  });

export const itemSchema = z.object({
  id: z.uuid().optional(),
  categoryId: z.uuid(),
  name: trimmed(80).min(1),
  nameBn: optionalText(80),
  description: optionalText(400),
  descriptionBn: optionalText(400),
  price: priceText,
  imagePath: storagePath,
  tags: z.array(z.enum(ITEM_TAGS)).max(4),
  spiceLevel: z.number().int().min(0).max(3),
  prepMinutes: z.number().int().min(1).max(180),
  isAvailable: z.boolean(),
  groups: z.array(groupSchema).max(10),
});
export type ItemInput = z.input<typeof itemSchema>;

export const zoneSchema = z.object({ id: z.uuid().optional(), name: trimmed(40).min(1) });

export const tableSchema = z.object({
  id: z.uuid().optional(),
  label: trimmed(12).min(1),
  seats: z.number().int().min(1).max(20),
  shape: z.enum(["round", "square", "rect"]),
  zoneId: z.uuid().nullable(),
});
export type TableInput = z.input<typeof tableSchema>;

/** Floor layout: positions in floor units (0–60, 0.5 grid), rotation in degrees. */
export const layoutSchema = z
  .array(
    z.object({
      id: z.uuid(),
      x: z.number().min(0).max(60),
      y: z.number().min(0).max(60),
      rotation: z.number().int().min(0).max(359),
    }),
  )
  .max(200);

export const STAFF_ROLES = ["owner", "manager", "waiter", "cashier", "kitchen"] as const;

export const newStaffSchema = z.object({
  email: z.email().max(120),
  displayName: trimmed(60).min(1),
  role: z.enum(STAFF_ROLES),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
});
export type NewStaffInput = z.input<typeof newStaffSchema>;
