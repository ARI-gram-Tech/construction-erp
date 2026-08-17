// /src/modules/inventory/MovementPage.tsx

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listStockMovements,
  updateMovement,
  reverseMovement,
} from "@/services/inventory";
import type { MovementType } from "@/types/inventory";
import { ArrowLeft, Printer, Edit2, XCircle, Check } from "lucide-react";

const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: "Receipt",
  issue: "Issue",
  transfer_out: "Transfer Out",
  transfer_in: "Transfer In",
  adjustment: "Adjustment",
};

const MOVEMENT_COLORS: Record<MovementType, string> = {
  receipt: "bg-green-50 text-green-700 border-green-200",
  issue: "bg-amber-50 text-amber-700 border-amber-200",
  transfer_out: "bg-blue-50 text-blue-700 border-blue-200",
  transfer_in: "bg-blue-50 text-blue-700 border-blue-200",
  adjustment: "bg-steel-100 text-steel-600 border-steel-200",
};

export function MovementPage() {
  const { movementId } = useParams<{ movementId: string }>();
  const id = Number(movementId);

  const { data: movements, reload } = useFetch(() => listStockMovements());
  const movement = movements?.find((m) => m.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [showConfirmReverse, setShowConfirmReverse] = useState(false);
  const [reverseNote, setReverseNote] = useState("");
  const [reversing, setReversing] = useState(false);
  const [reverseError, setReverseError] = useState("");

  useEffect(() => {
    if (movement) {
      setEditReference(movement.reference);
      setEditNotes(movement.notes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movement?.id]);

  if (!movement) return <div className="text-steel-500">Loading...</div>;

  const color = MOVEMENT_COLORS[movement.movement_type as MovementType];
  const label = MOVEMENT_LABELS[movement.movement_type as MovementType];

  async function handleSaveEdit() {
    if (!movement) return;
    setSaving(true);
    setEditError("");
    try {
      await updateMovement(movement.id, {
        reference: editReference,
        notes: editNotes,
      });
      await reload();
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReverse() {
    if (!movement) return;
    setReversing(true);
    setReverseError("");
    try {
      await reverseMovement(movement.id, reverseNote);
      await reload();
      setShowConfirmReverse(false);
    } catch (err: any) {
      setReverseError(
        err?.response?.data?.detail ||
          err?.response?.data?.[0] ||
          "Could not reverse this movement.",
      );
    } finally {
      setReversing(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="print:hidden">
        <Link
          to="/company/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to Inventory
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm px-3 py-1 rounded-full border ${color}`}>
            {label}
          </span>
          {movement.is_reversal && (
            <span className="text-sm px-3 py-1 rounded-full bg-steel-100 text-steel-600 border border-steel-200">
              Reversal
            </span>
          )}
          {movement.is_reversed && (
            <span className="text-sm px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
              Reversed
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-steel-900 mt-3">
          {movement.item_name}
        </h1>
        <p className="text-steel-500">
          Movement #{movement.id} · {Number(movement.quantity).toLocaleString()}{" "}
          units
        </p>
      </div>

      {/* Movement Details Card */}
      <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Item
              </p>
              <p className="text-sm font-medium text-steel-900">
                {movement.item_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Warehouse
              </p>
              <p className="text-sm font-medium text-steel-900">
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
                Quantity
              </p>
              <p className="text-sm font-medium text-steel-900">
                {Number(movement.quantity).toLocaleString()}
              </p>
            </div>

            {movement.budget_line_title && (
              <div>
                <p className="text-xs text-steel-500 uppercase tracking-wide">
                  Charged to Budget Line
                </p>
                <p className="text-sm font-medium text-steel-900">
                  {movement.budget_line_title}
                  {movement.unit_cost &&
                    ` — KES ${Number(movement.unit_cost).toLocaleString()}/unit`}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Reference
              </p>
              {isEditing ? (
                <input
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className="w-full border border-steel-300 rounded-lg px-2 py-1 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium text-steel-900">
                  {movement.reference || "—"}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Performed By
              </p>
              <p className="text-sm font-medium text-steel-900">
                {movement.performed_by_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-steel-500 uppercase tracking-wide">
                Date & Time
              </p>
              <p className="text-sm font-medium text-steel-900">
                {new Date(movement.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-steel-200/50 p-6">
          <p className="text-xs text-steel-500 uppercase tracking-wide mb-1">
            Notes
          </p>
          {isEditing ? (
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
            />
          ) : movement.notes ? (
            <p className="text-sm text-steel-700">{movement.notes}</p>
          ) : (
            <p className="text-sm text-steel-400">No notes.</p>
          )}
        </div>
      </div>

      {editError && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg print:hidden">
          {editError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 print:hidden">
        {isEditing ? (
          <div className="flex gap-3">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
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
              className="px-4 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
            >
              <Edit2 size={16} />
              Edit
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
            >
              <Printer size={16} />
              Print
            </button>
            {movement.can_reverse && (
              <button
                onClick={() => setShowConfirmReverse(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              >
                <XCircle size={16} />
                Reverse Movement
              </button>
            )}
          </div>
        )}

        {movement.is_reversal && (
          <p className="text-xs text-steel-400">
            Reversal entries can't be reversed.
          </p>
        )}
        {movement.is_reversed && !movement.is_reversal && (
          <p className="text-xs text-steel-400">
            This movement has already been reversed.
          </p>
        )}

        {reverseError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {reverseError}
          </div>
        )}

        {showConfirmReverse && (
          <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200 max-w-md">
            <span className="text-sm text-red-600 block">
              Reverse this movement?
            </span>
            <input
              placeholder="Optional note (why reversing)"
              value={reverseNote}
              onChange={(e) => setReverseNote(e.target.value)}
              className="w-full border border-red-200 rounded-lg px-2 py-1 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReverse}
                disabled={reversing}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {reversing ? "Reversing..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowConfirmReverse(false)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-steel-300 text-steel-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Timeline */}
      <div className="bg-white rounded-xl border border-steel-200/50">
        <div className="p-5 border-b border-steel-200/50">
          <h2 className="text-sm font-semibold text-steel-900">
            Audit Timeline
          </h2>
        </div>
        <div className="divide-y divide-steel-100">
          <div className="p-4 flex items-start gap-3">
            <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500" />
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
          {movement.is_reversed && (
            <div className="p-4 flex items-start gap-3">
              <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-red-500" />
              <p className="text-sm text-steel-900">
                This movement was reversed
              </p>
            </div>
          )}
          {movement.is_reversal && (
            <div className="p-4 flex items-start gap-3">
              <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-steel-400" />
              <p className="text-sm text-steel-900">
                This is a reversal of movement #{movement.reverses}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
