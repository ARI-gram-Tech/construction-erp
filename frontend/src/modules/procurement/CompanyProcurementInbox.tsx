// /src/modules/procurement/CompanyProcurementInbox.tsx
import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listInboxRequests } from "@/services/purchaseRequests";
import type { PurchaseRequest, PRStatus } from "@/types/purchaseRequest";
import { Inbox, ClipboardCheck, AlertTriangle, Clock } from "lucide-react";

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
  pending_tier1: "Awaiting PM",
  pending_tier2: "Awaiting Procurement",
  pending_tier3: "Awaiting Director",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  project_manager: "Requests from your projects awaiting your approval.",
  procurement_manager:
    "Every request across the company awaiting spend authorization.",
  director:
    "High-value requests that crossed the approval threshold, across every project.",
  company_admin:
    "Everything currently pending at any approval stage, company-wide.",
};

function InboxItem({
  pr,
  onClick,
}: {
  pr: PurchaseRequest;
  onClick: () => void;
}) {
  const getPriorityColor = (priority: string) => {
    if (priority === "urgent") return "bg-red-50 border-red-200";
    return "bg-white border-steel-200/50";
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md
        ${getPriorityColor(pr.priority)}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-steel-400">{pr.code}</span>
            {pr.priority === "urgent" && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle size={12} />
                URGENT
              </span>
            )}
            {pr.priority === "normal" && (
              <span className="text-xs text-steel-400">Normal</span>
            )}
          </div>
          <p className="text-sm font-medium text-steel-900 mt-0.5">
            {pr.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-steel-500 flex-wrap">
            <span>KES {Number(pr.estimated_total).toLocaleString()}</span>
            <span>•</span>
            <span>{pr.project_name || `Project #${pr.project}`}</span>
            <span>•</span>
            <span>Requested by {pr.requested_by_name || "—"}</span>
            {pr.required_date && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Due {pr.required_date}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <span
            className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[pr.status]}`}
          >
            {STATUS_LABELS[pr.status]}
          </span>
          <button
            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Review →
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompanyProcurementInbox() {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const {
    data: requests,
    loading,
    error,
  } = useFetch(() => listInboxRequests());

  const description = me?.role ? ROLE_DESCRIPTIONS[me.role] : undefined;

  // Group by urgency
  const urgent = requests?.filter((r) => r.priority === "urgent") || [];
  const normal = requests?.filter((r) => r.priority !== "urgent") || [];

  if (loading)
    return <div className="text-steel-500">Loading your queue...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-steel-900 flex items-center gap-2">
          <Inbox size={24} className="text-orange-500" />
          Procurement Inbox
        </h1>
        <p className="text-steel-500">
          {description ??
            "Purchase requests currently sitting at your stage, across every project."}
        </p>
        {requests && requests.length > 0 && (
          <p className="text-sm text-steel-400 mt-1">
            {requests.length} request{requests.length !== 1 ? "s" : ""} awaiting
            your attention
          </p>
        )}
      </div>

      {requests && requests.length > 0 ? (
        <div className="space-y-4">
          {/* Urgent Section */}
          {urgent.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                Urgent ({urgent.length})
              </h2>
              <div className="space-y-3">
                {urgent.map((pr) => (
                  <InboxItem
                    key={pr.id}
                    pr={pr}
                    onClick={() =>
                      navigate(`/projects/${pr.project}/procurement/${pr.id}`)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Normal Section */}
          {normal.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={14} />
                Normal Priority ({normal.length})
              </h2>
              <div className="space-y-3">
                {normal.map((pr) => (
                  <InboxItem
                    key={pr.id}
                    pr={pr}
                    onClick={() =>
                      navigate(`/projects/${pr.project}/procurement/${pr.id}`)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center bg-white rounded-xl border border-steel-200/50">
          <ClipboardCheck size={32} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            Nothing needs your attention right now.
          </p>
          <p className="text-xs text-steel-400 mt-1">All caught up! 🎉</p>
        </div>
      )}
    </div>
  );
}
