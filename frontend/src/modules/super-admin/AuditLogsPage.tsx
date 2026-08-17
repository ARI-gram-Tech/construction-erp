import { useFetch } from "@/hooks/useFetch";
import { listAuditLogs } from "@/services/auditLogs";

function formatAction(action: string) {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AuditLogsPage() {
  const { data: logs, loading, error } = useFetch(() => listAuditLogs());

  if (loading)
    return <div className="p-8 text-steel-500">Loading audit logs...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-steel-900">Audit Logs</h1>

      <div className="bg-white rounded-lg shadow divide-y">
        {logs?.length === 0 && (
          <p className="p-4 text-sm text-steel-500">No actions recorded yet.</p>
        )}
        {logs?.map((log) => (
          <div key={log.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-steel-900">
                {formatAction(log.action)}
              </p>
              <p className="text-xs text-steel-500">
                {formatDate(log.created_at)}
              </p>
            </div>
            <p className="text-sm text-steel-500 mt-1">
              {log.actor_email ?? "System"}
              {log.company_name && ` · ${log.company_name}`}
            </p>
            {log.description && (
              <p className="text-sm text-steel-600 mt-1">{log.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
