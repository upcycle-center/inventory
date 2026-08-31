export type UserRole = "admin" | "warehouse" | "stand_lead" | "ops";
export type EventStatus = "upcoming" | "open" | "closed";
export type CountType = "opening" | "closing";
export type LocationType = "warehouse" | "stand" | "kitchen";
export type MovementType = "receiving" | "return" | "transfer" | "adjustment";
export type PoStatus = "placed" | "received" | "canceled";
export type RequestStatus = "pending" | "fulfilled" | "canceled";
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

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  description: string | null;
  yellow_dog_code: string | null;
  active: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  event_date: string;
  status: EventStatus;
  attendance: number | null;
  team_size: number | null;
  created_at: string;
}

export interface EventLocationAssignment {
  id: string;
  event_id: string;
  location_id: string;
  location_lead_user_id: string;
  created_at: string;
}

export interface EventLocation {
  id: string;
  event_id: string;
  location_id: string;
  is_open: boolean;
  updated_at: string;
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
  upc: string | null;
  description: string;
  supplier_id: string | null;
  unit_cost: number | null;
  unit_of_measure: string;
  case_size: number | null;
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
  location_id: string;
  reorder_threshold: number;
  reorder_qty: number;
  updated_at: string;
}

export interface LocationCount {
  id: string;
  event_id: string | null;
  location_id: string;
  user_id: string;
  type: CountType;
  submitted_at: string;
  csv_export_url: string | null;
}

export interface LocationCountLine {
  id: string;
  location_count_id: string;
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

export interface LocationProduct {
  id: string;
  location_id: string;
  product_id: string;
  storage_area_id: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface WasteRecord {
  id: string;
  event_id: string | null;
  location_id: string;
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
  from_location_id: string | null;
  to_location_id: string | null;
  supplier_id: string | null;
  type: MovementType;
  quantity: number;
  event_id: string | null;
  note: string | null;
  user_id: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  location_id: string;
  status: PoStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StockRequest {
  id: string;
  from_location_id: string;
  to_location_id: string | null;
  product_id: string;
  quantity: number;
  status: RequestStatus;
  fulfilled_by_movement_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface YellowDogFieldMapping {
  id: string;
  internal_field: string;
  csv_column_header: string;
  sort_order: number;
  updated_at: string;
}
