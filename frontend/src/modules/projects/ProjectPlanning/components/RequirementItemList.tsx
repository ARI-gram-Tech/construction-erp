// frontend/src/modules/projects/ProjectPlanning/components/RequirementItemList.tsx
//
// Shared item-list UI for Labour, Equipment, Tools, PPE, and Services —
// these five share the same shape (one primary text field + quantity +
// notes; Equipment additionally has two dates). Materials is NOT covered
// here — it has its own catalog-picker/pending-request flow in
// ActivityDrawer and stays separate.
//
// The parent supplies the actual API calls as props, so this component
// has zero knowledge of which endpoint it's talking to.
//
// Per-item actions on each row are Assign / Edit / Submit:
//  - Submit is fully wired (submits a draft/changes-requested item for
//    review).
//  - Edit and Assign only render if the parent passes onEdit / onAssign.
//    Neither has a backing endpoint in services/planning.ts yet — add
//    updateActivityLabour-style calls there (and thread them through the
//    wrapper components in RequirementGroupTab.tsx) to light these up.

import { useState, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  History,
  X,
  UserPlus,
  Pencil,
} from "lucide-react";
import type { RequirementItemReviewStatus } from "@/types/planning";

export interface RequirementItemListHandle {
  openAdd: () => void;
}

interface BaseItem {
  id: number;
  quantity_required: number;
  notes: string;
  review_status: RequirementItemReviewStatus;
  revision_number: number;
  created_by: number | null;
  assigned_to_name?: string | null;
  required_from?: string | null;
  required_until?: string | null;
  [key: string]: any;
}

interface RequirementItemListProps<T extends BaseItem> {
  items: T[] | null | undefined;
  primaryField: string; // e.g. "role", "equipment_name", "tool_name", "ppe_name", "service_name"
  primaryLabel: string; // e.g. "Role (e.g. Mason)"
  showDates?: boolean; // Equipment only
  canAdd: boolean;
  canReview: boolean; // PM / QS / company manager
  currentUserId?: number;
  // When true, this component doesn't render its own "Add X" button —
  // the group header's single "+" button (RequirementGroupCard) is the
  // add entry point instead. The ref's openAdd() still works either way.
  hideOwnAddButton?: boolean;
  onAdd: (payload: Record<string, any>) => Promise<T>;
  onRemove: (id: number) => Promise<void>;
  onSubmit: (id: number) => Promise<T>;
  onApprove: (id: number) => Promise<T>;
  onRequestChanges: (id: number, note: string) => Promise<T>;
  // Optional — see file header. Omit to hide the corresponding action.
  onEdit?: (id: number, payload: Record<string, any>) => Promise<T>;
  onAssign?: (id: number) => void;
  onReload: () => void;
}

const REVIEW_STATUS_COLOR: Record<RequirementItemReviewStatus, string> = {
  draft: "bg-steel-100 text-steel-600",
  submitted: "bg-amber-50 text-amber-700",
  changes_requested: "bg-red-50 text-red-700",
  approved: "bg-green-50 text-green-700",
  cancelled: "bg-steel-100 text-steel-400",
};

const REVIEW_STATUS_LABEL: Record<RequirementItemReviewStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  changes_requested: "Changes Requested",
  approved: "Approved",
  cancelled: "Cancelled",
};

