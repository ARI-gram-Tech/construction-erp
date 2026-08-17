// frontend/src/services/team.ts
import { api } from "./api";
import type { ProjectMember } from "@/types/team";

export async function listProjectMembers(
  projectId: number,
): Promise<ProjectMember[]> {
  const { data } = await api.get(`/team/projects/${projectId}/members/`);
  return data.results ?? data;
}

export async function addProjectMember(
  projectId: number,
  payload: { user: number; role_on_project: string },
): Promise<ProjectMember> {
  const { data } = await api.post(
    `/team/projects/${projectId}/members/`,
    payload,
  );
  return data;
}

export async function removeProjectMember(projectId: number, memberId: number) {
  await api.delete(`/team/projects/${projectId}/members/${memberId}/`);
}
