import { api } from "./api";
import type { Project, ProjectPayload } from "../types/project";

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get("/projects/");
  return data.results ?? data;
}

export async function getProject(id: number): Promise<Project> {
  const { data } = await api.get(`/projects/${id}/`);
  return data;
}

export async function createProject(payload: ProjectPayload): Promise<Project> {
  const { data } = await api.post("/projects/", payload);
  return data;
}

export async function updateProject(
  id: number,
  payload: Partial<ProjectPayload>,
): Promise<Project> {
  const { data } = await api.patch(`/projects/${id}/`, payload);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`/projects/${id}/`);
}

export async function setProjectManager(projectId: number, userId: number) {
  const { data } = await api.patch(`/projects/${projectId}/`, {
    project_manager: userId,
  });
  return data;
}
