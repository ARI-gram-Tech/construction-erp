import { useEffect, useState } from "react";
import { CreateCompanyAdminModal } from "../super-admin/CreateCompanyAdminModal";
import { resendInvite } from "@/services/companies";
import type { Company } from "@/types/company";
import {
  listCompanies,
  approveCompany,
  suspendCompany,
} from "@/services/companies";

export function SuperAdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminModalCompany, setAdminModalCompany] = useState<Company | null>(
    null,
  );

  async function loadCompanies() {
    setLoading(true);
    try {
      const data = await listCompanies();
      setCompanies(data);
    } catch (err) {
      setError(
        "Failed to load companies. You may not have Super Admin access.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function handleApprove(id: number) {
    await approveCompany(id);
    loadCompanies();
  }

  async function handleSuspend(id: number) {
    await suspendCompany(id);
    loadCompanies();
  }

  const activeCount = companies.filter((c) => c.status === "active").length;
  const pendingCount = companies.filter((c) => c.status === "pending").length;
  const suspendedCount = companies.filter(
    (c) => c.status === "suspended",
  ).length;

  if (loading)
    return <div className="p-8 text-steel-500">Loading companies...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Platform Overview</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs uppercase text-steel-500">Active Companies</p>
          <p className="text-2xl font-bold">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs uppercase text-steel-500">Pending Approval</p>
          <p className="text-2xl font-bold">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs uppercase text-steel-500">Suspended</p>
          <p className="text-2xl font-bold">{suspendedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {companies.map((company) => (
          <div
            key={company.id}
            className="p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{company.name}</p>
              <p className="text-sm text-steel-500">
                {company.email} · {company.subscription?.plan ?? "No plan"} ·{" "}
                <span
                  className={
                    company.status === "active"
                      ? "text-green-600"
                      : company.status === "pending"
                        ? "text-amber-600"
                        : "text-red-600"
                  }
                >
                  {company.status}
                </span>
              </p>
            </div>
            <div className="space-x-2">
              {company.status !== "active" && (
                <button
                  onClick={() => handleApprove(company.id)}
                  className="px-3 py-1.5 text-sm rounded bg-green-600 text-white"
                >
                  Approve
                </button>
              )}
              {company.status !== "suspended" && (
                <button
                  onClick={() => handleSuspend(company.id)}
                  className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
                >
                  Suspend
                </button>
              )}
              <button
                onClick={() => setAdminModalCompany(company)}
                className="px-3 py-1.5 text-sm rounded bg-primary-700 text-white"
              >
                Create Admin
              </button>
              <button
                onClick={() => resendInvite(company.id)}
                className="px-3 py-1.5 text-sm rounded border border-steel-300 text-steel-700"
              >
                Resend Invite
              </button>
            </div>
          </div>
        ))}
      </div>

      {adminModalCompany && (
        <CreateCompanyAdminModal
          company={adminModalCompany}
          onClose={() => setAdminModalCompany(null)}
          onCreated={loadCompanies}
        />
      )}
    </div>
  );
}
