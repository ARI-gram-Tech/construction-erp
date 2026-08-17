// /src/services/purchaseRequests.ts

import { api } from "./api";
import type {
  PurchaseRequest,
  PurchaseRequestPayload,
  ApprovedQuantityPayload,
  RecordDeliveryPayload,
  RecordReceiptPayload,
} from "../types/purchaseRequest";

const base = (projectId: number) =>
  `/procurement/projects/${projectId}/purchase-requests`;

export async function listPurchaseRequests(
  projectId: number,
): Promise<PurchaseRequest[]> {
  const { data } = await api.get(`${base(projectId)}/`);
  return data.results ?? data;
}

export async function getPurchaseRequest(
  projectId: number,
  id: number,
): Promise<PurchaseRequest> {
  const { data } = await api.get(`${base(projectId)}/${id}/`);
  return data;
}

export async function createPurchaseRequest(
  projectId: number,
  payload: PurchaseRequestPayload,
): Promise<PurchaseRequest> {
  const { data } = await api.post(`${base(projectId)}/`, payload);
  return data;
}

export async function updatePurchaseRequest(
  projectId: number,
  id: number,
  payload: Partial<PurchaseRequestPayload>,
): Promise<PurchaseRequest> {
  const { data } = await api.patch(`${base(projectId)}/${id}/`, payload);
  return data;
}

export async function deletePurchaseRequest(
  projectId: number,
  id: number,
): Promise<void> {
  await api.delete(`${base(projectId)}/${id}/`);
}

// --- Workflow actions ---

export async function submitPurchaseRequest(
  projectId: number,
  id: number,
): Promise<PurchaseRequest> {
  const { data } = await api.post(`${base(projectId)}/${id}/submit/`);
  return data;
}

export async function cancelPurchaseRequest(
  projectId: number,
  id: number,
): Promise<PurchaseRequest> {
  const { data } = await api.post(`${base(projectId)}/${id}/cancel/`);
  return data;
}

export async function approvePurchaseRequest(
  projectId: number,
  requestId: number,
  comment?: string,
  items?: ApprovedQuantityPayload[],
) {
  const { data } = await api.post(
    `/procurement/projects/${projectId}/purchase-requests/${requestId}/approve/`,
    { comment, items },
  );
  return data as PurchaseRequest;
}

export async function escalatePurchaseRequest(
  projectId: number,
  requestId: number,
  comment?: string,
) {
  const { data } = await api.post(
    `/procurement/projects/${projectId}/purchase-requests/${requestId}/escalate/`,
    { comment },
  );
  return data as PurchaseRequest;
}

export async function recordDelivery(
  projectId: number,
  requestId: number,
  items: RecordDeliveryPayload[],
) {
  const { data } = await api.post(
    `/procurement/projects/${projectId}/purchase-requests/${requestId}/record-delivery/`,
    { items },
  );
  return data as PurchaseRequest;
}

export async function recordReceipt(
  projectId: number,
  requestId: number,
  items: RecordReceiptPayload[],
) {
  const { data } = await api.post(
    `/procurement/projects/${projectId}/purchase-requests/${requestId}/record-receipt/`,
    { items },
  );
  return data as PurchaseRequest;
}

export async function rejectPurchaseRequest(
  projectId: number,
  id: number,
  comment?: string,
): Promise<PurchaseRequest> {
  const { data } = await api.post(`${base(projectId)}/${id}/reject/`, {
    comment: comment ?? "",
  });
  return data;
}

export async function listInboxRequests(): Promise<PurchaseRequest[]> {
  const { data } = await api.get("/procurement/inbox/");
  return data.results ?? data;
}

export async function listAllPurchaseRequests(): Promise<PurchaseRequest[]> {
  const { data } = await api.get("/procurement/all/");
  return data.results ?? data;
}
