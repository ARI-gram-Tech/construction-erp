// frontend/src/pages/Company/Dashboard.tsx
import { useFetch } from "@/hooks/useFetch";
import { getMyCompany } from "@/services/companies";
import { listMyCompanyUsers } from "@/services/users";
import {
  FolderKanban,
  Users,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Activity,
  Building2,
  UserPlus,
  CheckCircle,
  Clock,
} from "lucide-react";

export function CompanyDashboard() {
  const { data: company, loading: companyLoading } = useFetch(() =>
    getMyCompany(),
  );
  const { data: teamMembers, loading: teamLoading } = useFetch(() =>
    listMyCompanyUsers(),
  );

  const loading = companyLoading || teamLoading;

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

  const totalMembers = teamMembers?.length ?? 0;
  const maxUsers = company?.subscription?.max_users ?? 0;
  const maxProjects = company?.subscription?.max_projects ?? 0;
  const usagePercent =
    maxUsers > 0 ? Math.round((totalMembers / maxUsers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-steel-900">
          Company Dashboard
        </h1>
        <p className="text-steel-500 mt-1">
          How is your company performing today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200/50 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-steel-500 uppercase tracking-wider">
                Team Members
              </p>
              <p className="text-2xl font-bold text-steel-900 mt-1">
                {totalMembers}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-steel-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-steel-500 font-medium">
                  {usagePercent}%
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Users size={24} className="text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-steel-400 mt-3">
            {totalMembers} of {maxUsers} available
          </p>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-steel-500 uppercase tracking-wider">
                Current Plan
              </p>
              <p className="text-2xl font-bold text-steel-900 mt-1 capitalize">
                {company?.subscription?.plan ?? "Free"}
              </p>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  company?.subscription?.plan === "enterprise"
                    ? "bg-purple-100 text-purple-700"
                    : company?.subscription?.plan === "professional"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-steel-100 text-steel-600"
                }`}
              >
                <CheckCircle size={12} />
                Active
              </span>
            </div>
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Building2 size={24} className="text-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-steel-500 uppercase tracking-wider">
                Projects
              </p>
              <p className="text-2xl font-bold text-steel-900 mt-1">0</p>
              <p className="text-xs text-steel-400 mt-1">
                Limit: {maxProjects || "Unlimited"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-steel-50 flex items-center justify-center">
              <FolderKanban size={24} className="text-steel-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-steel-500 uppercase tracking-wider">
                Activity
              </p>
              <p className="text-2xl font-bold text-steel-900 mt-1">Active</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-steel-500">System online</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
              <Activity size={24} className="text-green-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-steel-200/50 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <FolderKanban size={18} className="text-orange-500" />
            </div>
            <h2 className="font-semibold text-steel-900">Projects</h2>
            <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
              0 Active
            </span>
          </div>
          <div className="bg-steel-50 rounded-lg p-4 border border-steel-200/30">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-steel-200/50 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-steel-400" />
              </div>
              <div>
                <p className="text-sm text-steel-900 font-medium">
                  No projects yet
                </p>
                <p className="text-sm text-steel-500 mt-0.5">
                  Projects will appear here once the module is built out.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Wallet size={18} className="text-orange-500" />
            </div>
            <h2 className="font-semibold text-steel-900">Finance</h2>
            <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
              Tracking
            </span>
          </div>
          <div className="bg-steel-50 rounded-lg p-4 border border-steel-200/30">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-steel-200/50 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-steel-400" />
              </div>
              <div>
                <p className="text-sm text-steel-900 font-medium">
                  Coming soon
                </p>
                <p className="text-sm text-steel-500 mt-0.5">
                  Revenue, expenses, and cash position will appear here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="px-6 py-4 border-b border-steel-200/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Users size={18} className="text-orange-500" />
            </div>
            <h2 className="font-semibold text-steel-900">Team Members</h2>
          </div>
          <button className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>

        <div className="p-6">
          {teamMembers && teamMembers.length > 0 ? (
            <div className="divide-y divide-steel-200/50">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-steel-50/50 px-3 -mx-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-linear-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                      {member.first_name?.[0]}
                      {member.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-steel-900">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-steel-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:ml-auto">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        member.role === "company_admin"
                          ? "bg-orange-100 text-orange-700"
                          : member.role === "employee"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-steel-100 text-steel-600"
                      }`}
                    >
                      {member.role === "company_admin"
                        ? "Admin"
                        : member.role === "employee"
                          ? "Employee"
                          : "No role"}
                    </span>
                    <span className="text-xs text-steel-400">
                      {member.is_active ? (
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-steel-300" />
                          Inactive
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-steel-50 flex items-center justify-center mx-auto mb-3">
                <Users size={24} className="text-steel-400" />
              </div>
              <p className="text-sm text-steel-900 font-medium">
                No team members yet
              </p>
              <p className="text-sm text-steel-500 mt-1">
                Invite your team members to get started
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <AlertTriangle size={18} className="text-orange-500" />
          </div>
          <h2 className="font-semibold text-steel-900">Alert Center</h2>
          <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
            0 Alerts
          </span>
        </div>
        <div className="bg-steel-50 rounded-lg p-4 border border-steel-200/30">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-steel-200/50 flex items-center justify-center shrink-0">
              <CheckCircle size={16} className="text-steel-400" />
            </div>
            <div>
              <p className="text-sm text-steel-900 font-medium">All clear</p>
              <p className="text-sm text-steel-500 mt-0.5">
                No alerts yet. The alert engine will surface important
                notifications here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
