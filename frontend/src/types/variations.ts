export type VariationStatus = "draft" | "submitted" | "approved" | "rejected";
export type IPCStatus = "draft" | "issued";

export interface Variation {
  id: number;
  project: number;
  budget_line: number | null;
  budget_line_title: string | null;
  number: string;
  title: string;
  description: string;
  reason: string;
  cost_impact: number;
  time_impact_days: number;
  status: VariationStatus;
  requested_by: number | null;
  requested_by_name: string | null;
  decided_by: number | null;
  decided_by_name: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface VariationPayload {
  budget_line?: number | null;
  title: string;
  description?: string;
  reason?: string;
  cost_impact: number;
  time_impact_days?: number;
}

export interface InterimPaymentCertificate {
  id: number;
  project: number;
  budget: number;
  certificate_number: string;
  period_start: string;
  period_end: string;
  work_done_amount: number;
  retention_percent: number;
  vat_percent: number;
  advance_recovery_amount: number;
  previous_gross_certified: number;
  retention_amount: number;
  amount_after_retention: number;
  vat_amount: number;
  gross_amount: number;
  net_payable: number;
  status: IPCStatus;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
  issued_at: string | null;
  created_at: string;
}

export interface IPCPayload {
  budget: number;
  period_start: string;
  period_end: string;
  work_done_amount: number;
  retention_percent: number;
  vat_percent: number;
  advance_recovery_amount?: number;
  notes?: string;
}
