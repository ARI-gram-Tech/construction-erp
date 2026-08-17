// /src/modules/inventory/InventoryDashboard.tsx

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listStockItems,
  listWarehouses,
  listStockMovements,
  listPendingStockItemRequests,
} from "@/services/inventory";
import type { MovementKind } from "./components/RecordMovementModal";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  Building2,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  Plus,
  History,
  Inbox,
} from "lucide-react";

interface InventoryDashboardProps {
  onNavigateTab: (
    tab: "warehouses" | "movements" | "items" | "requests",
  ) => void;
  onOpenMovement: (kind: MovementKind) => void;
}

export function InventoryDashboard({
  onNavigateTab,
  onOpenMovement,
}: InventoryDashboardProps) {
  const navigate = useNavigate();
  const { data: items } = useFetch(() => listStockItems());
  const { data: warehouses } = useFetch(() => listWarehouses());
  const { data: movements } = useFetch(() => listStockMovements());
  const { data: pendingRequests } = useFetch(() =>
    listPendingStockItemRequests("pending"),
  );

  const metrics = useMemo(() => {
    if (!items || !warehouses || !movements) return null;

    const totalUnits = items.reduce(
      (sum, item) => sum + Number(item.total_quantity),
      0,
    );

    const lowStockItems = items.filter(
      (item) => Number(item.total_quantity) <= Number(item.reorder_level),
    );

    const today = new Date().toDateString();
    const todayIssues = movements.filter(
      (m) =>
        m.movement_type === "issue" &&
        new Date(m.created_at).toDateString() === today,
    );

    const mainWarehouse = warehouses.find((w) => w.location_type === "main");
    const siteStores = warehouses.filter((w) => w.location_type === "project");
    const transfersToday = movements.filter(
      (m) =>
        m.movement_type === "transfer_out" &&
        new Date(m.created_at).toDateString() === today,
    );

    return {
      totalUnits: totalUnits.toLocaleString(),
      lowStockCount: lowStockItems.length,
      todayIssuesCount: todayIssues.length,
      mainWarehouse: mainWarehouse?.name || "Main Warehouse",
      siteStoresCount: siteStores.length,
      pendingTransfersCount: transfersToday.length,
      pendingRequestsCount: pendingRequests?.length ?? 0,
    };
  }, [items, warehouses, movements, pendingRequests]);

  if (!metrics)
    return <div className="text-steel-500">Loading dashboard...</div>;

  const recentMovements = movements?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-steel-500">Total Stock Units</p>
              <p className="text-2xl font-semibold text-steel-900">
                {metrics.totalUnits}
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Package size={20} className="text-orange-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-steel-500">Low Stock Items</p>
              <p className="text-2xl font-semibold text-red-600">
                {metrics.lowStockCount}
              </p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-steel-500">Today's Issues</p>
              <p className="text-2xl font-semibold text-steel-900">
                {metrics.todayIssuesCount}
              </p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <TrendingUp size={20} className="text-amber-500" />
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("requests")}
          className={`bg-white rounded-xl border p-5 cursor-pointer transition-colors ${
            metrics.pendingRequestsCount > 0
              ? "border-orange-200 hover:border-orange-300"
              : "border-steel-200/50 hover:border-steel-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-steel-500">New Item Requests</p>
              <p
                className={`text-2xl font-semibold ${
                  metrics.pendingRequestsCount > 0
                    ? "text-orange-600"
                    : "text-steel-900"
                }`}
              >
                {metrics.pendingRequestsCount}
              </p>
            </div>
            <div
              className={`p-2 rounded-lg ${
                metrics.pendingRequestsCount > 0
                  ? "bg-orange-50"
                  : "bg-steel-50"
              }`}
            >
              <Inbox
                size={20}
                className={
                  metrics.pendingRequestsCount > 0
                    ? "text-orange-500"
                    : "text-steel-400"
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warehouse Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-steel-200/50 p-5">
          <div className="flex items-center gap-2 text-steel-600">
            <Building2 size={16} />
            <span className="text-sm font-medium">Main Warehouse</span>
          </div>
          <p className="text-sm text-steel-500 mt-1">{metrics.mainWarehouse}</p>
          <button
            onClick={() => onNavigateTab("warehouses")}
            className="mt-3 text-xs text-orange-500 hover:text-orange-600 font-medium"
          >
            View Details →
          </button>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-5">
          <div className="flex items-center gap-2 text-steel-600">
            <Warehouse size={16} />
            <span className="text-sm font-medium">Site Stores</span>
          </div>
          <p className="text-sm text-steel-500 mt-1">
            {metrics.siteStoresCount} active stores
          </p>
          <button
            onClick={() => onNavigateTab("warehouses")}
            className="mt-3 text-xs text-orange-500 hover:text-orange-600 font-medium"
          >
            View All →
          </button>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-5">
          <div className="flex items-center gap-2 text-steel-600">
            <ArrowRightLeft size={16} />
            <span className="text-sm font-medium">Transfers Today</span>
          </div>
          <p className="text-sm text-steel-500 mt-1">
            {metrics.pendingTransfersCount} today
          </p>
          <button
            onClick={() => onNavigateTab("movements")}
            className="mt-3 text-xs text-orange-500 hover:text-orange-600 font-medium"
          >
            Review →
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-steel-200/50">
        <div className="p-5 border-b border-steel-200/50">
          <h2 className="text-sm font-semibold text-steel-900">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-steel-100">
          {recentMovements.length > 0 ? (
            recentMovements.map((movement) => {
              const iconMap = {
                receipt: <PackagePlus size={14} className="text-green-500" />,
                issue: <PackageMinus size={14} className="text-amber-500" />,
                transfer_out: (
                  <ArrowRightLeft size={14} className="text-blue-500" />
                ),
                transfer_in: (
                  <ArrowRightLeft size={14} className="text-blue-500" />
                ),
                adjustment: <History size={14} className="text-steel-500" />,
              };
              const labelMap = {
                receipt: "Received",
                issue: "Issued",
                transfer_out: "Transfer",
                transfer_in: "Transfer In",
                adjustment: "Adjusted",
              };
              return (
                <div
                  key={movement.id}
                  className="p-4 flex items-center justify-between hover:bg-steel-50/60 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate(`/company/inventory/movements/${movement.id}`)
                  }
                >
                  <div className="flex items-center gap-3">
                    {iconMap[movement.movement_type as keyof typeof iconMap]}
                    <div>
                      <p className="text-sm text-steel-900">
                        {
                          labelMap[
                            movement.movement_type as keyof typeof labelMap
                          ]
                        }{" "}
                        {movement.item_name}
                      </p>
                      <p className="text-xs text-steel-500">
                        {Number(movement.quantity).toLocaleString()} units ·{" "}
                        {movement.warehouse_name}
                        {movement.related_warehouse_name &&
                          ` → ${movement.related_warehouse_name}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-steel-400">
                    {new Date(movement.created_at).toLocaleTimeString()}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-steel-500 text-sm">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {metrics.pendingRequestsCount > 0 && (
          <button
            onClick={() => onNavigateTab("requests")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
          >
            <Inbox size={16} />
            Review {metrics.pendingRequestsCount} New Item Request
            {metrics.pendingRequestsCount === 1 ? "" : "s"}
          </button>
        )}
        <button
          onClick={() => onOpenMovement("receive")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          <PackagePlus size={16} />
          Receive Stock
        </button>
        <button
          onClick={() => onOpenMovement("issue")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
        >
          <PackageMinus size={16} />
          Issue Stock
        </button>
        <button
          onClick={() => onOpenMovement("transfer")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          <ArrowRightLeft size={16} />
          Transfer
        </button>
        <button
          onClick={() => navigate("/company/inventory/items/new")}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>
    </div>
  );
}
