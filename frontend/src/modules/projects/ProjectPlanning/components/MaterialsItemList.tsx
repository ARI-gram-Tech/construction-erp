// frontend/src/modules/projects/ProjectPlanning/components/MaterialsItemList.tsx
//
// Materials-specific item list — same submit/approve/request-changes
// pattern as RequirementItemList, but keeps the catalog picker +
// "request new catalog item" flow that used to live directly in
// ActivityDrawer's Materials tab.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Search,
  ChevronDown,
  Send,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";
import {
  listActivityMaterials,
  addActivityMaterial,
  removeActivityMaterial,
  submitActivityMaterial,
  approveActivityMaterial,
  requestActivityMaterialChanges,
} from "@/services/planning";
import { listStockItems } from "@/services/inventory";
import { useFetch } from "@/hooks/useFetch";
import type { RequirementItemReviewStatus } from "@/types/planning";

interface MaterialsItemListProps {
  projectId: number;
  activityId: number;
  canAdd: boolean;
  canReview: boolean;
  currentUserId?: number;
  onReload: () => void; // bubbles up to refresh the group's item_count/status
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

export function MaterialsItemList({
  projectId,
  activityId,
  canAdd,
  canReview,
  currentUserId,
  onReload,
}: MaterialsItemListProps) {
  const { data: materials, reload: reloadMaterials } = useFetch(
    () => listActivityMaterials(projectId, activityId),
    [projectId, activityId],
  );
  const { data: stockItems } = useFetch(() => listStockItems());

  const [newItemId, setNewItemId] = useState<number | "">("");
  const [newItemQty, setNewItemQty] = useState("");
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestUnit, setRequestUnit] = useState("");
  const [requestCategory, setRequestCategory] = useState("other");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [changesFormFor, setChangesFormFor] = useState<number | null>(null);
  const [changesNote, setChangesNote] = useState("");
  const [error, setError] = useState("");

