// frontend/src/modules/projects/ProjectPlanning/components/BaselinesSection.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { GitCommitVertical, Plus, X } from "lucide-react";
import { createBaseline, getBaselineVariance } from "@/services/planning";
import type { ProjectBaseline, VarianceRow } from "@/types/planning";

interface BaselinesSectionProps {
  projectId: number;
  baselines: ProjectBaseline[];
  onChange: () => void;
}

export function BaselinesSection({
  projectId,
  baselines,
  onChange,
}: BaselinesSectionProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [varianceFor, setVarianceFor] = useState<ProjectBaseline | null>(null);
  const [varianceRows, setVarianceRows] = useState<VarianceRow[]>([]);
  const [loadingVariance, setLoadingVariance] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createBaseline(projectId, { name, remarks });
      setShowCreate(false);
      setName("");
      setRemarks("");
      onChange();
    } finally {
      setSubmitting(false);
    }
  }

  async function openVariance(baseline: ProjectBaseline) {
    setVarianceFor(baseline);
    setLoadingVariance(true);
    try {
      setVarianceRows(await getBaselineVariance(projectId, baseline.id));
    } finally {
      setLoadingVariance(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-steel-100">
        <h3 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
            <GitCommitVertical size={16} />
          </div>
          Baselines
          <span className="text-xs text-steel-400 font-normal ml-1">
            ({baselines.length})
          </span>
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
        >
          <Plus size={14} />
          Set Baseline
        </button>
      </div>

      <div className="p-4">
        {baselines.length === 0 ? (
          <div className="py-6 text-center">
            <GitCommitVertical
              size={24}
              className="text-steel-300 mx-auto mb-2"
            />
            <p className="text-sm text-steel-500">No baseline set yet.</p>
            <p className="text-xs text-steel-400 mt-1">
              Freeze the current schedule once the plan is approved, so future
              changes can be measured against it.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {baselines.map((b) => (
              <button
                key={b.id}
                onClick={() => openVariance(b)}
                className="w-full text-left flex items-center justify-between p-2.5 rounded-lg border border-steel-200/60 hover:border-orange-200 hover:bg-orange-50/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-steel-900 truncate">
                      {b.name}
                    </span>
                    {b.is_current && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-steel-400">
                    {b.activity_count} activities ·{" "}
                    {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create baseline modal */}
      {showCreate &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-steel-200/60">
              <h3 className="text-lg font-semibold text-steel-900 mb-1">
                Set Baseline
              </h3>
              <p className="text-xs text-steel-500 mb-4">
                Freezes every current activity's planned dates. This becomes the
                reference point future variance is measured against.
              </p>
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  placeholder="Name (e.g. Original Programme, EOT Revision 1)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <textarea
                  placeholder="Remarks (optional)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Set Baseline"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Variance report modal */}
      {varianceFor &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-steel-200/60 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-steel-900">
                  {varianceFor.name} — Variance
                </h3>
                <button
                  onClick={() => setVarianceFor(null)}
                  className="text-steel-400 hover:text-steel-600"
                >
                  <X size={20} />
                </button>
              </div>

              {loadingVariance ? (
                <p className="text-sm text-steel-500">Loading...</p>
              ) : varianceRows.length === 0 ? (
                <p className="text-sm text-steel-500">
                  No activities in this baseline.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-steel-400 uppercase border-b border-steel-100">
                      <th className="pb-2">Activity</th>
                      <th className="pb-2">Baseline Finish</th>
                      <th className="pb-2">Current Finish</th>
                      <th className="pb-2">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varianceRows.map((row, i) => (
                      <tr key={i} className="border-b border-steel-50">
                        <td className="py-2 text-steel-800">
                          {row.activity_name}
                          {row.current_status === "deleted" && (
                            <span className="text-xs text-steel-400 ml-1">
                              (removed)
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-steel-600">
                          {new Date(row.baseline_end).toLocaleDateString()}
                        </td>
                        <td className="py-2 text-steel-600">
                          {row.current_end
                            ? new Date(row.current_end).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-2">
                          {row.variance_days === null ? (
                            <span className="text-steel-400">—</span>
                          ) : row.variance_days > 0 ? (
                            <span className="text-red-600 font-medium">
                              +{row.variance_days} days
                            </span>
                          ) : row.variance_days < 0 ? (
                            <span className="text-emerald-600 font-medium">
                              {row.variance_days} days
                            </span>
                          ) : (
                            <span className="text-steel-500">On time</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
