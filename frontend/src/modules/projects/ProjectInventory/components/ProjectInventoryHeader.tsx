// frontend/src/modules/projects/ProjectInventory/components/ProjectInventoryHeader.tsx
import {
  LayoutDashboard,
  Package,
  History,
  ArrowRightLeft,
  Users,
  FileText,
  Clock,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  Truck,
} from "lucide-react";

type Tab =
  | "overview"
  | "stock"
  | "movements"
  | "transfers"
  | "requests"
  | "documents"
  | "audit";

interface ProjectInventoryHeaderProps {
  activeTab: Tab;
  onReceive: () => void;
  onIssue: () => void;
  onTransfer: () => void;
  onAdjust: () => void;
  onRequestRestock: () => void;
}

const TITLE_BY_TAB: Record<Tab, { label: string; icon: React.ElementType }> = {
  overview: { label: "Overview", icon: LayoutDashboard },
  stock: { label: "Stock", icon: Package },
  movements: { label: "Movements", icon: History },
  transfers: { label: "Transfers", icon: ArrowRightLeft },
  requests: { label: "Requests", icon: Users },
  documents: { label: "Documents", icon: FileText },
  audit: { label: "Audit", icon: Clock },
};

// Only tabs where recording a movement is the obviously relevant action
// get the quick-action buttons — Documents/Requests/Audit are read-only
// views, a movement button there would be a non-sequitur.
const SHOW_ACTIONS: Tab[] = ["overview", "stock", "movements", "transfers"];

export function ProjectInventoryHeader({
  activeTab,
  onReceive,
  onIssue,
  onTransfer,
  onAdjust,
  onRequestRestock,
}: ProjectInventoryHeaderProps) {
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

        {SHOW_ACTIONS.includes(activeTab) && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onReceive}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              <PackagePlus size={16} />
              Receive
            </button>
            <button
              onClick={onIssue}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              <PackageMinus size={16} />
              Issue
            </button>
            <button
              onClick={onTransfer}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <ArrowRightLeft size={16} />
              Transfer
            </button>
            <button
              onClick={onAdjust}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors"
            >
              <SlidersHorizontal size={16} />
              Adjust
            </button>
            <button
              onClick={onRequestRestock}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <Truck size={16} />
              Request Restock
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
