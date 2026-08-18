// frontend/src/modules/procurement/components/ManualLPOModal.tsx
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { listProjects } from "@/services/projects";
import { createManualLPO } from "@/services/lpo";
import type { LPOItemInput } from "@/types/lpo";
import { SupplierPicker } from "./SupplierPicker";
import { Plus, Trash2, Upload, X } from "lucide-react";

interface ManualLPOModalProps {
  onClose: () => void;
  onCreated: (lpoId: number) => void;
  presetProjectId?: number;
  presetPurchaseRequestId?: number;
}

const EMPTY_ITEM: LPOItemInput = {
  description: "",
  quantity: 0,
  unit: "",
  rate: 0,
};

export function ManualLPOModal({
  onClose,
  onCreated,
  presetProjectId,
  presetPurchaseRequestId,
}: ManualLPOModalProps) {
  const { data: projects } = useFetch(() => listProjects());

  const [supplierId, setSupplierId] = useState<number | "">("");
  const [projectId, setProjectId] = useState<number | "">(
    presetProjectId ?? "",
  );
  const [items, setItems] = useState<LPOItemInput[]>([{ ...EMPTY_ITEM }]);
  const [vatApplicable, setVatApplicable] = useState(true);
  const [vatPercent, setVatPercent] = useState(16);
  const [sourceDocument, setSourceDocument] = useState<File | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateItem(index: number, patch: Partial<LPOItemInput>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.rate || 0),
    0,
  );
  const vatAmount = vatApplicable ? subtotal * (vatPercent / 100) : 0;
  const total = subtotal + vatAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!supplierId || !projectId) {
      setError("Supplier and project are required.");
      return;
    }
    const validItems = items.filter((it) => it.description.trim());
    if (validItems.length === 0) {
      setError("Add at least one item.");
      return;
    }

    setSaving(true);
    try {
      const lpo = await createManualLPO({
        supplier: Number(supplierId),
        project: Number(projectId),
        items: validItems,
        vat_applicable: vatApplicable,
        vat_percent: vatPercent,
        purchase_request: presetPurchaseRequestId,
        source_document: sourceDocument,
        already_signed: alreadySigned,
      });
      onCreated(lpo.id);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Couldn't record this LPO. Check the fields and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-steel-100">
          <div>
            <h3 className="text-lg font-semibold text-steel-900">
              Record an LPO
            </h3>
            <p className="text-xs text-steel-500 mt-0.5">
              For a handwritten order, or one issued outside the system — type
              in the details and attach the original if you have it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-steel-500 mb-1 block">
                Supplier
              </label>
              <SupplierPicker value={supplierId} onChange={setSupplierId} />
            </div>
            <div>
              <label className="text-xs text-steel-500 mb-1 block">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) =>
                  setProjectId(e.target.value ? Number(e.target.value) : "")
                }
                disabled={!!presetProjectId}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm disabled:bg-steel-50"
                required
              >
                <option value="">Select a project...</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-steel-500">Items</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
              >
                <Plus size={12} />
                Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(i, { description: e.target.value })
                    }
                    className="flex-1 border border-steel-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) => updateItem(i, { unit: e.target.value })}
                    className="w-20 border border-steel-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity || ""}
                    onChange={(e) =>
                      updateItem(i, { quantity: Number(e.target.value) })
                    }
                    className="w-20 border border-steel-300 rounded-lg px-2 py-1.5 text-sm text-right"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    value={item.rate || ""}
                    onChange={(e) =>
                      updateItem(i, { rate: Number(e.target.value) })
                    }
                    className="w-24 border border-steel-300 rounded-lg px-2 py-1.5 text-sm text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="p-1.5 rounded hover:bg-red-50 text-steel-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-steel-600">
              <input
                type="checkbox"
                checked={vatApplicable}
                onChange={(e) => setVatApplicable(e.target.checked)}
              />
              VAT applicable
            </label>
            {vatApplicable && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={vatPercent}
                  onChange={(e) => setVatPercent(Number(e.target.value))}
                  className="w-16 border border-steel-300 rounded-lg px-2 py-1 text-sm"
                />
                <span className="text-sm text-steel-500">%</span>
              </div>
            )}
          </div>

          <div className="bg-steel-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between text-steel-600">
              <span>Subtotal</span>
              <span>{subtotal.toLocaleString()}</span>
            </div>
            {vatApplicable && (
              <div className="flex justify-between text-steel-600">
                <span>VAT ({vatPercent}%)</span>
                <span>{vatAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-steel-900 pt-1 border-t border-steel-200">
              <span>Total</span>
              <span>{total.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-steel-500 mb-1 block">
              Attach the original document (optional)
            </label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-steel-300 rounded-lg text-sm text-steel-600 cursor-pointer hover:bg-steel-50">
              <Upload size={14} />
              {sourceDocument ? sourceDocument.name : "Choose a photo or PDF"}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => setSourceDocument(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-steel-600">
            <input
              type="checkbox"
              checked={alreadySigned}
              onChange={(e) => setAlreadySigned(e.target.checked)}
            />
            This order is already valid / signed — skip the in-system signature
            step
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-steel-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
            >
              {saving ? "Recording..." : "Record LPO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
