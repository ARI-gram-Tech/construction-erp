// frontend/src/modules/projects/ProjectBudget/components/BudgetLinesTable.tsx
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  listBudgetLines,
  addBudgetLine,
  deleteBudgetLine,
} from "@/services/budget";
import type { Budget } from "@/types/budget";
import { Plus, Trash2, AlertCircle } from "lucide-react";

interface BudgetLinesTableProps {
  projectId: number;
  budget: Budget;
  locked: boolean;
}

export function BudgetLinesTable({
  projectId,
  budget,
  locked,
}: BudgetLinesTableProps) {
  const {
    data: lines,
    loading,
    reload,
  } = useFetch(
    () => listBudgetLines(projectId, budget.id),
    [projectId, budget.id],
  );

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount) return;
    setSubmitting(true);
    try {
      await addBudgetLine(projectId, budget.id, {
        title: title.trim(),
        original_amount: Number(amount),
      });
      setTitle("");
      setAmount("");
      setShowAdd(false);
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(lineId: number) {
    if (!confirm("Remove this budget line?")) return;
    await deleteBudgetLine(projectId, budget.id, lineId);
    reload();
  }

  if (loading)
    return <div className="text-steel-500 text-sm">Loading lines...</div>;

  return (
    <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-steel-100">
        <h3 className="text-sm font-semibold text-steel-900">Budget Lines</h3>
        {!locked && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700"
          >
            <Plus size={13} />
            Add Line
          </button>
        )}
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="p-4 border-b border-steel-100 flex gap-2 items-end flex-wrap"
        >
          <input
            placeholder="Line title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
          />
          <input
            type="number"
            placeholder="Original amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-steel-300 rounded-lg px-3 py-2 text-sm w-40"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50">
            <th className="px-4 py-3 font-medium">Line</th>
            <th className="px-4 py-3 font-medium text-right">Approved</th>
            <th className="px-4 py-3 font-medium text-right">Committed</th>
            <th className="px-4 py-3 font-medium text-right">Actual</th>
            <th className="px-4 py-3 font-medium text-right">Remaining</th>
            <th className="px-4 py-3 font-medium text-right">Variance</th>
            {!locked && <th className="px-4 py-3"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-steel-100">
          {lines?.map((line) => {
            const overBudget = line.variance < 0;
            return (
              <tr key={line.id}>
                <td className="px-4 py-3 text-steel-900">{line.title}</td>
                <td className="px-4 py-3 text-right text-steel-600">
                  {Number(line.approved_amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-amber-600">
                  {Number(line.committed_amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {Number(line.actual_amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-steel-600">
                  {Number(line.remaining).toLocaleString()}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium flex items-center justify-end gap-1 ${
                    overBudget ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {overBudget && <AlertCircle size={12} />}
                  {Number(line.variance).toLocaleString()}
                </td>
                {!locked && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(line.id)}
                      className="p-1 rounded hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