  const materialButtonRef = useRef<HTMLButtonElement>(null);
  const materialMenuRef = useRef<HTMLDivElement>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 320 });

  const toggleMaterialPicker = () => {
    if (!showMaterialPicker && materialButtonRef.current) {
      const rect = materialButtonRef.current.getBoundingClientRect();
      setPickerPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 320),
      });
    }
    setShowMaterialPicker((v) => !v);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        materialButtonRef.current &&
        !materialButtonRef.current.contains(target) &&
        materialMenuRef.current &&
        !materialMenuRef.current.contains(target)
      ) {
        setShowMaterialPicker(false);
      }
    }
    if (showMaterialPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMaterialPicker]);

  const selectedStockItem = stockItems?.find((item) => item.id === newItemId);
  const filteredStockItems = (stockItems ?? []).filter((item) => {
    const q = materialSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)
    );
  });

  function reload() {
    reloadMaterials();
    onReload();
  }

  async function handleAddMaterial() {
    if (!newItemId || !newItemQty) return;
    await addActivityMaterial(projectId, activityId, {
      item: Number(newItemId),
      quantity_required: Number(newItemQty),
    });
    setNewItemId("");
    setNewItemQty("");
    reload();
  }

  async function handleRequestNewMaterial() {
    if (!materialSearch.trim() || !newItemQty) return;
    setSubmittingRequest(true);
    try {
      await addActivityMaterial(projectId, activityId, {
        quantity_required: Number(newItemQty),
        new_item_name: materialSearch.trim(),
        new_item_unit: requestUnit.trim(),
        new_item_category: requestCategory,
      });
      setMaterialSearch("");
      setNewItemQty("");
      setRequestUnit("");
      setRequestCategory("other");
      setShowRequestForm(false);
      setShowMaterialPicker(false);
      reload();
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleRemoveMaterial(id: number) {
    setBusyId(id);
    try {
      await removeActivityMaterial(projectId, activityId, id);
      reload();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Couldn't remove this material — it may already be requested or fulfilled.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit(id: number) {
    setBusyId(id);
    try {
      await submitActivityMaterial(projectId, activityId, id);
      reload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't submit that item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id: number) {
    setBusyId(id);
    try {
      await approveActivityMaterial(projectId, activityId, id);
      reload();
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
      await requestActivityMaterialChanges(
        projectId,
        activityId,
        id,
        changesNote.trim(),
      );
      setChangesFormFor(null);
      setChangesNote("");
      reload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't request changes.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {canAdd && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              ref={materialButtonRef}
              onClick={toggleMaterialPicker}
              className="w-full flex items-center justify-between gap-2 border border-steel-300 rounded-lg px-3 py-2 text-sm bg-white hover:bg-steel-50 transition-colors"
            >
              <span
                className={`truncate ${selectedStockItem ? "text-steel-900" : "text-steel-400"}`}
              >
                {selectedStockItem
                  ? `${selectedStockItem.code} — ${selectedStockItem.name} (${selectedStockItem.unit})`
                  : "Select material..."}
              </span>
              <ChevronDown
                size={16}
                className={`text-steel-400 shrink-0 transition-transform ${showMaterialPicker ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          <input
            type="number"
            placeholder="Qty"
            value={newItemQty}
            onChange={(e) => setNewItemQty(e.target.value)}
            className="w-24 border border-steel-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddMaterial}
            className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
          >
            <Plus size={18} />
          </button>
        </div>
      )}

      {showMaterialPicker &&
        createPortal(
          <div
            ref={materialMenuRef}
            style={{
              position: "absolute",
              top: pickerPos.top,
              left: pickerPos.left,
              width: pickerPos.width,
            }}
            className="bg-white border border-steel-200 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-steel-100">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-400"
                />
                <input
                  autoFocus
                  type="text"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder="Search materials..."
                  className="w-full border border-steel-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredStockItems.length > 0 ? (
                filteredStockItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setNewItemId(item.id);
                      setShowMaterialPicker(false);
                      setMaterialSearch("");
                      setShowRequestForm(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${
                      item.id === newItemId
                        ? "bg-orange-50 text-orange-700 font-medium"
                        : "text-steel-700"
                    }`}
                  >
                    {item.code} — {item.name} ({item.unit})
                  </button>
                ))
              ) : materialSearch.trim() ? (
                <div className="p-3">
                  <p className="text-sm text-steel-500 text-center mb-2">
                    No materials match "{materialSearch}"
                  </p>
                  {!showRequestForm ? (
                    <button
                      type="button"
                      onClick={() => setShowRequestForm(true)}
                      className="w-full text-center text-sm font-medium text-orange-600 hover:text-orange-700 py-1.5"
                    >
                      + Request "{materialSearch}" be added to the catalog
                    </button>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-steel-100">
                      <p className="text-xs text-steel-500">
                        Not in the catalog yet — this goes to Main Store Manager
                        for review.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Unit (e.g. pieces)"
                          value={requestUnit}
                          onChange={(e) => setRequestUnit(e.target.value)}
                          className="border border-steel-200 rounded-lg px-2 py-1.5 text-sm"
                        />
                        <select
                          value={requestCategory}
                          onChange={(e) => setRequestCategory(e.target.value)}
                          className="border border-steel-200 rounded-lg px-2 py-1.5 text-sm"
                        >
                          <option value="materials">Building Materials</option>
                          <option value="electrical">Electrical</option>
                          <option value="plumbing">Plumbing</option>
                          <option value="tools">Tools</option>
                          <option value="safety">Safety Equipment</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <input
                        type="number"
                        placeholder="Quantity needed"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        className="w-full border border-steel-200 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleRequestNewMaterial}
                        disabled={submittingRequest || !newItemQty}
                        className="w-full text-sm font-medium bg-orange-500 text-white rounded-lg py-1.5 disabled:opacity-50"
                      >
                        {submittingRequest ? "Submitting..." : "Submit Request"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="px-3 py-4 text-sm text-steel-400 text-center">
                  Start typing to search materials...
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="divide-y divide-steel-100 border border-steel-200/60 rounded-lg bg-white">
        {materials && materials.length > 0 ? (
          materials.map((m) => {
            const isOwn = m.created_by === currentUserId;
            const canRemove =
              (m.status === "pending" || m.is_pending_catalog) &&
              m.review_status === "draft" &&
              (isOwn || canAdd);
            const canSubmitItem =
              (m.review_status === "draft" ||
                m.review_status === "changes_requested") &&
              !m.is_pending_catalog &&
              (isOwn || canAdd);

            return (
              <div key={m.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-steel-900">
                      {m.is_pending_catalog
                        ? m.pending_request_name
                        : m.item_name}{" "}
                      × {m.quantity_required} {m.item_unit || ""}
                    </p>
                    {m.is_pending_catalog ? (
                      <p className="text-xs">
                        {m.pending_request_status === "rejected" ? (
                          <span className="text-red-500">
                            Catalog request declined
                          </span>
                        ) : (
                          <span className="text-amber-600">
                            Awaiting catalog approval
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-steel-500 capitalize">
                        {m.status}
                        {m.purchase_request_code &&
                          ` · ${m.purchase_request_code}`}
                      </p>
                    )}
                    {m.revision_number > 1 && (
                      <p className="text-xs text-steel-400 flex items-center gap-1 mt-0.5">
                        <History size={11} />
                        Revision {m.revision_number}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!m.is_pending_catalog && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${REVIEW_STATUS_COLOR[m.review_status]}`}
                      >
                        {REVIEW_STATUS_LABEL[m.review_status]}
                      </span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMaterial(m.id)}
                        disabled={busyId === m.id}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {canSubmitItem && (
                    <button
                      onClick={() => handleSubmit(m.id)}
                      disabled={busyId === m.id}
                      className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                    >
                      <Send size={12} />
                      Submit
                    </button>
                  )}
                  {canReview && m.review_status === "submitted" && (
                    <>
                      <button
                        onClick={() => handleApprove(m.id)}
                        disabled={busyId === m.id}
                        className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                      {changesFormFor !== m.id && (
                        <button
                          onClick={() => setChangesFormFor(m.id)}
                          className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          <XCircle size={12} />
                          Request Changes
                        </button>
                      )}
                    </>
                  )}
                </div>

                {changesFormFor === m.id && (
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
                        onClick={() => handleRequestChanges(m.id)}
                        disabled={busyId === m.id || !changesNote.trim()}
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
            No materials added yet.
          </p>
        )}
      </div>
    </div>
  );
}
