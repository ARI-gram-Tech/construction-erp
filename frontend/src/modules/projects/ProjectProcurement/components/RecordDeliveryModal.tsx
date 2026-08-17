// modules/projects/ProjectProcurement/components/RecordDeliveryModal.tsx
import { useState } from "react";
import { X, Truck } from "lucide-react";
import { recordDelivery } from "@/services/purchaseRequests";
import type {
  PurchaseRequest,
  RecordDeliveryPayload,
} from "@/types/purchaseRequest";

interface RecordDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
  pr: PurchaseRequest;
}

interface LineState {
  itemId: number;
  description: string;
  unit: string;
  // What was actually authorized — the sensible ceiling to pre-fill,
  // since delivered shouldn't normally exceed what was approved.
  approvedQuantity: number | null;
  quantity: string;
}

export function RecordDeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  pr,
}: RecordDeliveryModalProps) {
  // Only lines not yet received are eligible — once received_quantity
  // is set, the receipt already locked in against whatever
  // delivered_quantity was at that moment; re-editing delivery here
  // wouldn't retroactively change stock that's already moved.
  const eligibleItems = pr.items.filter(
    (item) => item.received_quantity === null,
  );

  const [lines, setLines] = useState<LineState[]>(
    eligibleItems.map((item) => ({
      itemId: item.id,
      description: item.description,
      unit: item.unit,
      approvedQuantity:
        item.approved_quantity !== null ? Number(item.approved_quantity) : null,
      // Pre-fill with any existing delivered_quantity (correcting a
      // prior entry) or fall back to what was approved.
      quantity:
        item.delivered_quantity !== null
          ? String(item.delivered_quantity)
          : item.approved_quantity !== null
            ? String(item.approved_quantity)
            : "",
    })),
  );
  const [deliveredBy, setDeliveredBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function updateLineQuantity(itemId: number, value: string) {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, quantity: value } : l)),
    );
  }

  function resetAndClose() {
    setDeliveredBy("");
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload: RecordDeliveryPayload[] = [];
    for (const line of lines) {
      const qty = Number(line.quantity);
      if (!line.quantity.trim()) continue; // leaving a line blank skips it, not zero
      if (!qty || qty <= 0) {
        setError(`"${line.description}": enter a quantity greater than zero.`);
        return;
      }
      payload.push({
        id: line.itemId,
        delivered_quantity: qty,
        delivered_by: deliveredBy.trim() || undefined,
      });
    }

    if (payload.length === 0) {
      setError("Enter a delivered quantity for at least one item.");
      return;
    }

    setSubmitting(true);
    try {
      await recordDelivery(projectId, pr.id, payload);
      onSuccess();
      resetAndClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "Couldn't record delivery — try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-steel-200/50">
          <h2 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
            <Truck size={16} className="text-orange-500" />
            Record Delivery — {pr.code}
          </h2>
          <button
            onClick={resetAndClose}
            className="p-1 rounded-lg hover:bg-steel-100 text-steel-400"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-steel-500">
            What the supplier's delivery note says arrived. This doesn't move
            stock yet — the site store confirms receipt separately once it
            physically lands.
          </p>

          {eligibleItems.length === 0 ? (
            <p className="text-sm text-steel-500 py-4 text-center">
              Every line on this request has already been received.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line) => (
                <div
                  key={line.itemId}
                  className="border border-steel-200 rounded-lg p-3"
                >
                  <p className="text-sm font-medium text-steel-900">
                    {line.description}
                  </p>
                  {line.approvedQuantity !== null && (
                    <p className="text-xs text-steel-400 mb-2">
                      Approved: {line.approvedQuantity} {line.unit}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLineQuantity(line.itemId, e.target.value)
                      }
                      placeholder="Quantity delivered"
                      className="flex-1 border border-steel-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <span className="text-xs text-steel-500 w-16">
                      {line.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1">
              Delivered by (optional)
            </label>
            <input
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              placeholder="e.g. Bamburi Cement driver, plate KDA 123X"
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-steel-400 mt-1">
              Applied to every line entered above.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || eligibleItems.length === 0}
              className="px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40"
            >
              {submitting ? "Saving..." : "Record Delivery"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
