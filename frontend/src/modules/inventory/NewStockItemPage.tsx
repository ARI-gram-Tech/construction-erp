// /src/modules/inventory/NewStockItemPage.tsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createStockItem } from "@/services/inventory";
import type { StockItemPayload, StockCategory } from "@/types/inventory";
import { ArrowLeft } from "lucide-react";

const CATEGORIES: { value: StockCategory; label: string }[] = [
  { value: "materials", label: "Building Materials" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "tools", label: "Tools" },
  { value: "safety", label: "Safety Equipment" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full border border-steel-300 rounded-lg px-3 py-2 text-sm";

export function NewStockItemPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<StockItemPayload>({
    name: "",
    category: "materials",
    unit: "",
    reorder_level: 0,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function update<K extends keyof StockItemPayload>(
    key: K,
    value: StockItemPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const item = await createStockItem(form);
      navigate(`/company/inventory/items/${item.id}`);
    } catch (err: any) {
      setFormError(err?.response?.data?.name?.[0] || "Failed to create item.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link
          to="/company/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to Inventory
        </Link>
        <h1 className="text-2xl font-semibold text-steel-900">
          New Stock Item
        </h1>
        <p className="text-steel-500">
          Adds it to the catalog with zero stock — receive actual quantity into
          a warehouse afterward.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {formError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-4"
      >
        <label className="block">
          <span className="block text-xs font-medium text-steel-600 mb-1">
            Item name *
          </span>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
            placeholder="e.g. Cement 50kg"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-steel-600 mb-1">
              Category
            </span>
            <select
              value={form.category}
              onChange={(e) =>
                update("category", e.target.value as StockCategory)
              }
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-steel-600 mb-1">
              Unit *
            </span>
            <input
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
              className={inputClass}
              placeholder="e.g. bags, tons, pieces"
              required
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-steel-600 mb-1">
            Reorder level
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.reorder_level}
            onChange={(e) => update("reorder_level", Number(e.target.value))}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-steel-600 mb-1">
            Notes
          </span>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className={inputClass}
            rows={2}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate("/company/inventory")}
            className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
