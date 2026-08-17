// Shape of user-related API responses.

export interface PlatformUser {
  id: number;
  email: string;
  username: string;
  phone: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_superuser: boolean;
  company: number | null;
  role: "company_admin" | "employee" | "";
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  company?: number | null;
}
