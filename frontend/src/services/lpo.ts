// frontend/src/services/lpo.ts
import { api } from "./api";
import type {
  LPO,
  GenerateLPOPayload,
  ManualLPOPayload,
  SupplierItem,
} from "../types/lpo";

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

export async function listAllLPOs(): Promise<LPO[]> {
  return listLPOs();
}

export async function createManualLPO(payload: ManualLPOPayload): Promise<LPO> {
  const form = new FormData();
  form.append("supplier", String(payload.supplier));
  form.append("project", String(payload.project));
  form.append("items", JSON.stringify(payload.items));
  if (payload.vat_applicable !== undefined) {
    form.append("vat_applicable", String(payload.vat_applicable));
  }
  if (payload.vat_percent !== undefined) {
    form.append("vat_percent", String(payload.vat_percent));
  }
  if (payload.purchase_request) {
    form.append("purchase_request", String(payload.purchase_request));
  }
  if (payload.already_signed !== undefined) {
    form.append("already_signed", String(payload.already_signed));
  }
  if (payload.source_document) {
    form.append("source_document", payload.source_document);
  }
  const { data } = await api.post("/procurement/lpos/manual/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getSupplierItems(
  supplierId: number,
): Promise<SupplierItem[]> {
  const { data } = await api.get(
    `/procurement/supplier-items/?supplier=${supplierId}`,
  );
  return data.results ?? data;
}
