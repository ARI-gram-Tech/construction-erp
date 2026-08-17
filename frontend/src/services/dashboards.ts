// frontend/src/services/dashboards.ts
import { api } from "@/services/api";
import type {
  SiteEngineerDashboardResponse,
  QSDashboardResponse,
} from "@/types/dashboard";

export async function getSiteEngineerDashboard(): Promise<SiteEngineerDashboardResponse> {
  const { data } = await api.get<SiteEngineerDashboardResponse>(
    "/dashboards/site-engineer/",
  );
  return data;
}

export async function getQSDashboard(): Promise<QSDashboardResponse> {
  const { data } = await api.get<QSDashboardResponse>("/dashboards/qs/");
  return data;
}
