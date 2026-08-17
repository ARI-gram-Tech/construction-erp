// /src/services/tenders.ts
import { api } from "./api";
import { fetchAllPages } from "./pagination";
import type {
  Tender,
  TenderPayload,
  TenderReferenceUploadPayload,
  TenderBOQSection,
  TenderBOQSectionPayload,
  TenderBOQItem,
  TenderBOQItemPayload,
  RecordOutcomePayload,
  ConvertToProjectPayload,
  TenderUploadResponse,
  TenderPreviewResponse,
  TenderConfirmResponse,
} from "@/types/tender";

const base = "/tenders";

// --- Tenders ---

export async function listTenders(params?: {
  status?: string;
  mode?: string;
}): Promise<Tender[]> {
  const query = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : "";
  return fetchAllPages<Tender>(`${base}/${query}`);
}

export async function getTender(id: number): Promise<Tender> {
  const { data } = await api.get(`${base}/${id}/`);
  return data;
}

export async function createTender(payload: TenderPayload): Promise<Tender> {
  const { data } = await api.post(`${base}/`, payload);
  return data;
}

export async function updateTender(
  id: number,
  payload: Partial<TenderPayload>,
): Promise<Tender> {
  const { data } = await api.patch(`${base}/${id}/`, payload);
  return data;
}

export async function deleteTender(id: number): Promise<void> {
  await api.delete(`${base}/${id}/`);
}

export async function createReferenceTender(
  payload: TenderReferenceUploadPayload,
): Promise<Tender> {
  const form = new FormData();
  form.append("title", payload.title);
  if (payload.client_name) form.append("client_name", payload.client_name);
  form.append("file", payload.file);
  const { data } = await api.post(`${base}/reference/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function promoteTender(id: number): Promise<Tender> {
  const { data } = await api.post(`${base}/${id}/promote/`);
  return data;
}

export async function submitTender(
  id: number,
  submitted_price?: number,
): Promise<Tender> {
  const { data } = await api.post(`${base}/${id}/submit/`, {
    submitted_price,
  });
  return data;
}

export async function recordTenderOutcome(
  id: number,
  payload: RecordOutcomePayload,
): Promise<Tender> {
  const { data } = await api.post(`${base}/${id}/record-outcome/`, payload);
  return data;
}

export async function convertTenderToProject(
  id: number,
  payload: ConvertToProjectPayload,
): Promise<Tender> {
  const { data } = await api.post(`${base}/${id}/convert-to-project/`, payload);
  return data;
}

// --- Tender BOQ Sections ---

export async function listTenderSections(
  tenderId: number,
): Promise<TenderBOQSection[]> {
  return fetchAllPages<TenderBOQSection>(`${base}/${tenderId}/boq-sections/`);
}

export async function createTenderSection(
  tenderId: number,
  payload: TenderBOQSectionPayload,
): Promise<TenderBOQSection> {
  const { data } = await api.post(`${base}/${tenderId}/boq-sections/`, payload);
  return data;
}

export async function updateTenderSection(
  tenderId: number,
  id: number,
  payload: Partial<TenderBOQSectionPayload>,
): Promise<TenderBOQSection> {
  const { data } = await api.patch(
    `${base}/${tenderId}/boq-sections/${id}/`,
    payload,
  );
  return data;
}

export async function deleteTenderSection(
  tenderId: number,
  id: number,
): Promise<void> {
  await api.delete(`${base}/${tenderId}/boq-sections/${id}/`);
}

// --- Tender BOQ Items ---

export async function listTenderItems(
  tenderId: number,
): Promise<TenderBOQItem[]> {
  return fetchAllPages<TenderBOQItem>(`${base}/${tenderId}/boq-items/`);
}

export async function createTenderItem(
  tenderId: number,
  payload: TenderBOQItemPayload,
): Promise<TenderBOQItem> {
  const { data } = await api.post(`${base}/${tenderId}/boq-items/`, payload);
  return data;
}

export async function updateTenderItem(
  tenderId: number,
  id: number,
  payload: Partial<TenderBOQItemPayload>,
): Promise<TenderBOQItem> {
  const { data } = await api.patch(
    `${base}/${tenderId}/boq-items/${id}/`,
    payload,
  );
  return data;
}

export async function deleteTenderItem(
  tenderId: number,
  id: number,
): Promise<void> {
  await api.delete(`${base}/${tenderId}/boq-items/${id}/`);
}

export async function uploadTenderImport(
  tenderId: number,
  file: File,
): Promise<TenderUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(
    `${base}/${tenderId}/import-sessions/`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function previewTenderImport(
  tenderId: number,
  sessionId: number,
  payload: Record<string, unknown>,
): Promise<TenderPreviewResponse> {
  const { data } = await api.post(
    `${base}/${tenderId}/import-sessions/${sessionId}/preview/`,
    payload,
  );
  return data;
}

export async function confirmTenderImport(
  tenderId: number,
  sessionId: number,
  force = false,
): Promise<TenderConfirmResponse> {
  const { data } = await api.post(
    `${base}/${tenderId}/import-sessions/${sessionId}/confirm/`,
    { force },
  );
  return data;
}

export async function startPricing(id: number): Promise<Tender> {
  const { data } = await api.patch(`${base}/${id}/`, { status: "pricing" });
  return data;
}
