// frontend/src/services/documents.ts
import { api } from "./api";
import type { AppDocument, DocumentVersion } from "@/types/document";

export async function listDocuments(params?: {
  project?: number;
  companyOnly?: boolean;
}): Promise<AppDocument[]> {
  const query: Record<string, string> = {};
  if (params?.project) query.project = String(params.project);
  if (params?.companyOnly) query.company_only = "true";
  const { data } = await api.get("/documents/", { params: query });
  return data.results ?? data;
}

export async function getDocument(id: number): Promise<AppDocument> {
  const { data } = await api.get(`/documents/${id}/`);
  return data;
}

export interface UploadDocumentPayload {
  name: string;
  category: string;
  project?: number | null;
  file: File;
}

export async function uploadDocument(
  payload: UploadDocumentPayload,
): Promise<AppDocument> {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("category", payload.category);
  if (payload.project) form.append("project", String(payload.project));
  form.append("file", payload.file);
  const { data } = await api.post("/documents/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listDocumentVersions(
  documentId: number,
): Promise<DocumentVersion[]> {
  const { data } = await api.get(`/documents/${documentId}/versions/`);
  return data;
}

export async function uploadNewVersion(
  documentId: number,
  file: File,
): Promise<DocumentVersion> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(`/documents/${documentId}/versions/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
