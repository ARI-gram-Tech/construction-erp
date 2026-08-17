import { api, API_BASE_URL } from "./api";
import type {
  Variation,
  VariationPayload,
  InterimPaymentCertificate,
  IPCPayload,
} from "@/types/variations";

export async function listVariations(projectId: number): Promise<Variation[]> {
  const { data } = await api.get(
    `/variations/projects/${projectId}/variations/`,
  );
  return data.results ?? data;
}

export async function getVariation(
  projectId: number,
  id: number,
): Promise<Variation> {
  const { data } = await api.get(
    `/variations/projects/${projectId}/variations/${id}/`,
  );
  return data;
}

export async function createVariation(
  projectId: number,
  payload: VariationPayload,
): Promise<Variation> {
  const { data } = await api.post(
    `/variations/projects/${projectId}/variations/`,
    payload,
  );
  return data;
}

export async function submitVariation(
  projectId: number,
  id: number,
): Promise<Variation> {
  const { data } = await api.post(
    `/variations/projects/${projectId}/variations/${id}/submit/`,
  );
  return data;
}

export async function approveVariation(
  projectId: number,
  id: number,
  comment?: string,
): Promise<Variation> {
  const { data } = await api.post(
    `/variations/projects/${projectId}/variations/${id}/approve/`,
    { comment },
  );
  return data;
}

export async function rejectVariation(
  projectId: number,
  id: number,
  comment?: string,
): Promise<Variation> {
  const { data } = await api.post(
    `/variations/projects/${projectId}/variations/${id}/reject/`,
    { comment },
  );
  return data;
}

export async function listIPCs(
  projectId: number,
): Promise<InterimPaymentCertificate[]> {
  const { data } = await api.get(`/variations/projects/${projectId}/ipcs/`);
  return data.results ?? data;
}

export async function getIPC(
  projectId: number,
  id: number,
): Promise<InterimPaymentCertificate> {
  const { data } = await api.get(
    `/variations/projects/${projectId}/ipcs/${id}/`,
  );
  return data;
}

export async function createIPC(
  projectId: number,
  payload: IPCPayload,
): Promise<InterimPaymentCertificate> {
  const { data } = await api.post(
    `/variations/projects/${projectId}/ipcs/`,
    payload,
  );
  return data;
}

export async function issueIPC(
  projectId: number,
  id: number,
): Promise<InterimPaymentCertificate> {
  const { data } = await api.post(
    `/variations/projects/${projectId}/ipcs/${id}/issue/`,
  );
  return data;
}

export function ipcPdfUrl(projectId: number, id: number): string {
  return `${API_BASE_URL}/variations/projects/${projectId}/ipcs/${id}/pdf/`;
}
