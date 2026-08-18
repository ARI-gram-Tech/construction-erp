// /src/modules/inventory/components/PendingReceiptsSection.tsx
import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  listRestockRequests,
  receiveRestockRequest,
} from "@/services/inventory";
import {
  listPurchaseRequests,
  recordReceipt,
} from "@/services/purchaseRequests";
import { PackageCheck, Truck, ClipboardList } from "lucide-react";

interface PendingReceiptsSectionProps {
  projectId: number;
  /** The project's own store — where a confirmed PR line actually lands. */
  warehouseId: number;
  onSuccess?: () => void;
}

// Everything currently inbound to THIS project's store, from either
// source: a Restock Request that's been dispatched (in_transit), or a
// Purchase Request line that's been delivered but not yet received
// (delivered_quantity set, received_quantity still null). Same
// "Confirm Receipt" action either way — from the storekeeper's point
// of view it's just "stuff arriving," regardless of which order type
// it came from.
export function PendingReceiptsSection({
  projectId,
  warehouseId,
  onSuccess,
}: PendingReceiptsSectionProps) {
  // Both statuses can have a dispatched leg awaiting receipt at this
  // store: a fully-dispatched request ('in_transit'), or the dispatched
  // portion of a partial one ('partially_dispatched') — the shortfall
  // on the latter is a separate concern handled via escalation, not
  // something that blocks receiving what WAS sent.
  const {
    data: inTransit,
    loading: rr1Loading,
    error: rr1Error,
    reload: reloadInTransit,
  } = useFetch(() => listRestockRequests("in_transit"));
  const {
    data: partiallyDispatched,
    loading: rr2Loading,
    error: rr2Error,
    reload: reloadPartial,
  } = useFetch(() => listRestockRequests("partially_dispatched"));

  const restockRequests = [
    ...(inTransit ?? []),
    ...(partiallyDispatched ?? []),
  ];
  const rrLoading = rr1Loading || rr2Loading;
  const rrError = rr1Error || rr2Error;
  function reloadRestock() {
    reloadInTransit();
    reloadPartial();
  }

  const {
    data: purchaseRequests,
    loading: prLoading,
    error: prError,
    reload: reloadPurchase,
  } = useFetch(() => listPurchaseRequests(projectId), [projectId]);

  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Backend already scopes non-logistics users to their own project's
  // restock requests, but a company-wide manager viewing this page
  // would otherwise see every project's in-transit requests mixed in.
  const projectRestockRequests = (restockRequests ?? []).filter(
    (r) => r.project === projectId,
  );

  // Flatten PR items down to just the ones actually awaiting receipt,
  // keeping the parent PR's code/title alongside each item for display.
  const pendingPrLines = useMemo(() => {
    if (!purchaseRequests) return [];
    return purchaseRequests.flatMap((pr) =>
      pr.items
        .filter(
          (item) =>
            item.delivered_quantity !== null && item.received_quantity === null,
        )
        .map((item) => ({ pr, item })),
    );
  }, [purchaseRequests]);

  async function handleReceiveRestock(id: number) {
    const key = `rr-${id}`;
    setProcessingKey(key);
    setMessage("");
    try {
      await receiveRestockRequest({ id });
      setMessage("Receipt confirmed — stock has been added to your store.");
      reloadRestock();
      onSuccess?.();
    } catch (err: any) {
      setMessage(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "Couldn't confirm receipt — try again.",
      );
    } finally {
      setProcessingKey(null);
    }
  }

  async function handleReceivePrLine(
    prId: number,
    itemId: number,
    deliveredQuantity: number,
  ) {
    const key = `pr-${itemId}`;
    setProcessingKey(key);
    setMessage("");
    try {
      // received_quantity is forced to exactly match delivered_quantity
      // — the backend now rejects any mismatch, so there's nothing to
      // let the person edit here; this is a confirmation, not an entry
      // form. A real shortfall/overage gets corrected upstream via
      // Record Delivery, not papered over at this step.
      await recordReceipt(projectId, prId, [
        {
          id: itemId,
          received_quantity: deliveredQuantity,
          warehouse: warehouseId,
        },
      ]);
      setMessage("Receipt confirmed — stock has been added to your store.");
      reloadPurchase();
      onSuccess?.();
    } catch (err: any) {
      setMessage(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "Couldn't confirm receipt — try again.",
      );
    } finally {
      setProcessingKey(null);
    }
  }

  const loading = rrLoading || prLoading;
  const error = rrError || prError;
  const totalCount = projectRestockRequests.length + pendingPrLines.length;

  // Silent on loading/error/empty — this is a supplementary banner
  // above the normal Movements view, not the page's primary content,
  // so it shouldn't compete with or duplicate the page's own loading
  // and error states.
  if (loading || error || totalCount === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/50 flex items-center gap-2">
        <Truck size={16} className="text-orange-500" />
        <h3 className="text-sm font-semibold text-steel-900">
          Pending Receipts
        </h3>
        <span className="text-xs text-steel-500">
          — {totalCount} item{totalCount === 1 ? "" : "s"} on the way
        </span>
      </div>

      {message && (
        <div className="px-4 py-2 text-sm text-steel-700 bg-steel-50 border-b border-steel-100">
          {message}
        </div>
      )}

      <div className="divide-y divide-steel-100">
        {projectRestockRequests.map((req) => (
          <div
            key={`rr-${req.id}`}
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
              <p className="text-xs text-steel-500 mt-0.5 flex items-center gap-1">
                <Truck size={11} className="text-steel-400" />
                Restock · Dispatched from {req.source_warehouse_name || "—"}
                {req.dispatched_by_name && ` by ${req.dispatched_by_name}`}
              </p>
            </div>
            <button
              onClick={() => handleReceiveRestock(req.id)}
              disabled={processingKey === `rr-${req.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
            >
              <PackageCheck size={14} />
              {processingKey === `rr-${req.id}`
                ? "Confirming..."
                : "Confirm Receipt"}
            </button>
          </div>
        ))}

        {pendingPrLines.map(({ pr, item }) => (
          <div
            key={`pr-${item.id}`}
            className="p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-medium text-steel-900">
                {item.description}
                <span className="text-steel-500 font-normal">
                  {" "}
                  · {Number(item.delivered_quantity)} {item.unit}
                </span>
              </p>
              <p className="text-xs text-steel-500 mt-0.5 flex items-center gap-1">
                <ClipboardList size={11} className="text-steel-400" />
                {pr.code} · Delivered
                {item.delivered_by && ` by ${item.delivered_by}`}
              </p>
            </div>
            <button
              onClick={() =>
                handleReceivePrLine(
                  pr.id,
                  item.id,
                  Number(item.delivered_quantity),
                )
              }
              disabled={processingKey === `pr-${item.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
            >
              <PackageCheck size={14} />
              {processingKey === `pr-${item.id}`
                ? "Confirming..."
                : "Confirm Receipt"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
