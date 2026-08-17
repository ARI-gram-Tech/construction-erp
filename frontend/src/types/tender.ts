// /src/types/tender.ts

export type TenderMode = "reference" | "active";
export type TenderStatus =
  | "filed"
  | "opportunity"
  | "pricing"
  | "submitted"
  | "won"
  | "lost"
  | "withdrawn";
export type LossReason =
  | "price"
  | "technical"
  | "late"
  | "disqualified"
  | "cancelled"
  | "other"
  | "";
export type TenderHealth =
  | "reference_only"
  | "not_started"
  | "needs_review"
  | "ready";

export interface Tender {
  id: number;
  title: string;
  client_name: string;
  mode: TenderMode;
  status: TenderStatus;
  closing_date: string | null;
  estimated_value: number | string | null;
  assigned_qs: number | null;
  assigned_qs_name: string | null;
  reference_document: number | null;
  reference_document_url: string | null;
  overheads_amount: number | string;
  risk_amount: number | string;
  profit_percent: number | string;
  submitted_price: number | string | null;
  submitted_at: string | null;
  outcome_decided_at: string | null;
  loss_reason: LossReason;
  loss_notes: string;
  converted_project: number | null;
  converted_at: string | null;
  boq_item_count: number;
  boq_total: number | string;
  tender_price: number | string;
  health: TenderHealth;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface TenderPayload {
  title: string;
  client_name?: string;
  closing_date?: string | null;
  estimated_value?: number | string | null;
  assigned_qs?: number | null;
  overheads_amount?: number | string;
  risk_amount?: number | string;
  profit_percent?: number | string;
}

export interface TenderReferenceUploadPayload {
  title: string;
  client_name?: string;
  file: File;
}

export interface TenderBOQSection {
  id: number;
  tender: number;
  parent: number | null;
  code: string;
  title: string;
  order: number;
}

export interface TenderBOQSectionPayload {
  parent?: number | null;
  code?: string;
  title: string;
  order?: number;
}

export type RateSource =
  | "manual"
  | "historical"
  | "procurement_quote"
  | "rate_library";

export interface TenderBOQItem {
  id: number;
  tender: number;
  section: number | null;
  item_code: string;
  description: string;
  unit: string;
  quantity: number | string;
  rate: number | string;
  amount: number | string;
  order: number;
  material_cost: number | string;
  labour_cost: number | string;
  plant_cost: number | string;
  subcontractor_cost: number | string;
  build_up_total: number | string;
  rate_source: RateSource;
  rate_source_note: string;
}

export interface TenderBOQItemPayload {
  section?: number | null;
  item_code?: string;
  description: string;
  unit: string;
  quantity: number | string;
  rate: number | string;
  order?: number;
  material_cost?: number | string;
  labour_cost?: number | string;
  plant_cost?: number | string;
  subcontractor_cost?: number | string;
  rate_source?: RateSource;
  rate_source_note?: string;
}

export interface RecordOutcomePayload {
  outcome: "won" | "lost" | "withdrawn";
  loss_reason?: LossReason;
  loss_notes?: string;
}

export interface ConvertToProjectPayload {
  project_name?: string;
  client?: number | null;
  project_manager?: number | null;
  start_date?: string | null;
}

// --- Tender BOQ Import ---

export type TenderImportMode = "manual_mapping" | "ai_import";
export type TenderImportStatus = "pending_review" | "approved" | "rejected";

export interface TenderImportSession {
  id: number;
  tender: number;
  file: string;
  import_mode: TenderImportMode;
  column_mapping: Record<string, unknown>;
  confidence_score: number | string | null;
  status: TenderImportStatus;
  row_count: number | null;
  error_count: number | null;
  created_by: number | null;
  created_at: string;
}

export interface TenderImportRowError {
  row_number: number;
  reason: string;
}

export interface TenderImportValidation {
  valid_count: number;
  error_count: number;
  errors: TenderImportRowError[];
  not_ready?: string;
}

export type TenderGridPreviewRow = Record<string, string | number | null>;

export interface TenderGridUploadResponse {
  session: TenderImportSession;
  header_row_index: number;
  available_columns: (string | number | null)[];
  preview: TenderGridPreviewRow[];
}

export interface TenderAIRow {
  item_code?: string;
  description?: string;
  unit?: string;
  quantity?: number | string | null;
  rate?: number | string | null;
  section?: string | null;
  confidence?: number | null;
}

export interface TenderAIUploadResponse {
  session: TenderImportSession;
  preview: TenderAIRow[];
  overall_confidence: number | null;
  notes: string;
}

export type TenderUploadResponse =
  | TenderGridUploadResponse
  | TenderAIUploadResponse;

export function isTenderAIResponse(
  res: TenderUploadResponse,
): res is TenderAIUploadResponse {
  return res.session.import_mode === "ai_import";
}

export interface TenderPreviewResponse {
  session: TenderImportSession;
  available_columns?: (string | number | null)[];
  preview: (TenderGridPreviewRow | TenderAIRow)[];
  validation: TenderImportValidation;
}

export interface TenderConfirmResponse {
  tender: Tender;
  imported_count: number;
  skipped_count: number;
  skipped_rows: TenderImportRowError[];
}

export const TENDER_IMPORT_TARGET_FIELDS: {
  key: "item_code" | "description" | "unit" | "quantity" | "rate" | "section";
  label: string;
  required: boolean;
}[] = [
  { key: "description", label: "Description", required: true },
  { key: "quantity", label: "Quantity", required: true },
  { key: "unit", label: "Unit", required: true },
  { key: "rate", label: "Rate", required: true },
  { key: "item_code", label: "Item Code", required: false },
  { key: "section", label: "Section", required: false },
];
