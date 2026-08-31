export type UserRole = "admin" | "warehouse" | "stand_lead";
export type EventStatus = "upcoming" | "open" | "closed";
export type CountType = "opening" | "closing";
export type MovementType = "receiving" | "replenishment";
export type WasteReason =
  | "spoiled"
  | "broken"
  | "spilled"
  | "expired"
  | "theft_loss"
  | "other";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Stand {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  event_date: string;
  status: EventStatus;
  created_at: string;
}

export interface EventStandAssignment {
  id: string;
  event_id: string;
  stand_id: string;
  stand_lead_user_id: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  description: string;
  supplier_id: string | null;
  unit_cost: number | null;
  unit_of_measure: string;
  pack_size: string | null;
  photo_url: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ProductBarcode {
  id: string;
  product_id: string;
  barcode: string;
  created_at: string;
}

export interface InventoryThreshold {
  id: string;
  product_id: string;
  stand_id: string;
  reorder_threshold: number;
  reorder_qty: number;
  updated_at: string;
}

export interface StandCount {
  id: string;
  event_id: string;
  stand_id: string;
  user_id: string;
  type: CountType;
  submitted_at: string;
  csv_export_url: string | null;
}

export interface StandCountLine {
  id: string;
  stand_count_id: string;
  product_id: string;
  qty_each: number | null;
  qty_cases: number | null;
  counted_at: string;
}

export interface StorageArea {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface StandProduct {
  id: string;
  stand_id: string;
  product_id: string;
  storage_area_id: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface WasteRecord {
  id: string;
  event_id: string;
  stand_id: string;
  product_id: string;
  quantity: number;
  reason_code: WasteReason;
  note: string | null;
  photo_url: string | null;
  user_id: string;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  from_location: "external" | "warehouse";
  to_stand_id: string | null;
  event_id: string | null;
  type: MovementType;
  quantity: number;
  user_id: string;
  created_at: string;
}

export interface YellowDogFieldMapping {
  id: string;
  internal_field: string;
  csv_column_header: string;
  sort_order: number;
  updated_at: string;
}
