export interface AdminTable {
  id: string;
  label: string;
  seats: number;
  shape: "round" | "square" | "rect";
  zone_id: string | null;
  pos_x: number;
  pos_y: number;
  rotation: number;
  is_active: boolean;
  qr_token: string;
}

export interface AdminZone {
  id: string;
  name: string;
  sort: number;
}
