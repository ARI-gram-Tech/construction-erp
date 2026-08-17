// frontend/src/modules/projects/ProjectInventory/components/RequestRestockModal.tsx
import { useState } from "react";
import { X, Truck } from "lucide-react";
import { createRestockRequest } from "@/services/inventory";
import type { StockItem } from "@/types/inventory";

interface RequestRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
  items: StockItem[];
}

export function RequestRestockModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  items,
}: RequestRestockModalProps) {
  const [itemId, setItemId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function resetAndClose() {
    setItemId("");
    setQuantity("");
    setNotes("");
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId) {
      setError("Pick an item.");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await createRestockRequest({
        project: projectId,
        item: itemId,
        quantity_requested: qty,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      resetAndClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "Couldn't submit the request — try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-steel-200/50">
          <h2 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
            <Truck size={16} className="text-orange-500" />
            Request Restock
          </h2>
          <button
            onClick={resetAndClose}
            className="p-1 rounded-lg hover:bg-steel-100 text-steel-400"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-steel-500">
            Ask for more of something your store is already carrying. Main Store
            Manager will review and send it over.
          </p>

          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1">
              Item
            </label>
            <select
              value={itemId}
              onChange={(e) => setItemId(Number(e.target.value) || "")}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">Select an item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1">
              Quantity needed
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. need it by Friday"
              rows={2}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
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
              disabled={submitting}
              className="px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40"
            >
              {submitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
