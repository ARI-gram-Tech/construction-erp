export interface AuditLogEntry {
  id: number;
  actor_email: string | null;
  action: string;
  company_name: string | null;
  description: string;
  created_at: string;
}
