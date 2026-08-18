import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listRestockRequests } from "@/services/inventory";
import {
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type { StockRestockRequest } from "@/types/inventory";

const STATUS_STYLES: Record<StockRestockRequest["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partially_dispatched: "bg-orange-50 text-orange-700 border-orange-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  received: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_ICONS: Record<StockRestockRequest["status"], React.ElementType> = {
  pending: Clock,
  partially_dispatched: AlertTriangle,
  in_transit: Truck,
  received: CheckCircle2,
  rejected: XCircle,
};

const STATUS_LABELS: Record<StockRestockRequest["status"], string> = {
  pending: "Pending Approval",
  partially_dispatched: "Partially Dispatched",
  in_transit: "Dispatched — In Transit",
  received: "Received",
  rejected: "Rejected",
};

export function RestockRequestsTab({ projectId }: { projectId: number }) {
  const navigate = useNavigate();
  const {
    data: requests,
    loading,
    error,
  } = useFetch(() => listRestockRequests());

  if (loading) return <div className="text-steel-500">Loading requests...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const projectRequests = (requests ?? [])
    .filter((r) => r.project === projectId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  if (projectRequests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
        <Truck size={24} className="text-steel-300 mx-auto mb-2" />
        <p className="text-sm text-steel-500">
          No restock requests made from this store yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-steel-200/50 divide-y divide-steel-100">
      {projectRequests.map((req) => {
        const Icon = STATUS_ICONS[req.status];
        return (
          <div
            key={req.id}
            onClick={() =>
              navigate(`/company/inventory/restock-requests/${req.id}`)
            }
            className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-steel-50/60 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-steel-900">
                {req.item_name}
                <span className="text-steel-500 font-normal">
                  {" "}
                  · {Number(req.quantity_requested)} {req.item_unit}
                </span>
              </p>
              <p className="text-xs text-steel-500 mt-0.5">
                Requested by {req.requested_by_name} ·{" "}
                {new Date(req.created_at).toLocaleDateString()}
                {req.source_warehouse_name &&
                  ` · From ${req.source_warehouse_name}`}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${STATUS_STYLES[req.status]}`}
            >
              <Icon size={12} />
              {STATUS_LABELS[req.status]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
