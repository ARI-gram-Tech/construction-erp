// /services/budget.ts
import { api } from "./api";
import type {
  Budget,
  BudgetLine,
  CostTransaction,
  GenerateBudgetPayload,
  BudgetLinePayload,
} from "@/types/budget";

export async function listBudgets(projectId: number): Promise<Budget[]> {
  const { data } = await api.get(`/budget/projects/${projectId}/budgets/`);
  return data.results ?? data;
}

export const listProjectBudgets = listBudgets;

export async function getBudget(
  projectId: number,
  budgetId: number,
): Promise<Budget> {
  const { data } = await api.get(
    `/budget/projects/${projectId}/budgets/${budgetId}/`,
  );
  return data;
}

export async function generateBudgetFromBOQ(
  projectId: number,
  payload: GenerateBudgetPayload,
): Promise<Budget> {
  const { data } = await api.post(
    `/budget/projects/${projectId}/budgets/generate-from-boq/`,
    payload,
  );
  return data;
}

export async function approveBudget(
  projectId: number,
  budgetId: number,
): Promise<Budget> {
  const { data } = await api.post(
    `/budget/projects/${projectId}/budgets/${budgetId}/approve/`,
  );
  return data;
}

export async function lockBudget(
  projectId: number,
  budgetId: number,
): Promise<Budget> {
  const { data } = await api.post(
    `/budget/projects/${projectId}/budgets/${budgetId}/lock/`,
  );
  return data;
}

export async function listBudgetLines(
  projectId: number,
  budgetId: number,
): Promise<BudgetLine[]> {
  const { data } = await api.get(
    `/budget/projects/${projectId}/budgets/${budgetId}/lines/`,
  );
  return data.results ?? data;
}

export async function addBudgetLine(
  projectId: number,
  budgetId: number,
  payload: BudgetLinePayload,
): Promise<BudgetLine> {
  const { data } = await api.post(
    `/budget/projects/${projectId}/budgets/${budgetId}/lines/`,
    payload,
  );
  return data;
}

export async function updateBudgetLine(
  projectId: number,
  budgetId: number,
  lineId: number,
  payload: Partial<BudgetLinePayload>,
): Promise<BudgetLine> {
  const { data } = await api.patch(
    `/budget/projects/${projectId}/budgets/${budgetId}/lines/${lineId}/`,
    payload,
  );
  return data;
}

export async function deleteBudgetLine(
  projectId: number,
  budgetId: number,
  lineId: number,
) {
  await api.delete(
    `/budget/projects/${projectId}/budgets/${budgetId}/lines/${lineId}/`,
  );
}

export async function listCostTransactions(
  projectId: number,
  budgetId: number,
  lineId: number,
): Promise<CostTransaction[]> {
  const { data } = await api.get(
    `/budget/projects/${projectId}/budgets/${budgetId}/lines/${lineId}/transactions/`,
  );
  return data.results ?? data;
}

export async function createBudget(
  projectId: number,
  payload: { title: string },
): Promise<Budget> {
  const { data } = await api.post(
    `/budget/projects/${projectId}/budgets/`,
    payload,
  );
  return data;
}
