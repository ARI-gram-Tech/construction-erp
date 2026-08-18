// /src/types/inventory.ts

export type LocationType = "main" | "project";

export interface Warehouse {
  id: number;
  name: string;
  location_type: LocationType;
  project: number | null;
  address: string;
  is_active: boolean;
}

export interface WarehousePayload {
  name?: string;
  address?: string;
  is_active?: boolean;
}

export type StockCategory =
  | "materials"
  | "electrical"
  | "plumbing"
  | "tools"
  | "safety"
  | "other";

export interface StockItem {
  id: number;
  code: string;
  name: string;
  category: StockCategory;
  unit: string;
  reorder_level: number | string;
  notes: string;
  total_quantity: number | string;
}

export interface StockItemPayload {
  name: string;
  category: StockCategory;
  unit: string;
  reorder_level?: number;
  notes?: string;
}

export interface StockLevel {
  id: number;
  warehouse: number;
  warehouse_name: string;
  item: number;
  item_name: string;
  item_code: string;
  item_unit: string;
  quantity: number | string;
}

export type MovementType =
  | "receipt"
  | "issue"
  | "transfer_out"
  | "transfer_in"
  | "adjustment";

export interface StockMovement {
  id: number;
  movement_type: MovementType;
  item: number;
  item_name: string;
  warehouse: number;
  warehouse_name: string;
  quantity: number | string;
  unit_cost: number | string | null;
  budget_line: number | null;
  budget_line_title: string | null;
  related_warehouse: number | null;
  related_warehouse_name: string;
  reference: string;
  performed_by: number | null;
  performed_by_name: string;
  notes: string;
  created_at: string;
  reverses: number | null;
  is_reversal: boolean;
  is_reversed: boolean;
  can_reverse: boolean;
}

export interface MovementUpdatePayload {
  reference?: string;
  notes?: string;
}

export interface ReceiveIssuePayload {
  item: number;
  warehouse: number;
  quantity: number;
  reference?: string;
  notes?: string;
  // Only meaningful for issue() — receive/adjust ignore these if sent.
  budget_line?: number;
  unit_cost?: number;
}

export interface TransferPayload {
  item: number;
  from_warehouse: number;
  to_warehouse: number;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface AdjustPayload {
  item: number;
  warehouse: number;
  new_quantity: number;
  reference?: string;
  notes?: string;
}

export interface PendingStockItemRequest {
  id: number;
  project: number | null;
  project_name: string | null;
  requested_name: string;
  suggested_unit: string;
  suggested_category: StockCategory;
  quantity_requested: number | string;
  requested_by: number | null;
  requested_by_name: string;
  status: "pending" | "approved" | "rejected";
  resolved_item: number | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
}

export interface ApproveRequestPayload {
  id: number;
  name: string;
  unit: string;
  category: StockCategory;
  reorder_level?: number;
}

export type RestockRequestStatus =
  | "pending"
  | "partially_dispatched"
  | "in_transit"
  | "received"
  | "rejected";

export interface StockRestockRequest {
  id: number;
  project: number;
  project_name: string;
  item: number;
  item_name: string;
  item_unit: string;
  quantity_requested: number | string;
  fulfilled_quantity: number | string | null;
  outstanding_quantity: number | string;
  source_warehouse: number | null;
  source_warehouse_name: string | null;
  notes: string;
  requested_by: number | null;
  requested_by_name: string;
  status: RestockRequestStatus;
  dispatched_by: number | null;
  dispatched_by_name: string | null;
  dispatched_at: string | null;
  dispatch_notes: string;
  resulting_movement: number | null;
  received_by: number | null;
  received_by_name: string | null;
  received_at: string | null;
  receipt_movement: number | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string;
  generated_purchase_request: number | null;
  generated_purchase_request_code: string | null;
  created_at: string;
}

export interface CreateRestockRequestPayload {
  project: number;
  item: number;
  quantity_requested: number;
  source_warehouse?: number;
  notes?: string;
}

export interface ApproveRestockRequestPayload {
  id: number;
  source_warehouse?: number;
  reference?: string;
}

export interface ReceiveRestockRequestPayload {
  id: number;
  reference?: string;
}

export interface EscalateRestockPayload {
  id: number;
  quantity?: number;
  title?: string;
  reason?: string;
}
