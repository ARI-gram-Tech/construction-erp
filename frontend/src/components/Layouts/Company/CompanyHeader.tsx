// frontend/src/components/Layouts/Company/Header.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Search,
  Settings,
  User,
  Command,
} from "lucide-react";

import type { Company } from "@/types/company";
import { NotificationDropdown } from "@/components/Notifications/NotificationDropdown";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface CompanyHeaderProps {
  company: Company | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  director: "Director",
  operations_manager: "Operations Manager",
  finance_manager: "Finance Manager",
  accountant: "Accountant",
  procurement_manager: "Procurement Manager",
  main_store_manager: "Main Store Manager",
  hr_manager: "HR Manager",
  project_manager: "Project Manager",
  site_manager: "Site Manager",
  site_engineer: "Site Engineer",
  foreman: "Foreman",
  qs: "Quantity Surveyor",
  storekeeper: "Site Storekeeper",
  procurement: "Procurement Officer",
  safety_officer: "Safety Officer",
  qa_qc_engineer: "QA/QC Engineer",
  plant_equipment_officer: "Plant & Equipment Officer",
  document_controller: "Document Controller",
  management: "Management",
  site_supervisor: "Site Supervisor",
  subcontractor: "Subcontractor",
  client: "Client",
  employee: "Employee",
};

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useCurrentUser();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  }

  const displayName =
    user && (user.first_name || user.last_name)
      ? `${user.first_name} ${user.last_name}`.trim()
      : user?.username || user?.email || "Loading...";

  const displayRole = user?.role
    ? (ROLE_LABELS[user.role] ?? user.role)
    : "No role";

  const initial = displayName.charAt(0).toUpperCase() || "U";

  // Get plan badge color
  const getPlanColor = (plan?: string) => {
    if (!plan) return "bg-steel-200 text-steel-700";
    switch (plan.toLowerCase()) {
      case "free":
        return "bg-steel-100 text-steel-600";
      case "pro":
        return "bg-orange-100 text-orange-700";
      case "enterprise":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-steel-100 text-steel-600";
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-steel-200/70 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="font-semibold text-xl tracking-tight text-steel-900">
            {company?.name ?? "Company Workspace"}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-steel-500">
              {company?.subscription?.plan
                ? `${company.subscription.plan.charAt(0).toUpperCase()}${company.subscription.plan.slice(1)} plan`
                : "Loading..."}
            </p>
            {company?.subscription?.plan && (
              <>
                <span className="w-1 h-1 rounded-full bg-steel-300" />
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPlanColor(
                    company.subscription.plan,
                  )}`}
                >
                  {company.subscription.plan.toUpperCase()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-steel-100/80 transition-colors text-steel-500 border border-steel-200/50">
          <Search size={18} />
          <span className="text-sm">Search...</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-steel-100 rounded text-steel-500 font-mono flex items-center gap-0.5">
            <Command size={10} />K
          </kbd>
        </button>

        <NotificationDropdown />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-lg hover:bg-steel-100/80 transition-colors border border-transparent hover:border-steel-200"
          >
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-medium text-sm shadow-sm shadow-orange-500/20">
              {initial}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-steel-900">
                {displayName}
              </p>
              <p className="text-xs text-steel-500">{displayRole}</p>
            </div>
            <ChevronDown
              size={16}
              className={`text-steel-400 hidden sm:block transition-transform duration-200 ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-steel-200/50 py-1.5 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-steel-200/50">
                  <p className="text-sm font-medium text-steel-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-steel-500 truncate">
                    {user?.email ?? ""}
                  </p>
                  <p className="text-xs text-steel-400 mt-0.5">{displayRole}</p>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <User size={16} className="text-steel-400" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <Settings size={16} className="text-steel-400" />
                  Settings
                </button>
                <div className="h-px bg-steel-200/50 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
