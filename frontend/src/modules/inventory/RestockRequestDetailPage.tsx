import { useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listRestockRequests } from "@/services/inventory";
import {
  ArrowLeft,
  Truck,
  Clock,
  PackageCheck,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partially_dispatched: "bg-orange-50 text-orange-700 border-orange-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  received: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Approval",
  partially_dispatched: "Partially Dispatched",
  in_transit: "Dispatched — In Transit",
  received: "Received",
  rejected: "Rejected",
};

export function RestockRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const id = Number(requestId);
  const {
    data: requests,
    loading,
    error,
  } = useFetch(() => listRestockRequests());
  const req = requests?.find((r) => r.id === id);

  if (loading) return <div className="text-steel-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!req) return <div className="text-steel-500">Request not found.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/company/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700"
      >
        <ArrowLeft size={14} /> Back to Inventory
      </Link>

      <div>
        <span
          className={`text-sm px-3 py-1 rounded-full border ${STATUS_STYLES[req.status]}`}
        >
          {STATUS_LABELS[req.status]}
        </span>
        <h1 className="text-2xl font-semibold text-steel-900 mt-3">
          {req.item_name}
        </h1>
        <p className="text-steel-500">
          Requested {Number(req.quantity_requested)} {req.item_unit} for{" "}
          {req.project_name}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y divide-steel-100">
        <div className="p-5 flex items-start gap-3">
          <Clock size={18} className="text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-steel-900">Requested</p>
            <p className="text-xs text-steel-500 mt-0.5">
              {req.requested_by_name} ·{" "}
              {new Date(req.created_at).toLocaleString()}
            </p>
            {req.notes && (
              <p className="text-sm text-steel-700 mt-2">"{req.notes}"</p>
            )}
          </div>
        </div>

        <div className="p-5 flex items-start gap-3">
          <Truck
            size={18}
            className={
              req.dispatched_at
                ? "text-blue-500 mt-0.5"
                : "text-steel-300 mt-0.5"
            }
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-steel-900">
              Dispatched{" "}
              {req.source_warehouse_name && `from ${req.source_warehouse_name}`}
            </p>
            {req.dispatched_at ? (
              <p className="text-xs text-steel-500 mt-0.5">
                {req.dispatched_by_name} ·{" "}
                {new Date(req.dispatched_at).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-steel-400 mt-0.5">
                Not dispatched yet.
              </p>
            )}
            {req.dispatch_notes && (
              <p className="text-sm text-steel-700 mt-2">
                Ref: {req.dispatch_notes}
              </p>
            )}
          </div>
        </div>

        {req.status === "partially_dispatched" && (
          <div className="p-5 flex items-start gap-3 bg-amber-50/40">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-steel-900">
                Shortfall — {Number(req.outstanding_quantity)} {req.item_unit}{" "}
                still needed
              </p>
              <p className="text-xs text-steel-500 mt-0.5">
                {Number(req.fulfilled_quantity ?? 0)} of{" "}
                {Number(req.quantity_requested)} {req.item_unit} was dispatched
                from stock on hand.
              </p>
              {req.generated_purchase_request_code ? (
                <p className="text-sm text-steel-700 mt-2 flex items-center gap-1">
                  <ArrowUpRight size={14} className="text-steel-400" />
                  Escalated to Procurement as{" "}
                  <span className="font-medium">
                    {req.generated_purchase_request_code}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-steel-400 mt-2">
                  Not yet escalated to Procurement.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="p-5 flex items-start gap-3">
          <PackageCheck
            size={18}
            className={
              req.received_at
                ? "text-green-500 mt-0.5"
                : "text-steel-300 mt-0.5"
            }
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-steel-900">Received</p>
            {req.received_at ? (
              <p className="text-xs text-steel-500 mt-0.5">
                {req.received_by_name} ·{" "}
                {new Date(req.received_at).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-steel-400 mt-0.5">
                Not confirmed yet.
              </p>
            )}
          </div>
        </div>

        {req.status === "rejected" && (
          <div className="p-5 flex items-start gap-3">
            <XCircle size={18} className="text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-steel-900">Rejected</p>
              <p className="text-xs text-steel-500 mt-0.5">
                {req.reviewed_by_name} ·{" "}
                {req.reviewed_at && new Date(req.reviewed_at).toLocaleString()}
              </p>
              {req.review_notes && (
                <p className="text-sm text-steel-700 mt-2">
                  "{req.review_notes}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {(req.resulting_movement || req.receipt_movement) && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-2">
          <p className="text-xs text-steel-500 uppercase tracking-wide mb-1">
            Linked Movements
          </p>
          {req.resulting_movement && (
            <Link
              to={`/company/inventory/movements/${req.resulting_movement}`}
              className="block text-sm text-orange-600 hover:text-orange-700"
            >
              View dispatch movement (Transfer Out) →
            </Link>
          )}
          {req.receipt_movement && (
            <Link
              to={`/company/inventory/movements/${req.receipt_movement}`}
              className="block text-sm text-orange-600 hover:text-orange-700"
            >
              View receipt movement (Transfer In) →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
