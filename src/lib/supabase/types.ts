export type UserRole = "admin" | "warehouse" | "stand_lead" | "ops" | "kitchen" | "catering";
export type EventStatus = "upcoming" | "open" | "closed";
export type CountType = "opening" | "closing";
export type LocationType = "warehouse" | "stand" | "kitchen" | "catering";
export type LocationSeasonStatus = "open" | "closed";
export type MovementType = "receiving" | "return" | "transfer" | "adjustment" | "recovery";
// "requested" = flagged as needed but not yet sent to the supplier (a PO
// Request) -- distinct from "placed", which means it's actually been
// ordered.
export type PoStatus = "requested" | "placed" | "received" | "canceled";
export type RequestStatus = "pending" | "fulfilled" | "canceled";
export type ProductType = "chargeable" | "non_chargeable_bottle" | "non_chargeable_mixer" | "disposable" | "garnish";
export type WasteReason =
  | "spoiled"
  | "broken"
  | "spilled"
  | "expired"
  | "theft_loss"
  | "other";

export interface Profile {
  id: string;
  // Generated (first_name || ' ' || last_name) -- selectable and joinable
  // exactly like before, so this stays read-only everywhere except the
  // Users add/edit forms, which write first_name/last_name directly.
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
  // Onboarding gate for the annual season reset, same as staff.ready_to_work
  // -- not meaningful for admin/ops, which skip the onboarding pipeline.
  ready_to_work: boolean;
  notification_categories: string[];
  notification_email: string | null;
  created_at: string;
}

export interface CertificationType {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
  // Months this certification stays valid after being issued -- null
  // means no known duration, so expiration is entered manually.
  validity_months: number | null;
  // A mix of system UserRole values (for real login Users) and Roster
  // role names (Bartender, Server Food, ...) can both appear here -- the
  // two vocabularies never collide, so a plain string keeps this shared
  // across both audiences without a union type.
  applicable_roles: string[] | null;
  created_at: string;
}

