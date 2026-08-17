// /src/modules/projects/ProjectBOQ/NewBOQPage.tsx

import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createBOQ } from "@/services/boq";
import type { BOQPayload, BOQLinkMode, BOQIntegrationMode } from "@/types/boq";
import { ArrowLeft } from "lucide-react";

const inputClass =
  "w-full border border-steel-300 rounded-lg px-3 py-2 text-sm";

export function NewBOQPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [linkMode, setLinkMode] = useState<BOQLinkMode>("standalone");
  const [integrationMode, setIntegrationMode] =
    useState<BOQIntegrationMode>("cost_tracking");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!title.trim()) {
      setFormError("Give this BOQ a title.");
      return;
    }

    const payload: BOQPayload = {
      title,
      currency,
      link_mode: linkMode,
      integration_mode: integrationMode,
    };

    setSubmitting(true);
    try {
      const boq = await createBOQ(id, payload);
      navigate(`/projects/${id}/boq/${boq.id}`);
    } catch (err: any) {
      setFormError(err?.response?.data?.title?.[0] || "Failed to create BOQ.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          to={`/projects/${id}/boq`}
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to BOQs
        </Link>
        <h1 className="text-2xl font-semibold text-steel-900">New BOQ</h1>
        <p className="text-steel-500">
          Starts empty — add sections and items on the next screen, or import an
          existing spreadsheet later.
        </p>
      </div>

      {formError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-steel-200/50 p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-steel-600 mb-1">
              Title *
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Main Contract BOQ"
              required
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-steel-600 mb-1">
                Currency
              </span>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className={inputClass}
                maxLength={3}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-steel-600 mb-1">
                Link to Planning (WBS)
              </span>
              <select
                value={linkMode}
                onChange={(e) => setLinkMode(e.target.value as BOQLinkMode)}
                className={inputClass}
              >
                <option value="standalone">
                  Standalone — own structure only
                </option>
                <option value="linked_to_wbs">
                  Linked — items can map to Planning
                </option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-steel-600 mb-1">
              Integration level
            </span>
            <select
              value={integrationMode}
              onChange={(e) =>
                setIntegrationMode(e.target.value as BOQIntegrationMode)
              }
              className={inputClass}
            >
              <option value="reference">
                Reference only — just a document, no cost tracking
              </option>
              <option value="cost_tracking">
                Cost tracking — feeds Budget & reports
              </option>
              <option value="full_integration">
                Full integration — feeds Procurement, Inventory, Planning too
              </option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(`/projects/${id}/boq`)}
            className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create BOQ"}
          </button>
        </div>
      </form>
    </div>
  );
}
