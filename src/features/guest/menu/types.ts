export interface ModifierOption {
  id: string;
  name: string;
  name_bn: string | null;
  price_delta_minor: number;
  is_default: boolean;
  is_available: boolean;
  sort: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  name_bn: string | null;
  min_select: number;
  max_select: number;
  sort: number;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  name_bn: string | null;
  description: string | null;
  description_bn: string | null;
  price_minor: number;
  image_path: string | null;
  tags: string[];
  spice_level: number;
  prep_minutes: number;
  is_available: boolean;
  sort: number;
  groups: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  name_bn: string | null;
  icon: string | null;
  sort: number;
}

export interface MenuData {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
}

/** Result of guest_table_info(): what the printed QR implies. */
export interface TableInfo {
  table_label: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  tagline: string | null;
  logo_path: string | null;
  currency: string;
  vat_bps: number;
  service_charge_bps: number;
  /** Brand accent preset key (src/config/accents.ts); null = default. */
  accent?: string | null;
  wifi?: string | null;
  opening_hours?: string | null;
}
