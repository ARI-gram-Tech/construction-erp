import type { Client } from "./client";

export interface Project {
  id: number;
  name: string;
  client: number;
  client_detail: Client | null;
  location: string;
  description: string;
  contract_value: string | null;
  budget: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  project_manager: number | null;
  project_manager_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPayload {
  name: string;
  client: number;
  location?: string;
  description?: string;
  contract_value?: string;
  budget?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}
