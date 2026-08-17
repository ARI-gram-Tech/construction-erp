// /src/services/inventory.ts

import { api } from "./api";
import type {
  Warehouse,
  WarehousePayload,
  StockItem,
  StockItemPayload,
  StockLevel,
  StockMovement,
  ReceiveIssuePayload,
  TransferPayload,
  AdjustPayload,
  MovementUpdatePayload,
  PendingStockItemRequest,
  ApproveRequestPayload,
  StockRestockRequest,
  CreateRestockRequestPayload,
  ApproveRestockRequestPayload,
  ReceiveRestockRequestPayload,
} from "../types/inventory";

// DRF paginates at 25/page. Every list function below must follow
// `next` until it's null, or any list beyond 25 rows silently loses
// items — which is exactly what was happening with 80 stock items.
interface PaginatedResponse<T> {
  results: T[];
  next: string | null;
}

async function fetchAllPages<T>(url: string): Promise<T[]> {
  let results: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res = await api.get(nextUrl);
    const data = res.data as PaginatedResponse<T> | T[];

    if (Array.isArray(data)) {
      results = results.concat(data);
      nextUrl = null;
    } else {
      results = results.concat(data.results ?? []);
      nextUrl = data.next;
    }
  }

  return results;
}

// --- Warehouses ---

export async function listWarehouses(): Promise<Warehouse[]> {
  return fetchAllPages<Warehouse>("/inventory/warehouses/");
}

export async function updateWarehouse(
  id: number,
  payload: WarehousePayload,
): Promise<Warehouse> {
  const { data } = await api.patch(`/inventory/warehouses/${id}/`, payload);
  return data;
}

// --- Stock Items ---

export async function listStockItems(): Promise<StockItem[]> {
  return fetchAllPages<StockItem>("/inventory/items/");
}

export async function getStockItem(id: number): Promise<StockItem> {
  const { data } = await api.get(`/inventory/items/${id}/`);
  return data;
}

export async function createStockItem(
  payload: StockItemPayload,
): Promise<StockItem> {
  const { data } = await api.post("/inventory/items/", payload);
  return data;
}

export async function updateStockItem(
  id: number,
  payload: Partial<StockItemPayload>,
): Promise<StockItem> {
  const { data } = await api.patch(`/inventory/items/${id}/`, payload);
  return data;
}

export async function deleteStockItem(id: number): Promise<void> {
  await api.delete(`/inventory/items/${id}/`);
}

// --- Stock Levels ---

export async function listStockLevels(params?: {
  warehouse?: number;
  item?: number;
}): Promise<StockLevel[]> {
  const query = new URLSearchParams();
  if (params?.warehouse) query.set("warehouse", String(params.warehouse));
  if (params?.item) query.set("item", String(params.item));
  const qs = query.toString();
  return fetchAllPages<StockLevel>(`/inventory/levels/${qs ? `?${qs}` : ""}`);
}

// --- Stock Movements ---

export async function listStockMovements(params?: {
  warehouse?: number;
  item?: number;
}): Promise<StockMovement[]> {
  const query = new URLSearchParams();
  if (params?.warehouse) query.set("warehouse", String(params.warehouse));
  if (params?.item) query.set("item", String(params.item));
  const qs = query.toString();
  return fetchAllPages<StockMovement>(
    `/inventory/movements/${qs ? `?${qs}` : ""}`,
  );
}

export async function receiveStock(
  payload: ReceiveIssuePayload,
): Promise<StockMovement> {
  const { data } = await api.post("/inventory/movements/receive/", payload);
  return data;
}

export async function issueStock(
  payload: ReceiveIssuePayload,
): Promise<StockMovement> {
  const { data } = await api.post("/inventory/movements/issue/", payload);
  return data;
}

export async function transferStock(
  payload: TransferPayload,
): Promise<StockMovement> {
  const { data } = await api.post("/inventory/movements/transfer/", payload);
  return data;
}

export async function adjustStock(
  payload: AdjustPayload,
): Promise<StockMovement> {
  const { data } = await api.post("/inventory/movements/adjust/", payload);
  return data;
}

export async function updateMovement(
  id: number,
  payload: MovementUpdatePayload,
): Promise<StockMovement> {
  const { data } = await api.patch(`/inventory/movements/${id}/`, payload);
  return data;
}

export async function reverseMovement(
  id: number,
  note?: string,
): Promise<StockMovement> {
  const { data } = await api.post(`/inventory/movements/${id}/reverse/`, {
    reference: note ?? "",
  });
  return data;
}

export async function listPendingStockItemRequests(
  status?: "pending" | "approved" | "rejected",
): Promise<PendingStockItemRequest[]> {
  const qs = status ? `?status=${status}` : "";
  return fetchAllPages<PendingStockItemRequest>(
    `/inventory/pending-item-requests/${qs}`,
  );
}

export async function approveStockItemRequests(
  items: ApproveRequestPayload[],
): Promise<PendingStockItemRequest[]> {
  const { data } = await api.post("/inventory/pending-item-requests/approve/", {
    items,
  });
  return data;
}

export async function rejectStockItemRequests(
  ids: number[],
  reason?: string,
): Promise<{ detail: string }> {
  const { data } = await api.post("/inventory/pending-item-requests/reject/", {
    ids,
    reason,
  });
  return data;
}

// --- Restock Requests ---
// "I already have this item, send me more" — as opposed to
// PendingStockItemRequest above, which is "this item doesn't exist
// in the catalog yet."

export async function listRestockRequests(
  status?: "pending" | "in_transit" | "received" | "rejected",
): Promise<StockRestockRequest[]> {
  const qs = status ? `?status=${status}` : "";
  return fetchAllPages<StockRestockRequest>(
    `/inventory/restock-requests/${qs}`,
  );
}

export async function createRestockRequest(
  payload: CreateRestockRequestPayload,
): Promise<StockRestockRequest> {
  const { data } = await api.post("/inventory/restock-requests/", payload);
  return data;
}

export async function approveRestockRequest(
  payload: ApproveRestockRequestPayload,
): Promise<StockRestockRequest> {
  const { data } = await api.post(
    "/inventory/restock-requests/approve/",
    payload,
  );
  return data;
}

// Confirms physical arrival at the destination project's store — the
// second half of the dispatch/receive split. Distinct from approve()
// above, which only dispatches (moves stock OUT of the source).
export async function receiveRestockRequest(
  payload: ReceiveRestockRequestPayload,
): Promise<StockRestockRequest> {
  const { data } = await api.post(
    "/inventory/restock-requests/receive/",
    payload,
  );
  return data;
}

export async function rejectRestockRequests(
  ids: number[],
  reason?: string,
): Promise<{ detail: string }> {
  const { data } = await api.post("/inventory/restock-requests/reject/", {
    ids,
    reason,
  });
  return data;
}
