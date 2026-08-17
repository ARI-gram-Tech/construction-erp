// /src/modules/inventory/components/RestockRequestsSection.tsx
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  listRestockRequests,
  approveRestockRequest,
  rejectRestockRequests,
} from "@/services/inventory";
import { Check, X, Truck } from "lucide-react";

export function RestockRequestsSection() {
  const {
    data: requests,
    loading,
    error,
    reload,
  } = useFetch(() => listRestockRequests("pending"));

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function handleApprove(id: number) {
    setProcessingId(id);
    setMessage("");
    try {
      await approveRestockRequest({ id });
      setMessage(
        "Dispatched — the site store can confirm receipt once it arrives.",
      );
      reload();
    } catch (err: any) {
      setMessage(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "Couldn't approve this request — check that source stock is available.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: number) {
    if (!confirm("Reject this restock request?")) return;
    setProcessingId(id);
    setMessage("");
    try {
      const result = await rejectRestockRequests([id]);
      setMessage(result.detail);
      reload();
    } finally {
      setProcessingId(null);
    }
  }

  if (loading)
    return <div className="text-steel-500">Loading restock requests...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-steel-50 text-steel-700 text-sm p-3 rounded-lg">
          {message}
        </div>
      )}

      {requests && requests.length > 0 ? (
        <div className="bg-white rounded-xl border border-steel-200/50 divide-y divide-steel-100">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-4 flex flex-wrap items-center justify-between gap-3"
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
                  For {req.project_name} · Requested by {req.requested_by_name}
                  {req.source_warehouse_name &&
                    ` · From ${req.source_warehouse_name}`}
                </p>
                {req.notes && (
                  <p className="text-xs text-steel-400 mt-1 italic">
                    "{req.notes}"
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReject(req.id)}
                  disabled={processingId === req.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <X size={14} />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40"
                >
                  <Truck size={14} />
                  {processingId === req.id ? "Dispatching..." : "Dispatch"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-steel-300 p-8 text-center">
          <Check size={24} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">No pending restock requests.</p>
        </div>
      )}
    </div>
  );
}
