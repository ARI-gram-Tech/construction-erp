// /src/types/boqImport.ts
import type { BOQ } from "./boq";

export type ImportMode = "manual_mapping" | "ai_import";
export type ImportStatus = "pending_review" | "approved" | "rejected";

export interface ImportSession {
  id: number;
  boq: number | null;
  project: number;
  file: string;
  import_mode: ImportMode;
  column_mapping: Record<string, unknown>;
  confidence_score: number | string | null;
  status: ImportStatus;
  created_by: number | null;
  row_count?: number | null;
  error_count?: number | null;
  created_at: string;
}

export interface ImportRowError {
  row_number: number;
  reason: string;
}

export interface ImportValidation {
  valid_count: number;
  error_count: number;
  errors: ImportRowError[];
  not_ready?: string;
}

// A raw mapped row from a spreadsheet — keys are the target field names,
// values are whatever the source cell contained (untyped, unvalidated).
export type GridPreviewRow = Record<string, string | number | null>;

export interface GridUploadResponse {
  session: ImportSession;
  header_row_index: number;
  available_columns: (string | number | null)[];
  preview: GridPreviewRow[];
}

export interface AIRow {
  item_code?: string;
  description?: string;
  unit?: string;
  quantity?: number | string | null;
  rate?: number | string | null;
  section?: string | null;
  confidence?: number | null;
}

export interface AIUploadResponse {
  session: ImportSession;
  preview: AIRow[];
  overall_confidence: number | null;
  notes: string;
}

export type UploadResponse = GridUploadResponse | AIUploadResponse;

export function isAIResponse(res: UploadResponse): res is AIUploadResponse {
  return res.session.import_mode === "ai_import";
}

export interface GridPreviewRequest {
  header_row_index?: number;
  fields?: Record<string, number | null>;
}

export interface AIPreviewRequest {
  rows?: AIRow[];
}

export interface PreviewResponse {
  session: ImportSession;
  available_columns?: (string | number | null)[];
  preview: (GridPreviewRow | AIRow)[];
  validation: ImportValidation;
}

export interface ConfirmRequest {
  boq_id?: number;
  boq_title?: string;
  force?: boolean;
}

export interface ConfirmResponse {
  boq: BOQ;
  imported_count: number;
  skipped_count: number;
  skipped_rows: ImportRowError[];
}

// The 6 fields the backend maps to, in the order the mapping UI shows them.
export const TARGET_FIELDS: {
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
