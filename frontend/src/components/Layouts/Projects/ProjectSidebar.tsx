// frontend/src/components/Layouts/Projects/ProjectSidebar.tsx
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  CalendarRange,
  FileText,
  Calculator,
  ShoppingCart,
  Boxes,
  HardHat,
  Users,
  Wallet,
  BarChart3,
  GitPullRequest,
  Coins,
} from "lucide-react";

import {
  PROCUREMENT_INVOLVED_ROLES,
  FINANCE_INVOLVED_ROLES,
  QS_INVOLVED_ROLES,
} from "@/constants/projectRoles";

import { SidebarLink } from "@/components/Layouts/SidebarLink";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Project } from "@/types/project";

interface ProjectSidebarProps {
  project: Project | null;
  loading: boolean;
}

interface ProjectNavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  // Omit to show to every project role. Only items where access should
  // genuinely be narrowed carry this — most of the sidebar stays open
  // to any team member, since being on the project at all already
  // implies some legitimate reason to see it.
  roles?: string[];
}

function nav(projectId: string): ProjectNavItem[] {
  const base = `/projects/${projectId}`;
  return [
    { to: `${base}/overview`, label: "Overview", icon: LayoutDashboard },
    { to: `${base}/documents`, label: "Documents", icon: FileText },
    {
      to: `${base}/boq`,
      label: "BOQ",
      icon: Calculator,
      roles: QS_INVOLVED_ROLES,
    },
    {
      to: `${base}/cost-control`,
      label: "Cost Control",
      icon: Coins,
      roles: QS_INVOLVED_ROLES,
    },
    {
      to: `${base}/variations`,
      label: "Variations & IPCs",
      icon: GitPullRequest,
      roles: QS_INVOLVED_ROLES,
    },
    { to: `${base}/planning`, label: "Planning", icon: CalendarRange },
    {
      to: `${base}/procurement`,
      label: "Procurement",
      icon: ShoppingCart,
      // Not storekeeper (their world is Inventory, not raising/tracking
      // spend requests), not client/subcontractor — everyone else who's
      // realistically involved in "what do we need to buy" stays.
      roles: PROCUREMENT_INVOLVED_ROLES,
    },
    { to: `${base}/inventory`, label: "Inventory", icon: Boxes },
    { to: `${base}/site`, label: "Site", icon: HardHat },
    { to: `${base}/team`, label: "Team", icon: Users },
    {
      to: `${base}/finance`,
      label: "Finance",
      icon: Wallet,
      roles: FINANCE_INVOLVED_ROLES,
    },
    { to: `${base}/reports`, label: "Reports", icon: BarChart3 },
  ];
}

export function ProjectSidebar({ project, loading }: ProjectSidebarProps) {
  const { projectId = "" } = useParams();
  const { data: user } = useCurrentUser();
  const role = user?.role ?? "";

  const items = nav(projectId).filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-steel-200/70 flex flex-col shadow-sm">
      {/* Back Button */}
      <div className="px-3 pt-4 pb-2 border-b border-steel-200/50">
        <Link
          to="/company/projects"
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-steel-500 hover:text-steel-900 rounded-lg hover:bg-steel-100/80 transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="font-medium">All Projects</span>
        </Link>
      </div>

      {/* Project Info */}
      <div className="px-4 py-4 border-b border-steel-200/50">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-orange-500/20 shrink-0">
            {project?.name?.charAt(0).toUpperCase() ?? "P"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-steel-900 truncate">
              {loading ? "Loading..." : (project?.name ?? "Project")}
            </p>
            <p className="text-xs text-steel-500 truncate">
              {project?.client_detail?.name ?? "No client"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-steel-200/50">
        <div className="flex items-center justify-between text-xs text-steel-400">
          <span>Project ID: #{projectId}</span>
          <span>v2.0.0</span>
        </div>
      </div>
    </aside>
  );
}
