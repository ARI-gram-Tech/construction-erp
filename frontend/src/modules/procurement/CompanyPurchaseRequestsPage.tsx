// /frontend/src/modules/procurement/CompanyPurchaseRequestsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { ProcurementOutletContext } from "./components/CompanyProcurementLayout";
import { useFetch } from "@/hooks/useFetch";
import { listAllPurchaseRequests } from "@/services/purchaseRequests";
import type { PRStatus, PRPriority } from "@/types/purchaseRequest";
import { ClipboardList, AlertTriangle, X } from "lucide-react";

const STATUS_FILTERS: { value: PRStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_tier1", label: "Pending PM" },
  { value: "pending_tier2", label: "Pending Procurement" },
  { value: "pending_tier3", label: "Pending Director" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_FILTERS: { value: PRPriority | "all"; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
];

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

function StatusBadge({ status }: { status: PRStatus }) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function RequestCard({ pr, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`
        p-4 bg-white rounded-xl border hover:border-orange-200 hover:shadow-md transition-all cursor-pointer
        ${pr.priority === "urgent" ? "border-red-200" : "border-steel-200/50"}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-steel-400">{pr.code}</span>
            {pr.priority === "urgent" && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle size={12} />
                Urgent
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-steel-900 mt-0.5 truncate">
            {pr.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-steel-500 flex-wrap">
            <span className="font-medium text-steel-600">
              {pr.project_name ?? `Project #${pr.project}`}
            </span>
            <span>•</span>
            <span>KES {Number(pr.estimated_total).toLocaleString()}</span>
            <span>•</span>
            <span>Requested by {pr.requested_by_name || "—"}</span>
            {pr.required_date && (
              <>
                <span>•</span>
                <span>Needed {pr.required_date}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-4">
          <StatusBadge status={pr.status} />
          <span className="text-xs text-steel-400">
            {pr.items?.length || 0} items
          </span>
        </div>
      </div>
    </div>
  );
}

export function CompanyPurchaseRequestsPage() {
  const navigate = useNavigate();
  const { setRequestCount, searchTerm, showFilters, setHasActiveFilters } =
    useOutletContext<ProcurementOutletContext>();

  const {
    data: requests,
    loading,
    error,
  } = useFetch(() => listAllPurchaseRequests());

  const [statusFilter, setStatusFilter] = useState<PRStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<PRPriority | "all">(
    "all",
  );
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const projectOptions = useMemo(() => {
    if (!requests) return [];
    const seen = new Map<number, string>();
    requests.forEach((r) => {
      if (!seen.has(r.project)) {
        seen.set(r.project, r.project_name ?? `Project #${r.project}`);
      }
    });
    return Array.from(seen.entries());
  }, [requests]);

  const filtered = useMemo(() => {
    if (!requests) return [];

    let list = [...requests];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          r.reason?.toLowerCase().includes(term) ||
          (r.project_name ?? "").toLowerCase().includes(term),
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      list = list.filter((r) => r.priority === priorityFilter);
    }

    if (projectFilter !== "all") {
      list = list.filter((r) => String(r.project) === projectFilter);
    }

    return list.sort((a, b) => {
      if (a.priority === "urgent" && b.priority !== "urgent") return -1;
      if (b.priority === "urgent" && a.priority !== "urgent") return 1;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [requests, searchTerm, statusFilter, priorityFilter, projectFilter]);

  useEffect(() => {
    setRequestCount(filtered.length);
    return () => setRequestCount(null);
  }, [filtered.length, setRequestCount]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    projectFilter !== "all";

  useEffect(() => {
    setHasActiveFilters(hasActiveFilters);
    return () => setHasActiveFilters(false);
  }, [hasActiveFilters, setHasActiveFilters]);

  if (loading)
    return <div className="text-steel-500">Loading purchase requests...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
              setProjectFilter("all");
            }}
            className="text-xs text-steel-400 hover:text-steel-600 flex items-center gap-1"
          >
            <X size={12} />
            Clear filters
          </button>
        </div>
      )}

      {showFilters && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-steel-600 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as PRStatus | "all")
              }
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-600 mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as PRPriority | "all")
              }
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            >
              {PRIORITY_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-steel-600 mb-1">
              Project
            </label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Projects</option>
              {projectOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((pr) => (
            <RequestCard
              key={pr.id}
              pr={pr}
              onClick={() =>
                navigate(`/projects/${pr.project}/procurement/${pr.id}`)
              }
            />
          ))
        ) : (
          <div className="py-12 text-center bg-white rounded-xl border border-steel-200/50">
            <ClipboardList size={32} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              {requests && requests.length > 0
                ? "No requests match your filters"
                : "No purchase requests yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
