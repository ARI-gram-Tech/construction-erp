// /frontend/src/modules/projects/ProjectProcurement/components/ProcurementPageHeader.tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { LayoutDashboard, ClipboardList, History, Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PROCUREMENT_CREATE_ROLES } from "@/constants/projectRoles";

type Tab = "dashboard" | "requests" | "history";

const TITLE_BY_TAB: Record<Tab, { label: string; icon: React.ElementType }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  requests: { label: "Requests", icon: ClipboardList },
  history: { label: "History", icon: History },
};

// Only Dashboard/Requests get the "New Purchase Request" action —
// History is a read-only trail, same reasoning as
// ProjectInventoryHeader's SHOW_ACTIONS list.
const SHOW_NEW_REQUEST: Tab[] = ["dashboard", "requests"];

export function ProcurementPageHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: me } = useCurrentUser();
  const canCreate =
    !!me?.role && (PROCUREMENT_CREATE_ROLES as string[]).includes(me.role);

  const basePath = `/projects/${projectId}/procurement`;

  // Whatever comes after the base path — "", "requests", "history",
  // "new", or a numeric PR id like "4". Trailing slashes stripped so
  // "/procurement/" and "/procurement" match the same case.
  const rest = location.pathname
    .slice(basePath.length)
    .replace(/^\/+|\/+$/g, "");

  // A specific PR ("4") or the new-request form ("new") each render
  // their own title/back-link already (see PurchaseRequestDetailPage
  // and NewPurchaseRequestPage) — this header would just be a second,
  // and previously WRONG, "Dashboard" title stacked above them, since
  // neither path matched any of the three known tabs below.
  const isDetailOrNewRoute = rest === "new" || /^\d+$/.test(rest);
  if (isDetailOrNewRoute) return null;

  const activeTab: Tab = rest.startsWith("history")
    ? "history"
    : rest.startsWith("requests")
      ? "requests"
      : "dashboard";

  const { label: title, icon: TitleIcon } = TITLE_BY_TAB[activeTab];

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
            <TitleIcon size={24} className="text-orange-500" />
          </div>
          {title}
        </h1>

        {SHOW_NEW_REQUEST.includes(activeTab) && canCreate && (
          <button
            onClick={() => navigate(`/projects/${projectId}/procurement/new`)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            <Plus size={16} />
            New Purchase Request
          </button>
        )}
      </div>
    </div>
  );
}
