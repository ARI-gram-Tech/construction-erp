// /frontend/src/modules/procurement/CompanyProcurementDashboard.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listAllPurchaseRequests } from "@/services/purchaseRequests";
import type { PRStatus } from "@/types/purchaseRequest";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const STATUS_STYLES: Record<PRStatus, string> = {
  draft: "bg-steel-100 text-steel-600",
  pending_tier1: "bg-amber-50 text-amber-700",
  pending_tier2: "bg-amber-50 text-amber-700",
  pending_tier3: "bg-red-50 text-red-700",
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

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/50 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-steel-500">{label}</p>
          <p className="text-2xl font-semibold text-steel-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export function CompanyProcurementDashboard() {
  const navigate = useNavigate();
  const {
    data: requests,
    loading,
    error,
  } = useFetch(() => listAllPurchaseRequests());

  const stats = useMemo(() => {
    if (!requests) return null;
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status.startsWith("pending_")).length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  const recent = requests?.slice(0, 8) ?? [];

  if (loading)
    return (
      <div className="text-steel-500">Loading procurement overview...</div>
    );
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<FileText size={20} />}
            label="Total Requests"
            value={stats.total}
            color="bg-blue-50 text-blue-600"
          />
          <MetricCard
            icon={<Clock size={20} />}
            label="Pending Approval"
            value={stats.pending}
            color="bg-amber-50 text-amber-600"
          />
          <MetricCard
            icon={<CheckCircle2 size={20} />}
            label="Approved"
            value={stats.approved}
            color="bg-green-50 text-green-600"
          />
          <MetricCard
            icon={<XCircle size={20} />}
            label="Rejected"
            value={stats.rejected}
            color="bg-red-50 text-red-600"
          />
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-steel-900 mb-3">
          Recent Requests — All Projects
        </h2>
        <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
          {recent.length > 0 ? (
            recent.map((pr) => (
              <div
                key={pr.id}
                onClick={() =>
                  navigate(`/projects/${pr.project}/procurement/${pr.id}`)
                }
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-steel-50/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-steel-900 truncate">
                    <span className="text-steel-400 font-mono text-xs mr-2">
                      {pr.code}
                    </span>
                    {pr.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-steel-500 flex-wrap">
                    <span>{pr.project_name ?? `Project #${pr.project}`}</span>
                    <span>•</span>
                    <span>
                      KES {Number(pr.estimated_total).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>{pr.requested_by_name || "—"}</span>
                    {pr.priority === "urgent" && (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle size={12} />
                        Urgent
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-3 ${STATUS_STYLES[pr.status]}`}
                >
                  {STATUS_LABELS[pr.status]}
                </span>
              </div>
            ))
          ) : (
            <div className="p-10 text-center">
              <FileText size={24} className="text-steel-300 mx-auto mb-2" />
              <p className="text-sm text-steel-500">No requests yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
