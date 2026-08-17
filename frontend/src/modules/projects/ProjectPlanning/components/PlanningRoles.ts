// frontend/src/modules/projects/ProjectPlanning/components/PlanningRoles.ts
import {
  COMPANY_WIDE_ROLES,
  PROJECT_MANAGEMENT_ROLES,
} from "@/constants/projectRoles";

// Mirrors can_manage_structure on the backend — who's allowed to see
// Assign Planner / PM-approve controls at all, role-wise.
export function canManagePlanningStructure(role?: string | null) {
  if (!role) return false;
  return (
    (COMPANY_WIDE_ROLES as string[]).includes(role) ||
    (PROJECT_MANAGEMENT_ROLES as string[]).includes(role)
  );
}

export function isQS(role?: string | null) {
  return role === "qs";
}

// Precise PM check: company-wide manager (any project), OR specifically
// THIS project's assigned project_manager. Mirrors is_assigned_project_manager
// on the backend — this is what gates the actual PM-approve action, not
// just canManagePlanningStructure (which only gates what's shown).
export function isProjectPM(
  userId: number | null | undefined,
  userRole: string | null | undefined,
  projectManagerId: number | null | undefined,
) {
  if (!userId) return false;
  if (userRole && (COMPANY_WIDE_ROLES as string[]).includes(userRole))
    return true;
  return projectManagerId === userId;
}
