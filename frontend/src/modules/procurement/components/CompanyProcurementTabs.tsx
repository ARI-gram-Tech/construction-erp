// frontend/src/modules/procurement/components/CompanyProcurementTabs.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, FileText, Truck } from "lucide-react";

export type CompanyProcurementTab =
  | "dashboard"
  | "requests"
  | "lpos"
  | "suppliers";

interface NavItem {
  key: CompanyProcurementTab;
  label: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "", icon: LayoutDashboard },
  {
    key: "requests",
    label: "Purchase Requests",
    path: "requests",
    icon: ClipboardList,
  },
  { key: "lpos", label: "LPOs", path: "lpos", icon: FileText },
  { key: "suppliers", label: "Suppliers", path: "suppliers", icon: Truck },
];

export function CompanyProcurementTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = (): CompanyProcurementTab => {
    const path = location.pathname;
    if (path.includes("/company/procurement/requests")) return "requests";
    if (path.includes("/company/procurement/lpos")) return "lpos";
    if (path.includes("/company/procurement/suppliers")) return "suppliers";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  return (
    <div className="border-b border-steel-200/50 flex gap-6 overflow-x-auto">
      {NAV_ITEMS.map(({ key, label, path, icon: Icon }) => (
        <button
          key={key}
          onClick={() => navigate(`/company/procurement/${path}`)}
          className={`pb-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === key
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
