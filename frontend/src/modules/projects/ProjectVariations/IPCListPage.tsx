import { useState } from "react";
import { useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listIPCs,
  createIPC,
  issueIPC,
  ipcPdfUrl,
} from "@/services/variations";
import { listBudgets as listBudgetsSvc } from "@/services/budget";
import { Receipt, Plus, Send, Download } from "lucide-react";

export function IPCListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);

  const {
    data: ipcs,
    loading,
    error,
    reload,
  } = useFetch(() => listIPCs(pid), [pid]);
  const { data: budgets } = useFetch(() => listBudgetsSvc(pid), [pid]);

  const [showNew, setShowNew] = useState(false);
  const [budgetId, setBudgetId] = useState<number | "">("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [retention, setRetention] = useState("10");
  const [vat, setVat] = useState("16");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!budgetId || !periodStart || !periodEnd || !workDone) return;
    setSubmitting(true);
    try {
      await createIPC(pid, {
        budget: Number(budgetId),
        period_start: periodStart,
        period_end: periodEnd,
        work_done_amount: Number(workDone),
        retention_percent: Number(retention),
        vat_percent: Number(vat),
      });
      setShowNew(false);
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIssue(id: number) {
    if (!confirm("Issue this certificate? It becomes final once issued."))
      return;
    await issueIPC(pid, id);
    reload();
  }

  if (loading)
    return <div className="text-steel-500">Loading certificates...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
              <Receipt size={24} className="text-orange-500" />
            </div>
            Interim Payment Certificates
          </h1>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={16} />
            New Certificate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {ipcs && ipcs.length > 0 ? (
          ipcs.map((ipc) => (
            <div
              key={ipc.id}
              className="p-4 flex items-center justify-between flex-wrap gap-3"
            >
              <div>
                <p className="text-sm font-medium text-steel-900">
                  Certificate {ipc.certificate_number}
                </p>
                <p className="text-xs text-steel-500 mt-0.5">
                  {ipc.period_start} to {ipc.period_end} · Net payable{" "}
                  {Number(ipc.net_payable).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    ipc.status === "issued"
                      ? "bg-green-50 text-green-700"
                      : "bg-steel-100 text-steel-600"
                  }`}
                >
                  {ipc.status}
                </span>
                {ipc.status === "draft" && (
                  <button
                    onClick={() => handleIssue(ipc.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-orange-500 text-white"
                  >
                    <Send size={12} />
                    Issue
                  </button>
                )}
                {ipc.status === "issued" && (
                  <a
                    href={ipcPdfUrl(pid, ipc.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-steel-300 text-steel-700"
                  >
                    <Download size={12} />
                    PDF
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center">
            <Receipt size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              No certificates issued yet.
            </p>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              New Payment Certificate
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <select
                value={budgetId}
                onChange={(e) =>
                  setBudgetId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select budget...</option>
                {budgets?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <input
                type="number"
                placeholder="Work done to date (cumulative gross)"
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Retention %"
                  value={retention}
                  onChange={(e) => setRetention(e.target.value)}
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="VAT %"
                  value={vat}
                  onChange={(e) => setVat(e.target.value)}
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
