// Shape of company-related API responses.

export interface Subscription {
  id: number;
  plan: "trial" | "basic" | "professional" | "enterprise";
  max_users: number;
  max_projects: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_main: boolean;
}

export interface Company {
  id: number;
  name: string;
  registration_no: string;
  email: string;
  phone: string;
  address: string;
  logo: string | null;
  status: "pending" | "active" | "suspended";
  created_at: string;
  updated_at: string;
  subscription: Subscription | null;
  branches: Branch[];
}

export interface AcceptInvitePayload {
  token: string;
  first_name: string;
  last_name: string;
  password: string;
}
