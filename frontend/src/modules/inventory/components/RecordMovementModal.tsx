// /src/modules/inventory/components/RecordMovementModal.tsx

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  receiveStock,
  issueStock,
  transferStock,
  adjustStock,
} from "@/services/inventory";
import { listProjectBudgets, listBudgetLines } from "@/services/budget";
import type { BudgetLine } from "@/types/budget";
import type { StockItem, Warehouse } from "@/types/inventory";

export type MovementKind = "receive" | "issue" | "transfer" | "adjust";

interface RecordMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: StockItem[];
  warehouses: Warehouse[];
  presetItemId?: number;
  presetWarehouseId?: number;
  initialKind?: MovementKind;
}

const inputClass =
  "w-full border border-steel-300 rounded-lg px-3 py-2 text-sm";

const COLOR_MAP: Record<
  MovementKind,
  { bg: string; border: string; text: string }
> = {
  receive: {
    bg: "bg-green-50",
    border: "border-green-500",
    text: "text-green-700",
  },
  issue: {
    bg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
  },
  transfer: {
    bg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-700",
  },
  adjust: {
    bg: "bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-700",
  },
};

export function RecordMovementModal({
  isOpen,
  onClose,
  onSuccess,
  items,
  warehouses,
  presetItemId,
  presetWarehouseId,
  initialKind = "receive",
}: RecordMovementModalProps) {
  const [kind, setKind] = useState<MovementKind>(initialKind);
  const [itemId, setItemId] = useState<number | "">(presetItemId ?? "");
  const [warehouseId, setWarehouseId] = useState<number | "">(
    presetWarehouseId ?? "",
  );
  const [toWarehouseId, setToWarehouseId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const isSubmittingRef = useRef(false);

  // Budget-line charge — only relevant for 'issue', and only once a
  // project-linked warehouse is selected (Main Warehouse has no project
  // budget to charge against).
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [budgetLineId, setBudgetLineId] = useState<number | "">("");
  const [unitCost, setUnitCost] = useState("");
  const [loadingBudgetLines, setLoadingBudgetLines] = useState(false);

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
  const showBudgetSection = kind === "issue" && !!selectedWarehouse?.project;

  useEffect(() => {
    let cancelled = false;
    async function loadLines() {
      if (!showBudgetSection || !selectedWarehouse?.project) {
        setBudgetLines([]);
        return;
      }
      setLoadingBudgetLines(true);
      try {
        const budgets = await listProjectBudgets(selectedWarehouse.project);
        // Prefer an approved budget over a draft one — locked budgets still
        // track actuals fine, they just can't have their approved_amount
        // edited, which doesn't affect issuing against them here.
        const active = budgets.find((b) => b.status !== "draft") ?? budgets[0];
        if (!active) {
          if (!cancelled) setBudgetLines([]);
          return;
        }
        const lines = await listBudgetLines(
          selectedWarehouse.project,
          active.id,
        );
        if (!cancelled) setBudgetLines(lines);
      } catch {
        if (!cancelled) setBudgetLines([]);
      } finally {
        if (!cancelled) setLoadingBudgetLines(false);
      }
    }
    loadLines();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBudgetSection, selectedWarehouse?.project]);

  useEffect(() => {
    if (isOpen) {
      setKind(initialKind);
      setItemId(presetItemId ?? "");
      setWarehouseId(presetWarehouseId ?? "");
      setToWarehouseId("");
      setQuantity("");
      setReference("");
      setNotes("");
      setFormError("");
      setBudgetLineId("");
      setUnitCost("");
      isSubmittingRef.current = false;
    }
  }, [isOpen, presetItemId, presetWarehouseId, initialKind]);

  if (!isOpen) return null;

  function reset() {
    setKind(initialKind);
    setItemId(presetItemId ?? "");
    setWarehouseId(presetWarehouseId ?? "");
    setToWarehouseId("");
    setQuantity("");
    setReference("");
    setNotes("");
    setFormError("");
    setBudgetLineId("");
    setUnitCost("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (isSubmittingRef.current) return;

    if (!itemId || !warehouseId || !quantity) {
      setFormError("Item, warehouse, and quantity are required.");
      return;
    }
    if (!reference.trim()) {
      setFormError(
        "A reference is required for accountability (e.g. delivery note, invoice #, requester name).",
      );
      return;
    }
    if (kind === "transfer" && !toWarehouseId) {
      setFormError("Choose a destination warehouse.");
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      if (kind === "receive") {
        await receiveStock({
          item: Number(itemId),
          warehouse: Number(warehouseId),
          quantity: Number(quantity),
          reference,
          notes,
        });
      } else if (kind === "issue") {
        await issueStock({
          item: Number(itemId),
          warehouse: Number(warehouseId),
          quantity: Number(quantity),
          reference,
          notes,
          budget_line: budgetLineId || undefined,
          unit_cost: unitCost ? Number(unitCost) : undefined,
        });
      } else if (kind === "transfer") {
        await transferStock({
          item: Number(itemId),
          from_warehouse: Number(warehouseId),
          to_warehouse: Number(toWarehouseId),
          quantity: Number(quantity),
          reference,
          notes,
        });
      } else {
        await adjustStock({
          item: Number(itemId),
          warehouse: Number(warehouseId),
          new_quantity: Number(quantity),
          reference,
          notes,
        });
      }
      onSuccess();
      onClose();
      reset();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "That action couldn't be completed.",
      );
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }

  const quantityLabel =
    kind === "adjust" ? "New quantity (corrected count)" : "Quantity";

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-steel-200/50">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-steel-900">
            Record Stock Movement
          </h2>
          <button
            onClick={() => {
              onClose();
              reset();
            }}
            className="p-1 rounded hover:bg-steel-100 text-steel-400"
          >
            <X size={18} />
          </button>
        </div>

        {formError && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Movement type buttons with colors */}
          <div className="grid grid-cols-4 gap-1.5">
            {(["receive", "issue", "transfer", "adjust"] as MovementKind[]).map(
              (k) => {
                const c = COLOR_MAP[k];
                const isActive = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`px-2 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${
                      isActive
                        ? `${c.bg} ${c.text} ${c.border}`
                        : "border-steel-300 text-steel-600 hover:bg-steel-50"
                    }`}
                  >
                    {k}
                  </button>
                );
              },
            )}
          </div>

          <select
            value={itemId}
            onChange={(e) => setItemId(Number(e.target.value))}
            disabled={!!presetItemId}
            className={`${inputClass} disabled:bg-steel-100`}
            required
          >
            <option value="">Select item...</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} — {i.name} ({i.unit})
              </option>
            ))}
          </select>

          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(Number(e.target.value))}
            disabled={!!presetWarehouseId}
            className={`${inputClass} disabled:bg-steel-100`}
            required
          >
            <option value="">
              {kind === "transfer" ? "From warehouse..." : "Warehouse..."}
            </option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {kind === "transfer" && (
            <select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(Number(e.target.value))}
              className={inputClass}
              required
            >
              <option value="">To warehouse...</option>
              {warehouses
                .filter((w) => w.id !== warehouseId)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          )}

          {showBudgetSection && (
            <div className="space-y-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
              <label className="block">
                <span className="block text-xs font-medium text-steel-600 mb-1">
                  Charge to budget line (optional)
                </span>
                <select
                  value={budgetLineId}
                  onChange={(e) =>
                    setBudgetLineId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  className={inputClass}
                  disabled={loadingBudgetLines}
                >
                  <option value="">
                    {loadingBudgetLines
                      ? "Loading budget lines..."
                      : budgetLines.length === 0
                        ? "No budget set up for this project"
                        : "Don't track against a budget line"}
                  </option>
                  {budgetLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.title} — remaining KES{" "}
                      {Number(line.remaining).toLocaleString()}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-steel-400 mt-1">
                  If set, this issue's cost is recorded against that line's
                  actual spend immediately.
                </span>
              </label>

              {budgetLineId && (
                <label className="block">
                  <span className="block text-xs font-medium text-steel-600 mb-1">
                    Unit cost (KES per unit — falls back to the item's standard
                    cost if left blank)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
            </div>
          )}

          <label className="block">
            <span className="block text-xs font-medium text-steel-600 mb-1">
              {quantityLabel}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-steel-600 mb-1">
              Reference *
              <span className="text-steel-400 font-normal ml-1">
                (delivery note, invoice #, or requester — required for
                accountability)
              </span>
            </span>
            <input
              placeholder="e.g. Delivery note #1042, or 'Site engineer J. Wanga'"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            rows={2}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                reset();
              }}
              className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50`}
            >
              {submitting ? "Saving..." : "Record"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
