// /modules/projects/ProjectProcurement/components/ProcurementHeader.tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LayoutDashboard, ClipboardList, History } from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "" },
  { label: "Requests", icon: ClipboardList, path: "requests" },
  { label: "History", icon: History, path: "history" },
];

// Same underline tab style as Inventory's tab row and the other
// Procurement header — pure navigation, no title/card wrapper here.
export function ProcurementHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

  const basePath = `/projects/${projectId}/procurement`;

  // Same "rest" parsing as ProcurementPageHeader — whatever comes
  // after the base path, slashes trimmed: "", "requests", "history",
  // "new", or a numeric PR id like "4".
  const rest = location.pathname
    .slice(basePath.length)
    .replace(/^\/+|\/+$/g, "");

  // A PR detail page ("4") or the new-request form ("new") both live
  // under Requests conceptually — creating/viewing a request is part
  // of that section, even though the URL isn't nested under
  // "/requests/". Without this, neither route matched any tab's
  // isActive() check, so the tab row showed nothing underlined while
  // looking at a request.
  const isRequestsScoped = rest === "new" || /^\d+$/.test(rest);

  const isActive = (path: string) => {
    if (path === "requests" && isRequestsScoped) return true;
    if (path === "") {
      return (
        location.pathname === basePath || location.pathname === `${basePath}/`
      );
    }
    return location.pathname.startsWith(`${basePath}/${path}`);
  };

  return (
    <div className="border-b border-steel-200/50 flex gap-6 overflow-x-auto">
      {navItems.map(({ icon: Icon, label, path }) => (
        <button
          key={path}
          onClick={() => navigate(path ? `${basePath}/${path}` : basePath)}
          className={`pb-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            isActive(path)
              ? "border-orange-500 text-steel-900"
              : "border-transparent text-steel-500 hover:text-steel-700"
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
