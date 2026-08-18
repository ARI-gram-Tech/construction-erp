import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Truck,
  Plus,
  Search,
  Filter,
} from "lucide-react";

export type CompanyProcurementTab =
  | "dashboard"
  | "requests"
  | "lpos"
  | "suppliers";

interface CompanyProcurementHeaderProps {
  requestCount: number | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  hasActiveFilters: boolean;
  onRecordLPO?: () => void;
}

const TITLE_BY_TAB: Record<
  CompanyProcurementTab,
  { label: string; icon: React.ElementType }
> = {
  dashboard: { label: "Procurement Overview", icon: LayoutDashboard },
  requests: { label: "Purchase Requests", icon: ClipboardList },
  lpos: { label: "Local Purchase Orders", icon: FileText },
  suppliers: { label: "Suppliers", icon: Truck },
};

export function CompanyProcurementHeader({
  requestCount,
  searchTerm,
  setSearchTerm,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  onRecordLPO,
}: CompanyProcurementHeaderProps) {
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
  const { label: title, icon: TitleIcon } = TITLE_BY_TAB[activeTab];

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
              <TitleIcon size={24} className="text-orange-500" />
            </div>
            {title}
          </h1>

          {activeTab === "requests" && requestCount !== null && (
            <p className="text-steel-500 text-sm mt-1.5 ml-12">
              {requestCount} request{requestCount !== 1 ? "s" : ""} across every
              project you have visibility into
            </p>
          )}

          {activeTab === "dashboard" && (
            <p className="text-steel-500 text-sm mt-1.5 ml-12">
              Every purchase request across every project you have visibility
              into.
            </p>
          )}

          {activeTab === "lpos" && (
            <p className="text-steel-500 text-sm mt-1.5 ml-12">
              Every LPO — generated or manually recorded — across every project.
            </p>
          )}
        </div>

        {/* Tab-specific actions and controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === "requests" && (
            <>
              <div className="relative w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
                />
                <input
                  type="text"
                  placeholder="Search requests or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-steel-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors shrink-0 ${
                  showFilters
                    ? "bg-orange-50 border-orange-300 text-orange-600"
                    : "border-steel-300 text-steel-600 hover:bg-steel-50"
                }`}
              >
                <Filter size={16} />
                Filters
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                )}
              </button>
            </>
          )}

          {activeTab === "lpos" && onRecordLPO && (
            <button
              onClick={onRecordLPO}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md shrink-0"
            >
              <Plus size={16} />
              Record LPO
            </button>
          )}

          {activeTab === "suppliers" && (
            <button
              onClick={() => navigate("/company/suppliers/new")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md shrink-0"
            >
              <Plus size={16} />
              New Supplier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
