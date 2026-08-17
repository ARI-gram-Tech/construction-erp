// frontend/src/types/dashboard.ts

export interface SiteEngineerActivity {
  id: number;
  name: string;
  percent_complete: number;
  status: string;
  planned_start: string;
  planned_end: string;
}

export interface SiteEngineerPendingMaterial {
  id: number;
  activity_name: string;
  item_name: string;
  quantity_required: number;
}

export interface SiteEngineerDrawing {
  id: number;
  name: string;
}

export interface SiteEngineerProjectDashboard {
  project_id: number;
  todays_activities: SiteEngineerActivity[];
  pending_materials: SiteEngineerPendingMaterial[];
  drawings: SiteEngineerDrawing[];
}

export interface SiteEngineerDashboardResponse {
  projects: SiteEngineerProjectDashboard[];
}

export interface QSBoqSummary {
  id: number;
  title: string;
  status: string;
  item_count: number;
  total_amount: string;
  health: string;
  health_label: string;
}

export interface QSBudgetLine {
  id: number;
  title: string;
  approved_amount: string;
  committed: string;
  actual: string;
  variance: string;
}

export interface QSBudget {
  id: number;
  title: string;
  status: string;
  lines: QSBudgetLine[];
}

export interface QSVariation {
  id: number;
  number: number;
  title: string;
  status: string;
  cost_impact: string;
  time_impact_days: number;
}

export interface QSInterimPaymentCertificate {
  id: number;
  certificate_number: number;
  status: string;
  period_start: string;
  period_end: string;
  net_payable: string;
}

export interface QSProjectDashboard {
  project_id: number;
  boqs: QSBoqSummary[];
  budgets: QSBudget[];
  variations: QSVariation[];
  recent_ipcs: QSInterimPaymentCertificate[];
}

export interface QSDashboardResponse {
  projects: QSProjectDashboard[];
}
