// /src/modules/inventory/components/MovementDrawer.tsx

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listStockMovements,
  updateMovement,
  reverseMovement,
} from "@/services/inventory";
import { X, Printer, Edit2, XCircle, Check, RotateCcw } from "lucide-react";

interface MovementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  movementId: number;
  onReverse: () => void;
}

const MOVEMENT_LABELS: Record<string, string> = {
  receipt: "Receipt",
  issue: "Issue",
  transfer_out: "Transfer Out",
  transfer_in: "Transfer In",
  adjustment: "Adjustment",
};

const MOVEMENT_COLORS: Record<string, string> = {
  receipt: "bg-green-50 text-green-700 border-green-200",
  issue: "bg-amber-50 text-amber-700 border-amber-200",
  transfer_out: "bg-blue-50 text-blue-700 border-blue-200",
  transfer_in: "bg-blue-50 text-blue-700 border-blue-200",
  adjustment: "bg-purple-50 text-purple-700 border-purple-200",
};

const inputClass =
  "w-full border border-steel-300 rounded-lg px-3 py-2 text-sm";

export function MovementDrawer({
  isOpen,
  onClose,
  movementId,
  onReverse,
}: MovementDrawerProps) {
  const [showConfirmReverse, setShowConfirmReverse] = useState(false);
  const [reverseNote, setReverseNote] = useState("");
  const [reversing, setReversing] = useState(false);
  const [reverseError, setReverseError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const { data: movements, reload } = useFetch(() => listStockMovements());
  const movement = movements?.find((m) => m.id === movementId);

  useEffect(() => {
    if (isOpen) {
      setShowConfirmReverse(false);
      setReverseNote("");
      setReverseError("");
      setIsEditing(false);
      setEditError("");
    }
  }, [isOpen, movementId]);

  useEffect(() => {
    if (movement) {
      setEditReference(movement.reference);
      setEditNotes(movement.notes);
    }
  }, [movement?.id, movement?.reference, movement?.notes]);

  if (!isOpen) return null;
  if (!movement) return null;

  const color =
    MOVEMENT_COLORS[movement.movement_type] || MOVEMENT_COLORS.receipt;
  const label =
    MOVEMENT_LABELS[movement.movement_type] || movement.movement_type;

  async function handleSaveEdit() {
    setSaving(true);
    setEditError("");
    try {
      await updateMovement(movementId, {
        reference: editReference,
        notes: editNotes,
      });
      await reload();
      setIsEditing(false);
    } catch (err: any) {
      setEditError(
        err?.response?.data?.detail || "Couldn't save those changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmReverse() {
    setReversing(true);
    setReverseError("");
    try {
      await reverseMovement(movementId, reverseNote);
      onReverse();
      onClose();
    } catch (err: any) {
      setReverseError(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "That movement couldn't be reversed.",
      );
    } finally {
      setReversing(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 print:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto print:static print:shadow-none print:max-w-full">
        <div className="sticky top-0 bg-white border-b border-steel-200/50 p-4 flex items-center justify-between z-10 print:hidden">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full border ${color}`}
            >
              {label}
            </span>
            {movement.is_reversal && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-steel-100 text-steel-600">
                Reversal
              </span>
            )}
            {movement.is_reversed && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                Reversed
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Movement Details */}
          <div>
            <h2 className="text-xl font-semibold text-steel-900">
              Movement #{movement.id}
            </h2>
            <p className="text-sm text-steel-500 mt-1">
              {new Date(movement.created_at).toLocaleString()}
            </p>
          </div>

          {movement.is_reversal && (
            <div className="bg-steel-50 border border-steel-200 rounded-lg p-3 text-sm text-steel-600">
              This is a reversal of movement #{movement.reverses}.
            </div>
          )}

          {/* Detail Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Item
              </p>
              <p className="text-sm font-medium text-steel-900 mt-1">
                {movement.item_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Quantity
              </p>
              <p className="text-sm font-medium text-steel-900 mt-1">
                {Number(movement.quantity).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Warehouse
              </p>
              <p className="text-sm font-medium text-steel-900 mt-1">
                {movement.warehouse_name}
              </p>
              {movement.related_warehouse_name && (
                <p className="text-xs text-steel-500">
                  → {movement.related_warehouse_name}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Reference
              </p>
              {isEditing ? (
                <input
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              ) : (
                <p className="text-sm font-medium text-steel-900 mt-1">
                  {movement.reference || "—"}
                </p>
              )}
            </div>

            {movement.budget_line_title && (
              <div>
                <p className="text-xs text-steel-500 uppercase tracking-wide">
                  Charged to Budget Line
                </p>
                <p className="text-sm font-medium text-steel-900 mt-1">
                  {movement.budget_line_title}
                  {movement.unit_cost &&
                    ` — KES ${Number(movement.unit_cost).toLocaleString()}/unit`}
                </p>
              </div>
            )}
          </div>

          {/* People */}
          <div className="bg-steel-50/50 rounded-lg p-4 space-y-2">
            <p className="text-xs text-steel-500 uppercase tracking-wide">
              Performed By
            </p>
            <p className="text-sm text-steel-900">
              {movement.performed_by_name || "—"}
            </p>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-steel-500 uppercase tracking-wide mb-1">
              Notes
            </p>
            {isEditing ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className={inputClass}
                rows={3}
              />
            ) : movement.notes ? (
              <p className="text-sm text-steel-700 p-3 bg-steel-50 rounded-lg">
                {movement.notes}
              </p>
            ) : (
              <p className="text-sm text-steel-400">No notes.</p>
            )}
          </div>

          {isEditing && (
            <div className="print:hidden">
              {editError && (
                <p className="text-sm text-red-600 mb-2">{editError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Check size={16} />
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditReference(movement.reference);
                    setEditNotes(movement.notes);
                    setEditError("");
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Audit Timeline */}
          <div>
            <p className="text-xs text-steel-500 uppercase tracking-wide mb-3">
              Audit Timeline
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm text-steel-900">
                    {movement.performed_by_name || "System"} created{" "}
                    {label.toLowerCase()}
                  </p>
                  <p className="text-xs text-steel-500">
                    {new Date(movement.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="pt-4 border-t border-steel-200/50 space-y-2 print:hidden">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>

              {movement.is_reversed ? (
                <div className="flex items-center gap-2 p-3 bg-steel-50 rounded-lg border border-steel-200 text-sm text-steel-500">
                  <RotateCcw size={16} />
                  This movement has already been reversed.
                </div>
              ) : !movement.can_reverse ? (
                <div className="flex items-center gap-2 p-3 bg-steel-50 rounded-lg border border-steel-200 text-sm text-steel-500">
                  <RotateCcw size={16} />A reversal cannot itself be reversed.
                </div>
              ) : showConfirmReverse ? (
                <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700 font-medium">
                    Reverse this movement?
                  </p>
                  <p className="text-xs text-red-600">
                    This creates a new offsetting movement — the original stays
                    in the log unchanged.
                  </p>
                  <input
                    value={reverseNote}
                    onChange={(e) => setReverseNote(e.target.value)}
                    placeholder="Optional reason (e.g. 'entered wrong warehouse')"
                    className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  {reverseError && (
                    <p className="text-xs text-red-600">{reverseError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmReverse}
                      disabled={reversing}
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {reversing ? "Reversing..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setShowConfirmReverse(false)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-steel-300 text-steel-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmReverse(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <XCircle size={16} />
                  Reverse Movement
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
