// /src/services/suppliers.ts

import { api } from "./api";
import type {
  Supplier,
  SupplierPayload,
  SupplierContact,
  SupplierContactPayload,
} from "../types/supplier";

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get("/suppliers/");
  return data.results ?? data;
}

export async function getSupplier(id: number): Promise<Supplier> {
  const { data } = await api.get(`/suppliers/${id}/`);
  return data;
}

export async function createSupplier(
  payload: SupplierPayload,
): Promise<Supplier> {
  const { data } = await api.post("/suppliers/", payload);
  return data;
}

export async function updateSupplier(
  id: number,
  payload: Partial<SupplierPayload>,
): Promise<Supplier> {
  const { data } = await api.patch(`/suppliers/${id}/`, payload);
  return data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}/`);
}

// --- Contacts ---

export async function listSupplierContacts(
  supplierId: number,
): Promise<SupplierContact[]> {
  const { data } = await api.get(`/suppliers/contacts/?supplier=${supplierId}`);
  return data.results ?? data;
}

export async function createSupplierContact(
  payload: SupplierContactPayload,
): Promise<SupplierContact> {
  const { data } = await api.post("/suppliers/contacts/", payload);
  return data;
}

export async function updateSupplierContact(
  id: number,
  payload: Partial<SupplierContactPayload>,
): Promise<SupplierContact> {
  const { data } = await api.patch(`/suppliers/contacts/${id}/`, payload);
  return data;
}

export async function deleteSupplierContact(id: number): Promise<void> {
  await api.delete(`/suppliers/contacts/${id}/`);
}
