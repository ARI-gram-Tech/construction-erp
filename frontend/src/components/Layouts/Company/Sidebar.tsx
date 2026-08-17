// frontend/src/components/Layouts/Company/Sidebar.tsx
import {
  Building2,
  LayoutDashboard,
  FolderKanban,
  Wallet,
  ShoppingCart,
  Boxes,
  Users,
  BarChart3,
  FileText,
  Truck,
  Warehouse,
  MessageSquare,
  Settings as SettingsIcon,
  FileSpreadsheet,
} from "lucide-react";
import { SidebarLink } from "@/components/Layouts/SidebarLink";
import type { Company } from "@/types/company";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { TENDER_VIEW_ROLES } from "@/constants/projectRoles";

interface CompanySidebarProps {
  company: Company | null;
}

// Per-role dashboard landing page — mirrors the redirect logic in
// LoginPage.tsx, so clicking "Dashboard" from anywhere always lands
// a role on their own dashboard rather than the generic company one.
const DASHBOARD_PATH_BY_ROLE: Record<string, string> = {
  site_engineer: "/company/dashboard/site-engineer",
  qs: "/company/dashboard/qs",
};

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  // Allow-list: omit to show to every role. Only set this where access
  // should genuinely be restricted.
  roles?: string[];
  // Deny-list: for the common case of "everyone except this one role"
  // (e.g. storekeeper), which would otherwise mean rewriting `roles`
  // as a full allow-list on every unrelated nav item just to exclude
  // one role from it.
  hiddenForRoles?: string[];
}

const ADMIN_ROLES = [
  "company_admin",
  "director",
  "management",
  "operations_manager",
];

function buildNav(dashboardPath: string): NavItem[] {
  return [
    { to: dashboardPath, label: "Dashboard", icon: LayoutDashboard },
    {
      to: "/company/profile",
      label: "Company",
      icon: Building2,
      hiddenForRoles: ["storekeeper"],
    },
    {
      to: "/company/projects",
      label: "Projects",
      icon: FolderKanban,
      hiddenForRoles: ["storekeeper"],
    },
    {
      to: "/company/tenders",
      label: "Tenders",
      icon: FileSpreadsheet,
      roles: TENDER_VIEW_ROLES,
    },
    {
      to: "/company/employees",
      label: "Employees",
      icon: Users,
      roles: [...ADMIN_ROLES, "hr_manager"],
    },
    {
      to: "/company/documents",
      label: "Documents",
      icon: FileText,
      hiddenForRoles: ["storekeeper"],
    },
    { to: "/company/inventory", label: "Inventory", icon: Boxes },
    {
      to: "/company/fleet",
      label: "Fleet & Equipment",
      icon: Truck,
      hiddenForRoles: ["storekeeper"],
    },
    {
      to: "/company/warehouse",
      label: "Warehouse",
      icon: Warehouse,
      hiddenForRoles: ["storekeeper"],
    },
    {
      to: "/company/suppliers",
      label: "Suppliers",
      icon: Truck,
      hiddenForRoles: ["storekeeper"],
    },
    {
      to: "/company/procurement",
      label: "Procurement",
      icon: ShoppingCart,
      roles: [
        ...ADMIN_ROLES,
        "project_manager",
        "procurement_manager",
        "procurement",
      ],
    },
    {
      to: "/company/finance",
      label: "Finance",
      icon: Wallet,
      roles: [...ADMIN_ROLES, "finance_manager", "accountant", "qs"],
    },
    {
      to: "/company/reports",
      label: "Reports",
      icon: BarChart3,
      hiddenForRoles: ["storekeeper"],
    },
    { to: "/company/messages", label: "Messages", icon: MessageSquare },
    {
      to: "/company/settings",
      label: "Settings",
      icon: SettingsIcon,
      roles: ADMIN_ROLES,
    },
  ];
}

export function CompanySidebar({ company }: CompanySidebarProps) {
  const { data: user } = useCurrentUser();
  const role = user?.role ?? "";
  const dashboardPath = DASHBOARD_PATH_BY_ROLE[role] ?? "/company/dashboard";

  const nav = buildNav(dashboardPath).filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.hiddenForRoles && item.hiddenForRoles.includes(role)) return false;
    return true;
  });

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-steel-200/70 flex flex-col shadow-sm">
      {/* Brand Section - Light version */}
      <div className="px-5 py-6 border-b border-steel-200/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-orange-500/20 shrink-0">
            <Building2 size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-steel-900 truncate">
              {company?.name ?? "Loading..."}
            </p>
            <p className="text-xs text-steel-500 truncate">
              {company?.subscription?.plan
                ? `${company.subscription.plan.charAt(0).toUpperCase()}${company.subscription.plan.slice(1)} Plan`
                : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation - Light version */}
      <nav className="flex-1 px-3 py-6 space-y-0.5 overflow-y-auto">
        {nav.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-steel-200/50">
        <div className="flex items-center justify-between text-xs text-steel-400">
          <span>v2.0.0</span>
          <span>© 2026</span>
        </div>
      </div>
    </aside>
  );
}
