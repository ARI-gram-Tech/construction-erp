// /src/modules/inventory/components/PendingRequestsSection.tsx
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  listPendingStockItemRequests,
  approveStockItemRequests,
  rejectStockItemRequests,
} from "@/services/inventory";
import type { StockCategory } from "@/types/inventory";
import { Check, X, PackagePlus } from "lucide-react";

const CATEGORY_LABELS: Record<StockCategory, string> = {
  materials: "Building Materials",
  electrical: "Electrical",
  plumbing: "Plumbing",
  tools: "Tools",
  safety: "Safety Equipment",
  other: "Other",
};

export function PendingRequestsSection() {
  const {
    data: requests,
    loading,
    error,
    reload,
  } = useFetch(() => listPendingStockItemRequests("pending"));

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [edits, setEdits] = useState<
    Record<number, { name: string; unit: string; category: StockCategory }>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function getEdit(
    id: number,
    fallback: { name: string; unit: string; category: StockCategory },
  ) {
    return edits[id] ?? fallback;
  }

  function updateEdit(
    id: number,
    field: "name" | "unit" | "category",
    value: string,
  ) {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        name:
          prev[id]?.name ??
          requests?.find((r) => r.id === id)?.requested_name ??
          "",
        unit:
          prev[id]?.unit ??
          requests?.find((r) => r.id === id)?.suggested_unit ??
          "",
        category:
          (prev[id]?.category as StockCategory) ??
          (requests?.find((r) => r.id === id)
            ?.suggested_category as StockCategory) ??
          "other",
        [field]: value,
      },
    }));
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!requests) return;
    if (selected.size === requests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(requests.map((r) => r.id)));
    }
  }

  async function handleApproveSelected() {
    if (!requests || selected.size === 0) return;
    setSubmitting(true);
    setMessage("");
    try {
      const items = Array.from(selected).map((id) => {
        const req = requests.find((r) => r.id === id)!;
        const e = getEdit(id, {
          name: req.requested_name,
          unit: req.suggested_unit,
          category: req.suggested_category,
        });
        return { id, name: e.name, unit: e.unit, category: e.category };
      });
      const result = await approveStockItemRequests(items);
      setMessage(`${result.length} item(s) added to the catalog.`);
      setSelected(new Set());
      reload();
    } catch (err: any) {
      setMessage(
        err?.response?.data?.detail || "Couldn't approve the selected items.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Reject ${selected.size} request(s)?`)) return;
    setSubmitting(true);
    setMessage("");
    try {
      const result = await rejectStockItemRequests(Array.from(selected));
      setMessage(result.detail);
      setSelected(new Set());
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-steel-500">Loading requests...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-steel-50 text-steel-700 text-sm p-3 rounded-lg">
          {message}
        </div>
      )}

      {requests && requests.length > 0 ? (
        <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-steel-100">
            <label className="flex items-center gap-2 text-sm text-steel-600">
              <input
                type="checkbox"
                checked={
                  selected.size === requests.length && requests.length > 0
                }
                onChange={toggleSelectAll}
                className="rounded border-steel-300"
              />
              Select all ({requests.length})
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleRejectSelected}
                disabled={submitting || selected.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <X size={14} />
                Reject Selected
              </button>
              <button
                onClick={handleApproveSelected}
                disabled={submitting || selected.size === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40"
              >
                <PackagePlus size={14} />
                {submitting
                  ? "Adding..."
                  : `Add Selected to Catalog (${selected.size})`}
              </button>
            </div>
          </div>

          <div className="divide-y divide-steel-100">
            {requests.map((req) => {
              const e = getEdit(req.id, {
                name: req.requested_name,
                unit: req.suggested_unit,
                category: req.suggested_category,
              });
              return (
                <div key={req.id} className="p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(req.id)}
                    onChange={() => toggleSelect(req.id)}
                    className="mt-2 rounded border-steel-300"
                  />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      value={e.name}
                      onChange={(ev) =>
                        updateEdit(req.id, "name", ev.target.value)
                      }
                      className="border border-steel-200 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Unit"
                      value={e.unit}
                      onChange={(ev) =>
                        updateEdit(req.id, "unit", ev.target.value)
                      }
                      className="border border-steel-200 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <select
                      value={e.category}
                      onChange={(ev) =>
                        updateEdit(req.id, "category", ev.target.value)
                      }
                      className="border border-steel-200 rounded-lg px-2.5 py-1.5 text-sm"
                    >
                      {(Object.keys(CATEGORY_LABELS) as StockCategory[]).map(
                        (c) => (
                          <option key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </option>
                        ),
                      )}
                    </select>
                    <div className="text-xs text-steel-500 flex flex-col justify-center">
                      <span>
                        Qty needed: {Number(req.quantity_requested)}
                        {e.unit ? ` ${e.unit}` : ""}
                      </span>
                      <span>
                        {req.requested_by_name} ·{" "}
                        {req.project_name || "No project"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-steel-300 p-8 text-center">
          <Check size={24} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            No pending requests — the catalog's fully caught up.
          </p>
        </div>
      )}
    </div>
  );
}
