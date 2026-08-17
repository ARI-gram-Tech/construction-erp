export type CashFlowPeriodType = "week" | "month" | "year";
export type CashFlowEntryType = "planned" | "actual";
export type CashFlowCategory =
  | "materials"
  | "labour"
  | "plant"
  | "subcontract"
  | "other";
export type CashFlowSource = "manual" | "derived";

export interface CashFlowPlan {
  id: number;
  project: number;
  budget: number | null;
  title: string;
  period_type: CashFlowPeriodType;
  is_current: boolean;
  created_by: number | null;
  created_by_name: string | null;
  total_planned: number;
  total_actual: number;
  created_at: string;
}

export interface CashFlowEntry {
  id: number;
  plan: number;
  activity: number;
  activity_name: string;
  wbs_id: number | null;
  wbs_name: string | null;
  budget_line: number | null;
  budget_line_title: string | null;
  category: CashFlowCategory;
  entry_type: CashFlowEntryType;
  period_start: string;
  amount: number;
  source: CashFlowSource;
  notes: string;
}

export interface CashFlowSummaryRow {
  key: string;
  label: string;
  type: "wbs" | "activity";
  totals: Record<string, number>;
  children?: CashFlowSummaryRow[];
}

export interface CashFlowSummary {
  periods: string[];
  rows: CashFlowSummaryRow[];
}

export interface CreateCashFlowPlanPayload {
  title: string;
  period_type: CashFlowPeriodType;
  budget?: number | null;
}

export interface DistributePayload {
  activity: number;
  category: CashFlowCategory;
  entry_type: CashFlowEntryType;
  total_amount: number;
}
