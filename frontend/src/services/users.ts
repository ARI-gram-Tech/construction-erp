import { api } from "./api";
import type { PlatformUser, UserUpdatePayload } from "../types/user";

// Super Admin only — requires a valid JWT with is_superuser=True.
export async function listUsers(): Promise<PlatformUser[]> {
  const { data } = await api.get("/accounts/users/");
  return data.results ?? data; // handles paginated or plain-array response
}

export async function getUser(id: number): Promise<PlatformUser> {
  const { data } = await api.get(`/accounts/users/${id}/`);
  return data;
}

export async function updateUser(id: number, payload: UserUpdatePayload) {
  const { data } = await api.patch(`/accounts/users/${id}/`, payload);
  return data;
}

export async function deleteUser(id: number) {
  await api.delete(`/accounts/users/${id}/`);
}

export async function deactivateUser(id: number) {
  const { data } = await api.post(`/accounts/users/${id}/deactivate/`);
  return data;
}

export async function activateUser(id: number) {
  const { data } = await api.post(`/accounts/users/${id}/activate/`);
  return data;
}

export async function listMyCompanyUsers(): Promise<PlatformUser[]> {
  const { data } = await api.get("/accounts/company-users/");
  return data.results ?? data;
}

export interface RoleChoice {
  value: string;
  label: string;
}

export async function listRoleChoices(): Promise<RoleChoice[]> {
  const { data } = await api.get("/accounts/roles/");
  return data.results ?? data;
}

export interface CreateUserPayload {
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  password: string;
  role?: string;
  company?: number | null;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<PlatformUser> {
  const { data } = await api.post("/accounts/users/", payload);
  return data;
}
