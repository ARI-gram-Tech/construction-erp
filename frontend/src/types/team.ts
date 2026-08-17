// frontend/src/types/team.ts
export interface ProjectMember {
  id: number;
  project: number;
  user: number;
  user_name: string;
  user_email: string;
  role: string; // the account's real, fixed role — e.g. "project_manager", "qs"
  role_on_project: string;
  created_at: string;
}

export interface ProjectSummary {
  id: number;
  project_manager: number | null;
  project_manager_name: string | null;
}
