// frontend/src/services/lpo.ts
import { api } from "./api";
import type { LPO, GenerateLPOPayload } from "../types/lpo";

export async function listLPOs(): Promise<LPO[]> {
  const { data } = await api.get("/procurement/lpos/");
  return data.results ?? data;
}

export async function getLPO(id: number): Promise<LPO> {
  const { data } = await api.get(`/procurement/lpos/${id}/`);
  return data;
}

export async function generateLPO(payload: GenerateLPOPayload): Promise<LPO> {
  const { data } = await api.post("/procurement/lpos/generate/", payload);
  return data;
}

export async function approveLPODigital(id: number): Promise<LPO> {
  const { data } = await api.post(`/procurement/lpos/${id}/approve-digital/`);
  return data;
}

export async function uploadSignedLPO(id: number, file: File): Promise<LPO> {
  const form = new FormData();
  form.append("signed_document", file);
  const { data } = await api.post(
    `/procurement/lpos/${id}/upload-signed/`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function sendLPO(
  id: number,
  deliveryLocation: "site" | "main_warehouse",
): Promise<LPO> {
  const { data } = await api.post(`/procurement/lpos/${id}/send/`, {
    delivery_location: deliveryLocation,
  });
  return data;
}

export function getLPOPdfUrl(id: number): string {
  return `${api.defaults.baseURL}/procurement/lpos/${id}/pdf/`;
}

export async function getLPOByPurchaseRequest(
  prId: number,
): Promise<LPO | null> {
  const all = await listLPOs();
  return all.find((l) => l.purchase_request === prId) ?? null;
}
