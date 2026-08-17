// /src/services/boqImport.ts
import { api } from "./api";
import { fetchAllPages } from "./pagination";
import type {
  UploadResponse,
  GridPreviewRequest,
  AIPreviewRequest,
  PreviewResponse,
  ConfirmRequest,
  ConfirmResponse,
  ImportSession,
} from "@/types/boqImport";

const base = (projectId: number) =>
  `/boq/projects/${projectId}/import-sessions`;

export async function uploadImportSession(
  projectId: number,
  file: File,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`${base(projectId)}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listImportSessions(
  projectId: number,
): Promise<ImportSession[]> {
  return fetchAllPages<ImportSession>(`${base(projectId)}/`);
}

export async function previewImportSession(
  projectId: number,
  sessionId: number,
  body: GridPreviewRequest | AIPreviewRequest,
): Promise<PreviewResponse> {
  const { data } = await api.post(
    `${base(projectId)}/${sessionId}/preview/`,
    body,
  );
  return data;
}

export async function confirmImportSession(
  projectId: number,
  sessionId: number,
  body: ConfirmRequest,
): Promise<ConfirmResponse> {
  const { data } = await api.post(
    `${base(projectId)}/${sessionId}/confirm/`,
    body,
  );
  return data;
}
