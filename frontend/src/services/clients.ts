import { api } from "./api";
import type { Client, ClientPayload } from "../types/client";

export async function listClients(): Promise<Client[]> {
  const { data } = await api.get("/clients/");
  return data.results ?? data;
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const { data } = await api.post("/clients/", payload);
  return data;
}

export async function updateClient(
  id: number,
  payload: Partial<ClientPayload>,
): Promise<Client> {
  const { data } = await api.patch(`/clients/${id}/`, payload);
  return data;
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}/`);
}
