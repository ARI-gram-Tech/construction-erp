// /src/modules/tenders/NewTenderPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTender } from "@/services/tenders";
import type { TenderPayload } from "@/types/tender";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

export function NewTenderPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<TenderPayload>({
    title: "",
    client_name: "",
    closing_date: "",
    estimated_value: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TenderPayload>(
    key: K,
    value: TenderPayload[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: TenderPayload = {
        title: form.title,
        client_name: form.client_name || undefined,
        closing_date: form.closing_date || null,
        estimated_value: form.estimated_value || null,
      };
      const tender = await createTender(payload);
      navigate(`/company/tenders/${tender.id}`);
    } catch {
      setError("Failed to create tender. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <button
        onClick={() => navigate("/company/tenders")}
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-800 transition-colors"
      >
        <ArrowLeft size={14} />
        Tenders
      </button>

      <div className="bg-white rounded-2xl border border-steel-200/70 overflow-hidden">
        <div className="px-6 py-5 border-b border-steel-200/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-steel-900">New Tender</h1>
            <p className="text-sm text-steel-500">
              Starts in Opportunity — you'll build up pricing next.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-steel-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Riverside Apartments — Main Contract"
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-steel-700">
              Client / Consultant
            </label>
            <input
              value={form.client_name}
              onChange={(e) => update("client_name", e.target.value)}
              placeholder="e.g. ABC Consulting Engineers"
              className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-steel-700">
                Closing Date
              </label>
              <input
                type="date"
                value={form.closing_date ?? ""}
                onChange={(e) => update("closing_date", e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-steel-700">
                Estimated Value (KES)
              </label>
              <input
                type="number"
                value={form.estimated_value ?? ""}
                onChange={(e) => update("estimated_value", e.target.value)}
                placeholder="Rough figure, refine later"
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => navigate("/company/tenders")}
              className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Tender"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
