import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { listCompanies, updateSubscription } from "@/services/companies";

const PLAN_OPTIONS = ["trial", "basic", "professional", "enterprise"] as const;

export function SubscriptionsPage() {
  const {
    data: companies,
    loading,
    error,
    reload,
  } = useFetch(() => listCompanies());
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handlePlanChange(companyId: number, plan: string) {
    setBusyId(companyId);
    try {
      await updateSubscription(companyId, { plan: plan as any });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleLimitChange(
    companyId: number,
    field: "max_users" | "max_projects",
    value: number,
  ) {
    setBusyId(companyId);
    try {
      await updateSubscription(companyId, { [field]: value });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleExpiryChange(companyId: number, value: string) {
    setBusyId(companyId);
    try {
      await updateSubscription(companyId, { expires_at: value || null });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(companyId: number, isActive: boolean) {
    setBusyId(companyId);
    try {
      await updateSubscription(companyId, { is_active: !isActive });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  if (loading)
    return <div className="p-8 text-steel-500">Loading subscriptions...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-steel-900">Subscriptions</h1>

      <div className="bg-white rounded-lg shadow divide-y">
        {companies?.map((company) => {
          const sub = company.subscription;
          const busy = busyId === company.id;
          return (
            <div
              key={company.id}
              className="p-4 grid grid-cols-6 gap-4 items-center"
            >
              <div className="col-span-2">
                <p className="font-medium text-steel-900">{company.name}</p>
                <p className="text-sm text-steel-500">{company.email}</p>
              </div>

              <select
                value={sub?.plan ?? "trial"}
                onChange={(e) => handlePlanChange(company.id, e.target.value)}
                disabled={busy || !sub}
                className="border rounded px-2 py-1.5 text-sm"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-sm">
                <input
                  type="number"
                  value={sub?.max_users ?? 0}
                  onChange={(e) =>
                    handleLimitChange(
                      company.id,
                      "max_users",
                      Number(e.target.value),
                    )
                  }
                  disabled={busy || !sub}
                  className="w-16 border rounded px-2 py-1"
                />
                <span className="text-steel-500">users</span>
              </div>

              <div className="flex items-center gap-1 text-sm">
                <input
                  type="number"
                  value={sub?.max_projects ?? 0}
                  onChange={(e) =>
                    handleLimitChange(
                      company.id,
                      "max_projects",
                      Number(e.target.value),
                    )
                  }
                  disabled={busy || !sub}
                  className="w-16 border rounded px-2 py-1"
                />
                <span className="text-steel-500">projects</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={sub?.expires_at ?? ""}
                  onChange={(e) =>
                    handleExpiryChange(company.id, e.target.value)
                  }
                  disabled={busy || !sub}
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() =>
                    handleToggleActive(company.id, sub?.is_active ?? false)
                  }
                  disabled={busy || !sub}
                  className={`px-2 py-1 text-xs rounded text-white ${
                    sub?.is_active ? "bg-status-success" : "bg-status-critical"
                  }`}
                >
                  {sub?.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
