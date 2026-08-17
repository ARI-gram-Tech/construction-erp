import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  listVariations,
  createVariation,
  submitVariation,
  approveVariation,
  rejectVariation,
} from "@/services/variations";
import { GitPullRequest, Plus, Check, X, Send } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-steel-100 text-steel-600",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export function VariationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();

  const {
    data: variations,
    loading,
    error,
    reload,
  } = useFetch(() => listVariations(pid), [pid]);

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [costImpact, setCostImpact] = useState("");
  const [timeImpact, setTimeImpact] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const canDecide = ["project_manager", "director", "company_admin"].includes(
    me?.role ?? "",
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !costImpact) return;
    setSubmitting(true);
    try {
      await createVariation(pid, {
        title: title.trim(),
        description,
        reason,
        cost_impact: Number(costImpact),
        time_impact_days: Number(timeImpact) || 0,
      });
      setShowNew(false);
      setTitle("");
      setDescription("");
      setReason("");
      setCostImpact("");
      setTimeImpact("0");
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(id: number) {
    await submitVariation(pid, id);
    reload();
  }

  async function handleApprove(id: number) {
    const comment = prompt("Approval comment (optional):") ?? "";
    await approveVariation(pid, id, comment);
    reload();
  }

  async function handleReject(id: number) {
    const comment = prompt("Reason for rejection:") ?? "";
    await rejectVariation(pid, id, comment);
    reload();
  }

  if (loading)
    return <div className="text-steel-500">Loading variations...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
              <GitPullRequest size={24} className="text-orange-500" />
            </div>
            Variations
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/projects/${pid}/variations/ipcs`)}
              className="px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50"
            >
              Payment Certificates
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={16} />
              New Variation
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {variations && variations.length > 0 ? (
          variations.map((v) => (
            <div
              key={v.id}
              className="p-4 flex items-center justify-between flex-wrap gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-steel-900">
                  <span className="text-steel-400 font-mono text-xs mr-2">
                    {v.number}
                  </span>
                  {v.title}
                </p>
                <p className="text-xs text-steel-500 mt-0.5">
                  {v.budget_line_title ? `${v.budget_line_title} · ` : ""}
                  Cost impact: {v.cost_impact >= 0 ? "+" : ""}
                  {Number(v.cost_impact).toLocaleString()}
                  {v.time_impact_days ? ` · ${v.time_impact_days} day(s)` : ""}
                  {v.requested_by_name && ` · by ${v.requested_by_name}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[v.status]}`}
                >
                  {v.status}
                </span>
                {v.status === "draft" && (
                  <button
                    onClick={() => handleSubmit(v.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-orange-500 text-white"
                  >
                    <Send size={12} />
                    Submit
                  </button>
                )}
                {v.status === "submitted" && canDecide && (
                  <>
                    <button
                      onClick={() => handleApprove(v.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-600 text-white"
                    >
                      <Check size={12} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(v.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white"
                    >
                      <X size={12} />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center">
            <GitPullRequest size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              No variations recorded yet.
            </p>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">New Variation</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
              <textarea
                placeholder="Reason for this variation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Cost impact (+/-)"
                  value={costImpact}
                  onChange={(e) => setCostImpact(e.target.value)}
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <input
                  type="number"
                  placeholder="Time impact (days)"
                  value={timeImpact}
                  onChange={(e) => setTimeImpact(e.target.value)}
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
