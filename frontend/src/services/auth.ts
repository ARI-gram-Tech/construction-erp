// /src/services/auth.ts
import { api } from "./api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  company: number | null;
  role: string;
  must_change_password: boolean;
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post("/accounts/login/", payload);
  return data as { access: string; refresh: string };
}

export async function getCurrentUser() {
  const { data } = await api.get("/accounts/me/");
  return data as CurrentUser;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function changePassword(payload: ChangePasswordPayload) {
  const { data } = await api.post("/accounts/change-password/", payload);
  return data as { detail: string };
}
