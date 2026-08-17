// /src/types/boq.ts

export type BOQStatus = "draft" | "active" | "superseded";
export type BOQSource = "manual" | "import_excel" | "import_ai";
export type BOQLinkMode = "standalone" | "linked_to_wbs";
export type BOQIntegrationMode =
  | "reference"
  | "cost_tracking"
  | "full_integration";
export type BOQHealth =
  | "reference_only"
  | "partially_integrated"
  | "fully_integrated";

export interface BOQ {
  id: number;
  project: number;
  title: string;
  currency: string;
  status: BOQStatus;
  source: BOQSource;
  link_mode: BOQLinkMode;
  integration_mode: BOQIntegrationMode;
  created_by: number | null;
  created_by_name: string | null;
  total_amount: number | string;
  item_count: number;
  health: BOQHealth;
  health_label: string;
  reference_document: number | null;
  reference_document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BOQPayload {
  title: string;
  currency?: string;
  link_mode?: BOQLinkMode;
  integration_mode?: BOQIntegrationMode;
}

export interface BOQSection {
  id: number;
  boq: number;
  parent: number | null;
  code: string;
  title: string;
  order: number;
}

export interface BOQSectionPayload {
  parent?: number | null;
  code?: string;
  title: string;
  order?: number;
}

export interface BOQItem {
  id: number;
  boq: number;
  section: number | null;
  item_code: string;
  description: string;
  unit: number;
  unit_code: string;
  quantity: number | string;
  rate: number | string;
  amount: number | string;
  order: number;
  wbs: number | null;
  wbs_name: string | null;
  activity: number | null;
  activity_name: string | null;
}

export interface BOQItemPayload {
  section?: number | null;
  item_code?: string;
  description: string;
  unit: number;
  quantity: number;
  rate: number;
  order?: number;
  activity?: number | null;
}

export interface BOQRevision {
  id: number;
  boq: number;
  revision_number: number;
  reason: string;
  created_by: number | null;
  created_by_name: string | null;
  is_current: boolean;
  created_at: string;
}

export interface Unit {
  id: number;
  code: string;
  name: string;
}

export const BOQ_STATUS_LABELS: Record<BOQStatus, string> = {
  draft: "Draft",
  active: "Active",
  superseded: "Superseded",
};

export const BOQ_HEALTH_LABELS: Record<BOQHealth, string> = {
  reference_only: "🔴 Reference Only",
  partially_integrated: "🟡 Partially Integrated",
  fully_integrated: "🟢 Fully Integrated",
};
