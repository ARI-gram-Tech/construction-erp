import { useState } from "react";
import { useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listBudgets,
  createBudget,
  generateBudgetFromBOQ,
  approveBudget,
  lockBudget,
} from "@/services/budget";
import { listBOQs } from "@/services/boq";
import { BudgetLinesTable } from "./components/BudgetLinesTable";
import {
  Wallet,
  Plus,
  FilePlus,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-steel-100 text-steel-600",
  approved: "bg-green-50 text-green-700",
  locked: "bg-blue-50 text-blue-700",
};

export function BudgetWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);

  const {
    data: budgets,
    loading,
    error,
    reload,
  } = useFetch(() => listBudgets(pid), [pid]);
  const { data: boqs } = useFetch(() => listBOQs(pid), [pid]);

  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showBlank, setShowBlank] = useState(false);
  const [genBoqId, setGenBoqId] = useState<number | "">("");
  const [genTitle, setGenTitle] = useState("");
  const [blankTitle, setBlankTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const activeBudget =
    budgets?.find((b) => b.id === selectedBudgetId) ?? budgets?.[0] ?? null;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genBoqId || !genTitle.trim()) return;
    setGenerating(true);
    setActionError("");
    try {
      const budget = await generateBudgetFromBOQ(pid, {
        boq_id: Number(genBoqId),
        title: genTitle.trim(),
      });
      setShowGenerate(false);
      setGenBoqId("");
      setGenTitle("");
      setSelectedBudgetId(budget.id);
      reload();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail ||
          "Couldn't generate budget from that BOQ.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateBlank(e: React.FormEvent) {
    e.preventDefault();
    if (!blankTitle.trim()) return;
    setCreatingBlank(true);
    setActionError("");
    try {
      const budget = await createBudget(pid, { title: blankTitle.trim() });
      setShowBlank(false);
      setBlankTitle("");
      setSelectedBudgetId(budget.id);
      reload();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail || "Couldn't create the budget.",
      );
    } finally {
      setCreatingBlank(false);
    }
  }

  async function handleApprove() {
    if (!activeBudget) return;
    setBusy(true);
    try {
      await approveBudget(pid, activeBudget.id);
      reload();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail || "Couldn't approve this budget.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLock() {
    if (!activeBudget) return;
    if (
      !confirm(
        "Lock this budget? Lines can only be changed via Variations after this.",
      )
    )
      return;
    setBusy(true);
    try {
      await lockBudget(pid, activeBudget.id);
      reload();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail || "Couldn't lock this budget.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-steel-500">Loading budget...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
              <Wallet size={24} className="text-orange-500" />
            </div>
            Budget
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlank(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors"
            >
              <FilePlus size={16} />
              Start Blank Budget
            </button>
            <button
              onClick={() => setShowGenerate(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              <Plus size={16} />
              Generate from BOQ
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} />
          {actionError}
        </div>
      )}

      {!budgets || budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-steel-300 p-10 text-center">
          <Wallet size={28} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            No budget yet — generate one from an approved BOQ, or start a blank
            one if your BOQ is just a reference document.
          </p>
        </div>
      ) : (
        <>
          {budgets.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {budgets.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBudgetId(b.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    activeBudget?.id === b.id
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-steel-200 text-steel-600 hover:bg-steel-50"
                  }`}
                >
                  {b.title}
                </button>
              ))}
            </div>
          )}

          {activeBudget && (
            <>
              <div className="bg-white rounded-xl border border-steel-200/50 p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-steel-900">
                        {activeBudget.title}
                      </h2>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[activeBudget.status]}`}
                      >
                        {activeBudget.status}
                      </span>
                      {!activeBudget.boq && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-steel-100 text-steel-500">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-steel-500 mt-1">
                      Created by {activeBudget.created_by_name || "—"}
                      {activeBudget.approved_by_name &&
                        ` · Approved by ${activeBudget.approved_by_name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {activeBudget.status === "draft" && (
                      <button
                        onClick={handleApprove}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                    )}
                    {activeBudget.status === "approved" && (
                      <button
                        onClick={handleLock}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        <Lock size={14} />
                        Lock Budget
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-steel-100">
                  <Metric
                    label="Original"
                    value={activeBudget.total_original}
                    currency={activeBudget.currency}
                  />
                  <Metric
                    label="Approved"
                    value={activeBudget.total_approved}
                    currency={activeBudget.currency}
                  />
                  <Metric
                    label="Committed"
                    value={activeBudget.total_committed}
                    currency={activeBudget.currency}
                    color="text-amber-600"
                  />
                  <Metric
                    label="Actual"
                    value={activeBudget.total_actual}
                    currency={activeBudget.currency}
                    color="text-red-600"
                  />
                </div>
              </div>

              <BudgetLinesTable
                projectId={pid}
                budget={activeBudget}
                locked={activeBudget.status === "locked"}
              />
            </>
          )}
        </>
      )}

      {showGenerate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Generate Budget from BOQ
            </h3>
            {actionError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                {actionError}
              </div>
            )}
            <form onSubmit={handleGenerate} className="space-y-3">
              <select
                value={genBoqId}
                onChange={(e) =>
                  setGenBoqId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select a BOQ...</option>
                {boqs?.map((boq) => (
                  <option key={boq.id} value={boq.id}>
                    {boq.title} ({boq.currency}{" "}
                    {Number(boq.total_amount).toLocaleString()})
                  </option>
                ))}
              </select>
              <input
                placeholder="Budget title, e.g. Initial Budget v1"
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBlank && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-1">Start a Blank Budget</h3>
            <p className="text-xs text-steel-500 mb-4">
              Use this when your BOQ is a reference document only (not
              digitized) — you'll add budget lines manually.
            </p>
            {actionError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                {actionError}
              </div>
            )}
            <form onSubmit={handleCreateBlank} className="space-y-3">
              <input
                placeholder="Budget title, e.g. Initial Budget v1"
                value={blankTitle}
                onChange={(e) => setBlankTitle(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlank(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBlank}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                >
                  {creatingBlank ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  currency,
  color = "text-steel-900",
}: {
  label: string;
  value: number;
  currency: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-steel-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>
        {currency} {Number(value).toLocaleString()}
      </p>
    </div>
  );
}
