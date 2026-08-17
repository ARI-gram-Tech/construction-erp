import { api } from "./api";
import type { AuditLogEntry } from "../types/auditLog";

export async function listAuditLogs(): Promise<AuditLogEntry[]> {
  const { data } = await api.get("/audit-logs/");
  return data.results ?? data;
}