function RequirementItemListInner<T extends BaseItem>(
  {
    items,
    primaryField,
    primaryLabel,
    showDates = false,
    canAdd,
    canReview,
    currentUserId,
    hideOwnAddButton = false,
    onAdd,
    onRemove,
    onSubmit,
    onApprove,
    onRequestChanges,
    onEdit,
    onAssign,
    onReload,
  }: RequirementItemListProps<T>,
  ref: React.Ref<RequirementItemListHandle>,
) {
  const [primaryValue, setPrimaryValue] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [requiredFrom, setRequiredFrom] = useState("");
  const [requiredUntil, setRequiredUntil] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [changesFormFor, setChangesFormFor] = useState<number | null>(null);
  const [changesNote, setChangesNote] = useState("");
  const [error, setError] = useState("");

  useImperativeHandle(ref, () => ({
    openAdd: () => setShowAddModal(true),
  }));

  function openEdit(item: T) {
    setEditingItem(item);
    setPrimaryValue(String(item[primaryField] ?? ""));
    setQty(String(item.quantity_required ?? ""));
    setNotes(item.notes ?? "");
    setRequiredFrom(item.required_from ?? "");
    setRequiredUntil(item.required_until ?? "");
    setShowAddModal(true);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingItem(null);
    setPrimaryValue("");
    setQty("");
    setNotes("");
    setRequiredFrom("");
    setRequiredUntil("");
    setError("");
  }

  async function handleSave() {
    if (!primaryValue.trim() || !qty) return;
    setAdding(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        [primaryField]: primaryValue.trim(),
        quantity_required: Number(qty),
        notes: notes.trim(),
      };
      if (showDates) {
        if (requiredFrom) payload.required_from = requiredFrom;
        if (requiredUntil) payload.required_until = requiredUntil;
      }
      if (editingItem && onEdit) {
        await onEdit(editingItem.id, payload);
      } else {
        await onAdd(payload);
      }
      closeModal();
      onReload();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          `Couldn't ${editingItem ? "save" : "add"} that item.`,
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: number) {
    setBusyId(id);
    try {
      await onRemove(id);
      onReload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't remove that item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(id: number) {
    setBusyId(id);
    try {
      await onSubmit(id);
      onReload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't submit that item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id: number) {
    setBusyId(id);
    try {
      await onApprove(id);
      onReload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't approve that item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRequestChanges(id: number) {
    if (!changesNote.trim()) return;
    setBusyId(id);
    try {
      await onRequestChanges(id, changesNote.trim());
      setChangesFormFor(null);
      setChangesNote("");
      onReload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't request changes.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {canAdd && !hideOwnAddButton && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Plus size={14} />
            Add {primaryLabel.split(" (")[0]}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="divide-y divide-steel-100 border border-steel-200/60 rounded-lg bg-white">
        {items && items.length > 0 ? (
          items.map((item) => {
            const isOwn = item.created_by === currentUserId;
            const canRemove =
              item.review_status === "draft" && (isOwn || canAdd);
            const canSubmitItem =
              (item.review_status === "draft" ||
                item.review_status === "changes_requested") &&
              (isOwn || canAdd);
            const canEditItem =
              !!onEdit &&
              (item.review_status === "draft" ||
                item.review_status === "changes_requested") &&
              (isOwn || canAdd);

            return (
              <div key={item.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-steel-900">
                      {item.quantity_required} × {item[primaryField]}
                    </p>
                    {showDates &&
                      (item.required_from || item.required_until) && (
                        <p className="text-xs text-steel-400">
                          {item.required_from &&
                            new Date(item.required_from).toLocaleDateString()}
                          {item.required_from && item.required_until && " → "}
                          {item.required_until &&
                            new Date(item.required_until).toLocaleDateString()}
                        </p>
                      )}
                    {item.notes && (
                      <p className="text-xs text-steel-500 mt-0.5">
                        {item.notes}
                      </p>
                    )}
                    {item.assigned_to_name && (
                      <p className="text-xs text-steel-400 mt-0.5">
                        Assigned to {item.assigned_to_name}
                      </p>
                    )}
                    {item.revision_number > 1 && (
                      <p className="text-xs text-steel-400 flex items-center gap-1 mt-0.5">
                        <History size={11} />
                        Revision {item.revision_number}
                      </p>
                    )}
                    <span
                      className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${REVIEW_STATUS_COLOR[item.review_status]}`}
                    >
                      {REVIEW_STATUS_LABEL[item.review_status]}
                    </span>
                  </div>

                  {/* Per-item action column: Assign / Edit / Submit,
                      stacked to match the sketch. Remove stays as a
                      small trash icon alongside them rather than a
                      fourth stacked label. */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {onAssign && (isOwn || canAdd) && (
                      <button
                        onClick={() => onAssign(item.id)}
                        className="flex items-center gap-1 text-xs font-medium text-steel-600 hover:text-orange-600"
                      >
                        <UserPlus size={12} />
                        Assign
                      </button>
                    )}
                    {canEditItem && (
                      <button
                        onClick={() => openEdit(item)}
                        className="flex items-center gap-1 text-xs font-medium text-steel-600 hover:text-orange-600"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    )}
                    {canSubmitItem && (
                      <button
                        onClick={() => handleSubmit(item.id)}
                        disabled={busyId === item.id}
                        className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                      >
                        <Send size={12} />
                        Submit
                      </button>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={busyId === item.id}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {canReview && item.review_status === "submitted" && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={busyId === item.id}
                      className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} />
                      Approve
                    </button>
                    {changesFormFor !== item.id ? (
                      <button
                        onClick={() => setChangesFormFor(item.id)}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <XCircle size={12} />
                        Request Changes
                      </button>
                    ) : null}
                  </div>
                )}

                {changesFormFor === item.id && (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      value={changesNote}
                      onChange={(e) => setChangesNote(e.target.value)}
                      placeholder="What needs to change?"
                      className="w-full border border-steel-200 rounded-lg px-3 py-1.5 text-xs"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestChanges(item.id)}
                        disabled={busyId === item.id || !changesNote.trim()}
                        className="flex-1 text-xs font-medium bg-red-600 text-white rounded-lg py-1.5 disabled:opacity-50"
                      >
                        Send
                      </button>
                      <button
                        onClick={() => setChangesFormFor(null)}
                        className="flex-1 text-xs font-medium border border-steel-200 rounded-lg py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="p-4 text-sm text-steel-500 text-center">
            No items added yet.
          </p>
        )}
      </div>

      {/* Add/Edit modal — same form serves both, switching title and
          submit label based on whether editingItem is set. */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-steel-200/50">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-base font-semibold text-steel-900">
                  {editingItem ? "Edit" : "Add"} {primaryLabel.split(" (")[0]}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1 rounded hover:bg-steel-100 text-steel-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-steel-600 block mb-1.5">
                    {primaryLabel}
                  </label>
                  <input
                    value={primaryValue}
                    onChange={(e) => setPrimaryValue(e.target.value)}
                    className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-steel-600 block mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {showDates && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-steel-600 block mb-1.5">
                        Required from
                      </label>
                      <input
                        type="date"
                        value={requiredFrom}
                        onChange={(e) => setRequiredFrom(e.target.value)}
                        className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-steel-600 block mb-1.5">
                        Required until
                      </label>
                      <input
                        type="date"
                        value={requiredUntil}
                        onChange={(e) => setRequiredUntil(e.target.value)}
                        className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-steel-600 block mb-1.5">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={adding || !primaryValue.trim() || !qty}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    {adding
                      ? editingItem
                        ? "Saving..."
                        : "Adding..."
                      : editingItem
                        ? "Save Changes"
                        : "Add Item"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// forwardref + generics needs this cast — ts can't infer a generic type
// param through forwardref directly, so requirementitemlistinner keeps
// the real generic signature and this wrapper preserves it on export.
export const RequirementItemList = forwardRef(RequirementItemListInner) as <
  T extends BaseItem,
>(
  props: RequirementItemListProps<T> & {
    ref?: React.Ref<RequirementItemListHandle>;
  },
) => ReturnType<typeof RequirementItemListInner>;
