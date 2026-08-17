// frontend/src/types/planning.ts
export type PlanningStatus =
  | "not_planned"
  | "in_progress"
  | "submitted"
  | "approved"
  | "changes_requested";

export type RequirementGroupType =
  | "materials"
  | "labour"
  | "plant_equipment"
  | "tools"
  | "ppe_safety"
  | "services";

export type RequirementGroupStatus =
  | "not_required"
  | "pending_assignment"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "changes_requested"
  | "approved";

export type RequirementItemReviewStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "cancelled";

export interface RequirementGroup {
  id: number;
  activity: number;
  group_type: RequirementGroupType;
  group_type_display: string;
  responsible: number | null;
  responsible_name: string | null;
  status: RequirementGroupStatus;
  status_display: string;
  required_on_site: string | null;
  procurement_deadline: string | null;
  alert_days_before: number | null;
  alert_sent_at: string | null;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string;
  item_count: number;
}

export interface Activity {
  id: number;
  project: number;
  wbs: number | null;
  code: string;
  name: string;
  responsible: number | null;
  responsible_name: string | null;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  percent_complete: number;
  status: "not_started" | "in_progress" | "delayed" | "completed";
  depends_on: number | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by_name: string | null;
  assigned_planner: number | null;
  assigned_planner_name: string | null;
  assigned_planner_role: string | null;
  planning_status: PlanningStatus;
  planning_submitted_at: string | null;
  pm_approved_by: number | null;
  pm_approved_by_name: string | null;
  pm_approved_at: string | null;
  qs_approved_by: number | null;
  qs_approved_by_name: string | null;
  qs_approved_at: string | null;
  qs_budget_amount: number | null;
  changes_requested_note: string;
}

export interface ProgressUpdate {
  id: number;
  activity: number;
  updated_by: number | null;
  updated_by_name: string | null;
  percent_complete: number;
  notes: string;
  progress_date: string;
  created_at: string;
}

export interface ProgressUpdatePayload {
  percent_complete: number;
  progress_date: string;
  notes?: string;
}

export interface Milestone {
  id: number;
  project: number;
  name: string;
  target_date: string;
  achieved_date: string | null;
  status: "pending" | "achieved" | "missed";
}

export interface WBSNode {
  id: number;
  project: number;
  parent: number | null;
  code: string;
  name: string;
  order: number;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by_name: string | null;
}

export interface ProjectBaseline {
  id: number;
  project: number;
  name: string;
  remarks: string;
  created_by: number | null;
  created_by_name: string | null;
  is_current: boolean;
  activity_count: number;
  created_at: string;
}

export interface VarianceRow {
  activity_name: string;
  baseline_start: string;
  baseline_end: string;
  current_end: string | null;
  variance_days: number | null;
  current_status: string;
}

export interface ActivityMaterial {
  id: number;
  activity: number;
  group: number | null;
  item: number | null;
  item_name: string | null;
  item_code: string | null;
  item_unit: string | null;
  quantity_required: number;
  status: "pending" | "requested" | "fulfilled";
  review_status: RequirementItemReviewStatus;
  revision_number: number;
  purchase_request: number | null;
  purchase_request_code: string | null;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
  is_pending_catalog: boolean;
  pending_request: number | null;
  pending_request_name: string | null;
  pending_request_status: "pending" | "approved" | "rejected" | null;
}

export interface ActivityMaterialPayload {
  item?: number;
  quantity_required: number;
  notes?: string;
  new_item_name?: string;
  new_item_unit?: string;
  new_item_category?: string;
}

export interface ActivityLabourRequirement {
  id: number;
  activity: number;
  group: number | null;
  role: string;
  quantity_required: number;
  review_status: RequirementItemReviewStatus;
  revision_number: number;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
}

export interface ActivityLabourPayload {
  role: string;
  quantity_required: number;
  notes?: string;
}

export interface ActivityEquipmentRequirement {
  id: number;
  activity: number;
  group: number | null;
  equipment_name: string;
  quantity_required: number;
  review_status: RequirementItemReviewStatus;
  revision_number: number;
  required_from: string | null;
  required_until: string | null;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
}

export interface ActivityEquipmentPayload {
  equipment_name: string;
  quantity_required: number;
  notes?: string;
  required_from?: string;
  required_until?: string;
}

export interface ActivityToolRequirement {
  id: number;
  activity: number;
  group: number | null;
  tool_name: string;
  quantity_required: number;
  review_status: RequirementItemReviewStatus;
  revision_number: number;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
}

export interface ActivityToolPayload {
  tool_name: string;
  quantity_required: number;
  notes?: string;
}

export interface ActivityPPERequirement {
  id: number;
  activity: number;
  group: number | null;
  ppe_name: string;
  quantity_required: number;
  review_status: RequirementItemReviewStatus;
  revision_number: number;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
}

export interface ActivityPPEPayload {
  ppe_name: string;
  quantity_required: number;
  notes?: string;
}

export interface ActivityServiceRequirement {
  id: number;
  activity: number;
  group: number | null;
  service_name: string;
  provider_notes: string;
  quantity_required: number;
  review_status: RequirementItemReviewStatus;
  revision_number: number;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
}

export interface ActivityServicePayload {
  service_name: string;
  quantity_required: number;
  provider_notes?: string;
  notes?: string;
}
