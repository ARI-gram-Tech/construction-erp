// /src/modules/inventory/components/RestockRequestsSection.tsx
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  listRestockRequests,
  approveRestockRequest,
  rejectRestockRequests,
  escalateRestockToProcurement,
} from "@/services/inventory";
import { Check, X, Truck, ArrowUpRight, AlertTriangle } from "lucide-react";
import type { StockRestockRequest } from "@/types/inventory";

// Both statuses land here — a fresh 'pending' request, or one already
// partially dispatched that still has a shortfall to deal with.

export function RestockRequestsSection() {
  const {
    data: pending,
    loading: l1,
    error: e1,
    reload: reload1,
  } = useFetch(() => listRestockRequests("pending"));
  const {
    data: partial,
    loading: l2,
    error: e2,
    reload: reload2,
  } = useFetch(() => listRestockRequests("partially_dispatched"));

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [escalatingId, setEscalatingId] = useState<number | null>(null);
  const [escalateQty, setEscalateQty] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  const loading = l1 || l2;
  const error = e1 || e2;

  function reload() {
    reload1();
    reload2();
  }

  const requests: StockRestockRequest[] = [
    ...(pending ?? []),
    ...(partial ?? []),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  async function handleApprove(id: number) {
    setProcessingId(id);
    setMessage("");
    try {
      const result = await approveRestockRequest({ id });
      setMessage(
        result.status === "partially_dispatched"
          ? `Dispatched ${result.fulfilled_quantity} of ${result.quantity_requested} ${result.item_unit} — ` +
              `${result.outstanding_quantity} still short. Escalate the rest to Procurement below if needed.`
          : "Dispatched in full — the site store can confirm receipt once it arrives.",
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

  async function handleEscalate(req: StockRestockRequest) {
    setEscalatingId(req.id);
    setMessage("");
    try {
      const overrideQty = escalateQty[req.id];
      const result = await escalateRestockToProcurement({
        id: req.id,
        quantity: overrideQty ? Number(overrideQty) : undefined,
      });
      setMessage(
        `Sent to Procurement as ${result.generated_purchase_request_code}.`,
      );
      reload();
    } catch (err: any) {
      setMessage(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "Couldn't escalate this shortfall — try again.",
      );
    } finally {
      setEscalatingId(null);
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

      {requests.length > 0 ? (
        <div className="bg-white rounded-xl border border-steel-200/50 divide-y divide-steel-100">
          {requests.map((req) => {
            const isPartial = req.status === "partially_dispatched";
            const alreadyEscalated = !!req.generated_purchase_request;

            return (
              <div key={req.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-steel-900 flex items-center gap-2">
                      {req.item_name}
                      <span className="text-steel-500 font-normal">
                        · {Number(req.quantity_requested)} {req.item_unit}
                      </span>
                      {isPartial && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle size={11} />
                          Partial — {Number(req.outstanding_quantity)}{" "}
                          {req.item_unit} short
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-steel-500 mt-0.5">
                      For {req.project_name} · Requested by{" "}
                      {req.requested_by_name}
                      {req.source_warehouse_name &&
                        ` · From ${req.source_warehouse_name}`}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-steel-400 mt-1 italic">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  {!isPartial && (
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
                        {processingId === req.id
                          ? "Dispatching..."
                          : "Dispatch"}
                      </button>
                    </div>
                  )}
                </div>

                {isPartial && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-steel-100">
                    {alreadyEscalated ? (
                      <span className="text-xs text-steel-500">
                        Already escalated as{" "}
                        <span className="font-medium text-steel-700">
                          {req.generated_purchase_request_code}
                        </span>
                      </span>
                    ) : (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={String(req.outstanding_quantity)}
                          value={escalateQty[req.id] ?? ""}
                          onChange={(e) =>
                            setEscalateQty((prev) => ({
                              ...prev,
                              [req.id]: e.target.value,
                            }))
                          }
                          className="w-28 border border-steel-300 rounded-lg px-2 py-1.5 text-xs"
                        />
                        <span className="text-xs text-steel-400">
                          {req.item_unit} to send to Procurement
                        </span>
                        <button
                          onClick={() => handleEscalate(req)}
                          disabled={escalatingId === req.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-steel-800 text-white hover:bg-steel-900 disabled:opacity-40 ml-auto"
                        >
                          <ArrowUpRight size={13} />
                          {escalatingId === req.id
                            ? "Sending..."
                            : "Escalate to Procurement"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
