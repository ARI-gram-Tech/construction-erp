import { api } from "./api";
import type {
  Company,
  AcceptInvitePayload,
  Subscription,
} from "../types/company";

export interface CreateCompanyAdminPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

// Public — anyone can register a new company (status starts as 'pending').
export async function registerCompany(payload: Partial<Company>) {
  const { data } = await api.post("/companies/register/", payload);
  return data;
}

// Public — completes the invite flow: sets up the Company Admin account.
export async function acceptInvite(payload: AcceptInvitePayload) {
  const { data } = await api.post("/companies/accept-invite/", payload);
  return data;
}

// Super Admin only — requires a valid JWT with is_superuser=True.
export async function listCompanies(): Promise<Company[]> {
  const { data } = await api.get("/companies/");
  return data.results;
}

export async function approveCompany(id: number) {
  const { data } = await api.post(`/companies/${id}/approve/`);
  return data;
}

export async function suspendCompany(id: number) {
  const { data } = await api.post(`/companies/${id}/suspend/`);
  return data;
}

export async function updateSubscription(
  companyId: number,
  payload: Partial<
    Pick<
      Subscription,
      "plan" | "max_users" | "max_projects" | "is_active" | "expires_at"
    >
  >,
) {
  const { data } = await api.patch(
    `/companies/${companyId}/subscription/`,
    payload,
  );
  return data;
}

export async function getMyCompany(): Promise<Company> {
  const { data } = await api.get("/companies/my-company/");
  return data;
}

export async function createCompanyAdmin(
  companyId: number,
  payload: CreateCompanyAdminPayload,
) {
  const { data } = await api.post(
    `/companies/${companyId}/create-admin/`,
    payload,
  );
  return data;
}

export async function resendInvite(companyId: number) {
  const { data } = await api.post(`/companies/${companyId}/resend-invite/`);
  return data;
}

export interface CreateEmployeePayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
}

export async function inviteEmployee(payload: CreateEmployeePayload) {
  const { data } = await api.post("/companies/invite-employee/", payload);
  return data;
}

export async function resendEmployeeCredentials(userId: number) {
  const { data } = await api.post(
    `/companies/employees/${userId}/resend-credentials/`,
  );
  return data as { detail: string };
}
