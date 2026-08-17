// modules/projects/ProjectProcurement/ProcurementPage.tsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listPurchaseRequests } from "@/services/purchaseRequests";
import type { PRStatus } from "@/types/purchaseRequest";
import { ClipboardList } from "lucide-react";

const STATUS_FILTERS: { value: PRStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_tier1", label: "Pending PM Approval" },
  { value: "pending_tier2", label: "Pending Procurement Approval" },
  { value: "pending_tier3", label: "Pending Director Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<PRStatus, string> = {
  draft: "bg-steel-100 text-steel-600",
  pending_tier1: "bg-amber-50 text-amber-700",
  pending_tier2: "bg-amber-50 text-amber-700",
  pending_tier3: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-steel-100 text-steel-500",
};

const STATUS_LABELS: Record<PRStatus, string> = {
  draft: "Draft",
  pending_tier1: "Pending PM",
  pending_tier2: "Pending Procurement",
  pending_tier3: "Pending Director",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function StatusBadge({ status }: { status: PRStatus }) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ProcurementPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const {
    data: requests,
    loading,
    error,
  } = useFetch(() => listPurchaseRequests(id), [id]);

  const [statusFilter, setStatusFilter] = useState<PRStatus | "all">("all");

  const filtered = useMemo(() => {
    if (!requests) return [];
    if (statusFilter === "all") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  if (loading)
    return <div className="text-steel-500">Loading purchase requests...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as PRStatus | "all")}
        className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
      >
        {STATUS_FILTERS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {filtered.length > 0 ? (
          filtered.map((pr) => (
            <div
              key={pr.id}
              onClick={() => navigate(`/projects/${id}/procurement/${pr.id}`)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-steel-50/60 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-steel-900">
                  <span className="text-steel-400 font-mono text-xs mr-2">
                    {pr.code}
                  </span>
                  {pr.title}
                </p>
                <p className="text-xs text-steel-500">
                  Requested by {pr.requested_by_name || "—"}
                  {pr.required_date && ` · Needed by ${pr.required_date}`}
                  {pr.priority === "urgent" && " · Urgent"}
                </p>
              </div>
              <StatusBadge status={pr.status} />
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <ClipboardList size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              {requests && requests.length > 0
                ? "No requests match this filter."
                : "No purchase requests yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
