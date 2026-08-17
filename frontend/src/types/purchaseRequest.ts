// /src/types/purchaseRequest.ts

export type PRStatus =
  | "draft"
  | "pending_tier1"
  | "pending_tier2"
  | "pending_tier3"
  | "approved"
  | "rejected"
  | "cancelled";

export type PRPriority = "normal" | "urgent";
export type PRDecision = "approved" | "rejected" | "";
export type Tier2Decision = "approved" | "rejected" | "escalated" | "";

export interface PurchaseRequestItem {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  estimated_unit_cost: number | null;
  notes: string;
  approved_quantity: number | null;
  delivered_quantity: number | null;
  delivered_by: string;
  delivered_at: string | null;
  received_quantity: number | null;
  received_by: number | null;
  received_by_name: string | null;
  received_at: string | null;
  stock_movement: number | null;
  is_in_stock: boolean;
}

export interface PurchaseRequestItemPayload {
  id?: number;
  description: string;
  quantity: number;
  unit?: string;
  estimated_unit_cost?: number | null;
  notes?: string;
}

export interface PurchaseRequest {
  id: number;
  code: string;
  project: number;
  requested_by: number;
  requested_by_name: string;
  title: string;
  reason: string;
  priority: PRPriority;
  required_date: string | null;
  status: PRStatus;

  tier1_approver: number | null;
  tier1_approver_name: string;
  tier1_decision: PRDecision;
  tier1_comment: string;
  tier1_decided_at: string | null;

  tier2_approver: number | null;
  tier2_approver_name: string;
  tier2_decision: Tier2Decision;
  tier2_comment: string;
  tier2_decided_at: string | null;

  tier3_approver: number | null;
  tier3_approver_name: string;
  tier3_decision: PRDecision;
  tier3_comment: string;
  tier3_decided_at: string | null;

  items: PurchaseRequestItem[];
  estimated_total: number | string;

  created_at: string;
  updated_at: string;

  project_name: string;
}

export interface PurchaseRequestPayload {
  title: string;
  reason?: string;
  priority?: PRPriority;
  required_date?: string | null;
  items: PurchaseRequestItemPayload[];
}

// --- Action Payloads for Approval, Delivery & Receipt ---

export interface ApprovedQuantityPayload {
  id: number;
  approved_quantity: number;
}

export interface RecordDeliveryPayload {
  id: number;
  delivered_quantity: number;
  delivered_by?: string;
}

export interface RecordReceiptPayload {
  id: number;
  received_quantity: number;
  warehouse: number;
}
