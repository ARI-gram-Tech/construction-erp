// modules/projects/ProjectProcurement/ProcurementDashboard.tsx
import { useNavigate, useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listPurchaseRequests } from "@/services/purchaseRequests";
import { PROCUREMENT_CREATE_ROLES } from "@/constants/projectRoles";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Clipboard,
  AlertTriangle,
} from "lucide-react";

interface MetricCard {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function MetricCard({ icon, label, value, color }: MetricCard) {
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

function QuickAction({ icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-white rounded-xl border border-steel-200/50 hover:border-orange-200 hover:shadow-md transition-all w-full text-left"
    >
      <div className="p-2 bg-orange-50 rounded-lg text-orange-500">{icon}</div>
      <span className="text-sm font-medium text-steel-700">{label}</span>
    </button>
  );
}

function RecentRequestCard({ pr, onClick }: any) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-steel-100 text-steel-600",
      pending_tier1: "bg-amber-50 text-amber-700",
      pending_tier2: "bg-amber-50 text-amber-700",
      pending_tier3: "bg-red-50 text-red-700",
      approved: "bg-green-50 text-green-700",
      rejected: "bg-red-50 text-red-700",
      cancelled: "bg-steel-100 text-steel-500",
    };
    return colors[status] || "bg-steel-100 text-steel-600";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      pending_tier1: "Pending PM",
      pending_tier2: "Pending Procurement",
      pending_tier3: "Pending Director",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  return (
    <div
      onClick={onClick}
      className="p-4 bg-white rounded-xl border border-steel-200/50 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-steel-900">
            <span className="text-steel-400 font-mono text-xs mr-2">
              {pr.code}
            </span>
            {pr.title}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-steel-500">
            <span>KES {Number(pr.estimated_total).toLocaleString()}</span>
            {pr.priority === "urgent" && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle size={12} />
                Urgent
              </span>
            )}
            <span>• {pr.requested_by_name || "Unknown"}</span>
          </div>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(pr.status)}`}
        >
          {getStatusLabel(pr.status)}
        </span>
      </div>
    </div>
  );
}

export function ProcurementDashboard() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const { data: me } = useCurrentUser();

  const {
    data: requests,
    loading,
    error,
  } = useFetch(() => listPurchaseRequests(id), [id]);

  if (loading)
    return <div className="text-steel-500">Loading dashboard...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const stats = {
    total: requests?.length || 0,
    pending:
      requests?.filter((r) => r.status.startsWith("pending_")).length || 0,
    approved: requests?.filter((r) => r.status === "approved").length || 0,
    rejected: requests?.filter((r) => r.status === "rejected").length || 0,
  };

  // Only requests THIS user can act on right now — a PM waiting on
  // their own Tier 1 decision, not every pending request on the
  // project regardless of whose turn it is.
  const myApprovals =
    requests?.filter((r) => {
      if (me?.role !== "project_manager") return false;
      return r.status === "pending_tier1";
    }) || [];

  const recentRequests = requests?.slice(0, 5) || [];

  const metrics: MetricCard[] = [
    {
      icon: <FileText size={20} />,
      label: "Total Requests",
      value: stats.total,
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: <Clock size={20} />,
      label: "Pending Approval",
      value: stats.pending,
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: <CheckCircle2 size={20} />,
      label: "Approved",
      value: stats.approved,
      color: "bg-green-50 text-green-600",
    },
    {
      icon: <XCircle size={20} />,
      label: "Rejected",
      value: stats.rejected,
      color: "bg-red-50 text-red-600",
    },
  ];

  const canCreate =
    !!me?.role && (PROCUREMENT_CREATE_ROLES as string[]).includes(me.role);

  const quickActions = [
    ...(canCreate
      ? [
          {
            icon: <Plus size={20} />,
            label: "New Purchase Request",
            onClick: () => navigate(`/projects/${id}/procurement/new`),
          },
        ]
      : []),
    {
      icon: <Clipboard size={20} />,
      label: "View All Requests",
      onClick: () => navigate(`/projects/${id}/procurement/requests`),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-steel-900 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickAction key={action.label} {...action} />
          ))}
        </div>
      </div>

      {/* My Approvals (PM only, and only when something's waiting on them) */}
      {myApprovals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-steel-900 mb-3">
            Waiting On You
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700 mb-2">
              {myApprovals.length} request(s) need your approval
            </p>
            <button
              onClick={() => navigate(`/projects/${id}/procurement/requests`)}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Review Now
            </button>
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-steel-900">
            Recent Requests
          </h2>
          <button
            onClick={() => navigate(`/projects/${id}/procurement/requests`)}
            className="text-sm text-orange-600 hover:text-orange-700"
          >
            View all →
          </button>
        </div>
        <div className="space-y-3">
          {recentRequests.length > 0 ? (
            recentRequests.map((pr) => (
              <RecentRequestCard
                key={pr.id}
                pr={pr}
                onClick={() => navigate(`/projects/${id}/procurement/${pr.id}`)}
              />
            ))
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border border-steel-200/50">
              <FileText size={32} className="text-steel-300 mx-auto mb-2" />
              <p className="text-sm text-steel-500">No requests yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
