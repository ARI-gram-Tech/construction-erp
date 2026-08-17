// /types/budget.ts
export type BudgetStatus = "draft" | "approved" | "locked";

export interface CostTransaction {
  id: number;
  budget_line: number;
  transaction_type: "committed" | "actual";
  source_type: "procurement" | "inventory" | "manual" | string;
  source_reference: string;
  amount: number;
  description: string;
  created_by: number | null;
  created_at: string;
}

export interface BudgetLine {
  id: number;
  budget: number;
  boq_section: number | null;
  title: string;
  original_amount: number;
  approved_amount: number;
  committed_amount: number;
  actual_amount: number;
  remaining: number;
  variance: number;
  order: number;
}

export interface Budget {
  id: number;
  project: number;
  boq: number;
  title: string;
  currency: string;
  status: BudgetStatus;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_by: number | null;
  created_by_name: string | null;
  total_original: number;
  total_approved: number;
  total_committed: number;
  total_actual: number;
  created_at: string;
}

export interface GenerateBudgetPayload {
  boq_id: number;
  title: string;
}

export interface BudgetLinePayload {
  title: string;
  boq_section?: number | null;
  original_amount: number;
  approved_amount?: number;
  order?: number;
}
