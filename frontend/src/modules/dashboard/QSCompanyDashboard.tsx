// frontend/src/modules/dashboard/QSCompanyDashboard.tsx
import { useFetch } from "@/hooks/useFetch";
import { getQSDashboard } from "@/services/dashboards";
import { FileSpreadsheet, Wallet, GitPullRequest, Receipt } from "lucide-react";

function money(value: string) {
  return `KES ${Number(value).toLocaleString()}`;
}

export function QSCompanyDashboard() {
  const { data, loading } = useFetch(() => getQSDashboard());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
          <p className="text-sm text-steel-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const projects = data?.projects ?? [];

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-steel-900">
            QS Dashboard
          </h1>
          <p className="text-steel-500 mt-1">
            BOQs, budgets, variations, and certificates across your projects.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
          <p className="text-sm text-steel-900 font-medium">
            No projects assigned yet
          </p>
          <p className="text-sm text-steel-500 mt-1">
            You'll see BOQ and cost data here once you're added to a project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-steel-900">QS Dashboard</h1>
        <p className="text-steel-500 mt-1">
          BOQs, budgets, variations, and certificates across your projects.
        </p>
      </div>

      {projects.map((project) => (
        <div key={project.project_id} className="space-y-4">
          <h2 className="text-sm font-semibold text-steel-500 uppercase tracking-wider">
            Project #{project.project_id}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BOQ summary */}
            <div className="bg-white rounded-xl border border-steel-200/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-steel-900">BOQs</h3>
                <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
                  {project.boqs.length}
                </span>
              </div>

              {project.boqs.length === 0 ? (
                <p className="text-sm text-steel-500">No BOQs yet.</p>
              ) : (
                <div className="divide-y divide-steel-200/50">
                  {project.boqs.map((boq) => (
                    <div key={boq.id} className="py-3 first:pt-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-steel-900">
                          {boq.title}
                        </p>
                        <span className="text-xs text-steel-500">
                          {boq.health_label}
                        </span>
                      </div>
                      <p className="text-xs text-steel-500 mt-0.5">
                        {boq.item_count} items · {money(boq.total_amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variations */}
            <div className="bg-white rounded-xl border border-steel-200/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <GitPullRequest size={18} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-steel-900">Variations</h3>
                <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
                  {project.variations.length}
                </span>
              </div>

              {project.variations.length === 0 ? (
                <p className="text-sm text-steel-500">No variations yet.</p>
              ) : (
                <div className="divide-y divide-steel-200/50">
                  {project.variations.map((v) => (
                    <div key={v.id} className="py-3 first:pt-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-steel-900">
                          VO-{v.number}: {v.title}
                        </p>
                        <span className="text-xs text-steel-500 capitalize">
                          {v.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-steel-500 mt-0.5">
                        {money(v.cost_impact)}
                        {v.time_impact_days !== 0 &&
                          ` · ${v.time_impact_days > 0 ? "+" : ""}${v.time_impact_days} days`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budget vs Actual */}
            <div className="bg-white rounded-xl border border-steel-200/50 p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Wallet size={18} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-steel-900">
                  Budget vs Actual
                </h3>
              </div>

              {project.budgets.length === 0 ? (
                <p className="text-sm text-steel-500">No budgets yet.</p>
              ) : (
                project.budgets.map((budget) => (
                  <div key={budget.id} className="mb-4 last:mb-0">
                    <p className="text-sm font-medium text-steel-900 mb-2">
                      {budget.title}
                    </p>
                    <div className="divide-y divide-steel-200/50">
                      {budget.lines.map((line) => (
                        <div
                          key={line.id}
                          className="py-2 grid grid-cols-4 gap-2 text-xs"
                        >
                          <span className="text-steel-700 truncate">
                            {line.title}
                          </span>
                          <span className="text-steel-500 text-right">
                            Approved {money(line.approved_amount)}
                          </span>
                          <span className="text-steel-500 text-right">
                            Actual {money(line.actual)}
                          </span>
                          <span
                            className={`text-right font-medium ${
                              Number(line.variance) < 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {money(line.variance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent IPCs */}
            <div className="bg-white rounded-xl border border-steel-200/50 p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Receipt size={18} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-steel-900">
                  Recent Interim Payment Certificates
                </h3>
                <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
                  {project.recent_ipcs.length}
                </span>
              </div>

              {project.recent_ipcs.length === 0 ? (
                <p className="text-sm text-steel-500">No IPCs issued yet.</p>
              ) : (
                <div className="divide-y divide-steel-200/50">
                  {project.recent_ipcs.map((ipc) => (
                    <div
                      key={ipc.id}
                      className="py-3 first:pt-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-steel-900">
                          IPC No.{ipc.certificate_number}
                        </p>
                        <p className="text-xs text-steel-500">
                          {ipc.period_start} → {ipc.period_end}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-steel-900">
                          {money(ipc.net_payable)}
                        </p>
                        <span className="text-xs text-steel-500 capitalize">
                          {ipc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
