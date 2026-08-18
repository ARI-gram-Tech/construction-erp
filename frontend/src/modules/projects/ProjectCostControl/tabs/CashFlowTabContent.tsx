// /src/modules/projects/ProjectCostControl/tabs/CashFlowTabContent.tsx
import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listCashFlowPlans,
  createCashFlowPlan,
  getCashFlowSummary,
  generateCashFlowRows,
} from "@/services/cashflow";
import { listBudgets } from "@/services/budget";
import type { CashFlowPeriodType, CashFlowEntryType } from "@/types/cashflow";
import { CashFlowGrid } from "@/modules/projects/ProjectCashFlow/components/CashFlowGrid";
import { CostControlHeader } from "../components/CostControlHeader";
import {
  TrendingUp,
  Plus,
  Sparkles,
  AlertTriangle,
  Calendar,
} from "lucide-react";

const PERIOD_LABELS: Record<CashFlowPeriodType, string> = {
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

export function CashFlowTabContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);

  const {
    data: plans,
    loading,
    reload,
  } = useFetch(() => listCashFlowPlans(pid), [pid]);
  const { data: budgets } = useFetch(() => listBudgets(pid), [pid]);

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [entryType, setEntryType] = useState<CashFlowEntryType>("planned");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPeriodType, setNewPeriodType] =
    useState<CashFlowPeriodType>("month");
  const [newBudgetId, setNewBudgetId] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState("");

  const activePlan =
    plans?.find((p) => p.id === selectedPlanId) ??
    plans?.find((p) => p.is_current) ??
    plans?.[0] ??
    null;

  const {
    data: summary,
    loading: summaryLoading,
    reload: reloadSummary,
  } = useFetch(
    () =>
      activePlan
        ? getCashFlowSummary(pid, activePlan.id, entryType)
        : Promise.resolve(null),
    [pid, activePlan?.id, entryType],
  );

  const grandTotals = useMemo(() => {
    if (!summary) return {};
    const totals: Record<string, number> = {};
    for (const period of summary.periods) {
      totals[period] = summary.rows.reduce(
        (sum, row) => sum + (row.totals[period] || 0),
        0,
      );
    }
    return totals;
  }, [summary]);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setActionError("");
    try {
      const plan = await createCashFlowPlan(pid, {
        title: newTitle.trim(),
        period_type: newPeriodType,
        budget: newBudgetId || null,
      });
      setShowCreate(false);
      setNewTitle("");
      setSelectedPlanId(plan.id);
      reload();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail || "Couldn't create the cash flow plan.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateRows() {
    if (!activePlan) return;
    setGenerating(true);
    setActionError("");
    try {
      const res = await generateCashFlowRows(pid, activePlan.id, {
        entry_type: entryType,
      });
      reloadSummary();
      if (res.created_count === 0) {
        setActionError(
          "No new rows to generate — every activity already has entries for this period type.",
        );
      }
    } catch {
      setActionError("Couldn't generate rows from the schedule.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading)
    return <div className="text-steel-500">Loading cash flow...</div>;

  return (
    <div className="space-y-6">
      <CostControlHeader
        title="Cash Flow"
        icon={TrendingUp}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            <Plus size={16} />
            New Plan
          </button>
        }
      />

      {actionError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} />
          {actionError}
        </div>
      )}

      {!plans || plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-steel-300 p-10 text-center">
          <Calendar size={28} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            No cash flow plan yet. Create one to distribute costs across your
            project's schedule.
          </p>
        </div>
      ) : (
        activePlan && (
          <>
            <div className="bg-white rounded-xl border border-steel-200/50 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-steel-900">
                      {activePlan.title}
                    </h2>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-steel-100 text-steel-600">
                      {PERIOD_LABELS[activePlan.period_type]}
                    </span>
                  </div>
                  <p className="text-xs text-steel-500 mt-1">
                    Created by {activePlan.created_by_name || "—"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-steel-300 overflow-hidden">
                    {(["planned", "actual"] as CashFlowEntryType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setEntryType(t)}
                        className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                          entryType === t
                            ? "bg-orange-500 text-white"
                            : "bg-white text-steel-600 hover:bg-steel-50"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleGenerateRows}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    {generating
                      ? "Generating..."
                      : "Generate Rows from Schedule"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-steel-100">
                <div>
                  <p className="text-xs text-steel-500">Total Planned</p>
                  <p className="text-lg font-semibold text-steel-900">
                    {Number(activePlan.total_planned).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-steel-500">Total Actual</p>
                  <p className="text-lg font-semibold text-red-600">
                    {Number(activePlan.total_actual).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {summaryLoading ? (
              <div className="text-steel-500 text-sm">Loading grid...</div>
            ) : summary && summary.rows.length > 0 ? (
              <CashFlowGrid
                projectId={pid}
                planId={activePlan.id}
                summary={summary}
                grandTotals={grandTotals}
                entryType={entryType}
                onChanged={reloadSummary}
              />
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-steel-300 p-10 text-center">
                <p className="text-sm text-steel-500 mb-3">
                  No entries yet for this plan.
                </p>
                <button
                  onClick={handleGenerateRows}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  Generate Rows from Schedule
                </button>
              </div>
            )}
          </>
        )
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">New Cash Flow Plan</h3>
            {actionError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                {actionError}
              </div>
            )}
            <form onSubmit={handleCreatePlan} className="space-y-3">
              <input
                placeholder="Plan title, e.g. Cash Flow v1"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
                autoFocus
              />
              <div>
                <label className="text-xs text-steel-500 mb-1 block">
                  Period Granularity
                </label>
                <select
                  value={newPeriodType}
                  onChange={(e) =>
                    setNewPeriodType(e.target.value as CashFlowPeriodType)
                  }
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-steel-500 mb-1 block">
                  Link to Budget (optional)
                </label>
                <select
                  value={newBudgetId}
                  onChange={(e) =>
                    setNewBudgetId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {budgets?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
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
                  disabled={creating}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
