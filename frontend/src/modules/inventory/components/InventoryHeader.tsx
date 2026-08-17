// /src/modules/inventory/components/InventoryHeader.tsx
import {
  LayoutDashboard,
  Boxes,
  Warehouse as WarehouseIcon,
  History,
  ArrowLeftRight,
  Plus,
  Inbox,
} from "lucide-react";

type Tab =
  | "dashboard"
  | "items"
  | "warehouses"
  | "movements"
  | "timeline"
  | "requests";

interface InventoryHeaderProps {
  activeTab: Tab;
  onNewItem: () => void;
  onRecordMovement: () => void;
}

const TITLE_BY_TAB: Record<Tab, { label: string; icon: React.ElementType }> = {
  dashboard: { label: "Dashboard", icon: LayoutDashboard },
  items: { label: "Items", icon: Boxes },
  warehouses: { label: "Warehouses", icon: WarehouseIcon },
  movements: { label: "Movements", icon: History },
  timeline: { label: "Timeline", icon: ArrowLeftRight },
  requests: { label: "New Item Requests", icon: Inbox },
};

export function InventoryHeader({
  activeTab,
  onNewItem,
  onRecordMovement,
}: InventoryHeaderProps) {
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

        {activeTab !== "timeline" && activeTab !== "requests" && (
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === "items" && (
              <button
                onClick={onNewItem}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors"
              >
                <Plus size={16} />
                New Item
              </button>
            )}
            <button
              onClick={onRecordMovement}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <History size={18} />
              Record Movement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
