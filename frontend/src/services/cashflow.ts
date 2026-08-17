import { api } from "./api";
import type {
  CashFlowPlan,
  CashFlowEntry,
  CashFlowSummary,
  CreateCashFlowPlanPayload,
  DistributePayload,
  CashFlowEntryType,
} from "@/types/cashflow";

const base = (projectId: number) => `/cashflow/projects/${projectId}`;

export async function listCashFlowPlans(
  projectId: number,
): Promise<CashFlowPlan[]> {
  const { data } = await api.get(`${base(projectId)}/plans/`);
  return data.results ?? data;
}

export async function createCashFlowPlan(
  projectId: number,
  payload: CreateCashFlowPlanPayload,
): Promise<CashFlowPlan> {
  const { data } = await api.post(`${base(projectId)}/plans/`, payload);
  return data;
}

export async function getCashFlowSummary(
  projectId: number,
  planId: number,
  entryType: CashFlowEntryType = "planned",
): Promise<CashFlowSummary> {
  const { data } = await api.get(
    `${base(projectId)}/plans/${planId}/summary/`,
    { params: { entry_type: entryType } },
  );
  return data;
}

export async function listCashFlowEntries(
  projectId: number,
  planId: number,
): Promise<CashFlowEntry[]> {
  const { data } = await api.get(`${base(projectId)}/plans/${planId}/entries/`);
  return data.results ?? data;
}

export async function updateCashFlowEntry(
  projectId: number,
  planId: number,
  entryId: number,
  payload: { amount: number },
): Promise<CashFlowEntry> {
  const { data } = await api.patch(
    `${base(projectId)}/plans/${planId}/entries/${entryId}/`,
    payload,
  );
  return data;
}

export async function generateCashFlowRows(
  projectId: number,
  planId: number,
  payload: {
    activity_ids?: number[];
    category?: string;
    entry_type?: CashFlowEntryType;
  },
): Promise<{ created_count: number }> {
  const { data } = await api.post(
    `${base(projectId)}/plans/${planId}/entries/generate-rows/`,
    payload,
  );
  return data;
}

export async function distributeCashFlow(
  projectId: number,
  planId: number,
  payload: DistributePayload,
): Promise<CashFlowEntry[]> {
  const { data } = await api.post(
    `${base(projectId)}/plans/${planId}/entries/distribute/`,
    payload,
  );
  return data;
}