export interface UserCertification {
  id: string;
  user_id: string;
  certification_type_id: string;
  certified_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface LocationProductMonthEnd {
  id: string;
  location_id: string;
  product_id: string;
  year: number;
  month: number;
  physical_qty_each: number | null;
  physical_qty_cases: number | null;
  counted_by: string | null;
  counted_at: string;
}

export interface MonthEndNewItemReport {
  id: string;
  location_id: string;
  year: number;
  month: number;
  barcode: string | null;
  brand: string | null;
  product_name: string;
  case_count: number | null;
  size_each: string | null;
  reported_by: string;
  reported_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface LocationStaffRole {
  id: string;
  location_id: string;
  role_name: string;
  base_count: number;
  required_certification: string | null;
  sort_order: number;
  created_at: string;
}

export interface LocationStaffTier {
  id: string;
  location_id: string;
  role_name: string;
  min_attendance: number;
  max_attendance: number | null;
  count: number;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  description: string | null;
  yellow_dog_code: string | null;
  default_lead_user_id: string | null;
  backup_lead_user_id: string | null;
  active: boolean;
  // Season status -- "closed" skips this location when bulk-generating
  // the all-locations Blank Count Sheet, independent of `active`.
  status: LocationSeasonStatus;
  status_updated_at: string | null;
  status_updated_by: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  event_date: string;
  status: EventStatus;
  est_tickets: number | null;
  tot_tickets: number | null;
  tot_tickets_posted_at: string | null;
  tot_tickets_posted_by: string | null;
  attendance_updated_at: string | null;
  attendance_updated_by: string | null;
  grn_room_attendance: number | null;
  vip_lounge_attendance: number | null;
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
  confirmed: boolean;
  confirmed_staff_count: number | null;
  confirmed_role_counts: Record<string, number> | null;
  pending_unlock_reason: "call_out" | "no_show" | "other" | null;
  pending_unlock_staff_id: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  updated_at: string;
}

export interface ShiftCallOut {
  id: string;
  event_id: string;
  location_id: string;
  role_name: string;
  call_out_type: "call_out" | "no_show" | "other";
  note: string | null;
  staff_id: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  main_role: string | null;
  cover_role: string | null;
  phone: string | null;
  email: string | null;
  certified: boolean;
  certified_at: string | null;
  certification_expires_at: string | null;
  ready_to_work: boolean;
  active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  account_number: string | null;
  representative_first_name: string | null;
  representative_last_name: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  website: string | null;
  office_phone: string | null;
  billing_first_name: string | null;
  billing_last_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  // Three-letter day abbreviations (Sun..Sat) -- which day(s) an order
  // needs to be placed by, and which day(s) it actually arrives.
  order_by_days: string[];
  delivery_days: string[];
  logistics_notes: string | null;
  // True for a supplier auto-created by a bulk product CSV upload whose
  // supplier name didn't match an existing one -- cleared once someone
  // reviews it (catches typo'd names before they become duplicates).
  needs_review: boolean;
  created_at: string;
}

export interface ProductCsvEvent {
  id: string;
  direction: "upload" | "download";
  kind: "bulk_upload" | "template" | "export";
  filename: string | null;
  storage_path: string | null;
  result_message: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  upc: string | null;
  description: string;
  product_type: ProductType;
  supplier_id: string | null;
  brand: string | null;
  category_id: string | null;
  case_cost: number | null;
  sale_price: number | null;
  unit_of_measure: string;
  case_size: number | null;
  bottle_size_ml: number | null;
  pour_size_oz: number | null;
  pour_price: number | null;
  middle_unit_label: string | null;
  middle_unit_size: number | null;
  each_countable: boolean;
  pos_square: boolean;
  photo_url: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ProductCostLog {
  id: string;
  product_id: string;
  previous_cost: number | null;
  new_cost: number;
  variance: number | null;
  variance_pct: number | null;
  source: "manual_edit" | "csv_upload";
  changed_by: string | null;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  gl_code: string | null;
  created_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  // Photo of the finished drink, for visual reference.
  photo_url: string | null;
  // Where this recipe was found online, if anywhere.
  source_url: string | null;
  // The original ingredients/ratios as published -- kept for reference
  // alongside the venue's own (possibly adjusted) ingredient list.
  original_recipe: string | null;
  // How-to-make-it prep steps, shown on the Ops Sheet PDF.
  instructions: string | null;
  // Target markup %, e.g. 400 for 400% -- MSRP = cost * (1 + this / 100).
  // Defaults to 400 but editable per recipe to tweak margin.
  target_markup_pct: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  product_id: string;
  // Quantity in fluid ounces used in the 10oz Single cup (16oz Double
  // doubles it) -- null means Top Off: no measured amount, fills
  // whatever's left in the cup instead.
  quantity_oz: number | null;
  sort_order: number;
  created_at: string;
}

export type RecipeRequestSize = "wine" | "single" | "double" | "liter" | "batch_2_5_gal";
// "partial" = Warehouse pulled what was in stock and flagged the rest as
// a PO Request -- the request stays visible (not fulfilled) until the
// shortfall is received and the request is manually completed.
export type RecipeRequestStatus = "pending" | "fulfilled" | "partial" | "canceled";

export interface RecipeRequest {
  id: string;
  location_id: string;
  recipe_id: string;
  size: RecipeRequestSize;
  quantity: number;
  note: string | null;
  status: RecipeRequestStatus;
  requested_by: string | null;
  requested_at: string;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
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
  requested_at: string | null;
  requested_by: string | null;
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
  notes: string | null;
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

export interface CompRecord {
  id: string;
  event_id: string | null;
  location_id: string;
  product_id: string;
  quantity: number;
  note: string | null;
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
  qty_cases: number | null;
  qty_each: number | null;
  event_id: string | null;
  reason_code: string | null;
  note: string | null;
  user_id: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_oz: number | null;
  note: string | null;
  recipe_request_id: string | null;
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
