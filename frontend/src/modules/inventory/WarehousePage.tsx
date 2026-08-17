// /src/modules/inventory/WarehousePage.tsx

import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  listStockLevels,
  listStockMovements,
  listWarehouses,
  listStockItems,
} from "@/services/inventory";
import type { MovementType } from "@/types/inventory";
import { MovementDrawer } from "./components/MovementDrawer";
import {
  RecordMovementModal,
  type MovementKind,
} from "./components/RecordMovementModal";
import { RequestRestockModal } from "../projects/ProjectInventory/components/RequestRestockModal";
import { RestockRequestsTab } from "./components/RestockRequestsTab";
import {
  ArrowLeft,
  Boxes,
  History,
  ArrowRightLeft,
  FileText,
  Clock,
  Package,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Printer,
  Eye,
  MoreVertical,
  Building2,
  MapPin,
  Truck,
} from "lucide-react";

// (users icon no longer used since project count moved into the
// merged header — removed from the import list above)

type Tab =
  | "overview"
  | "stock"
  | "movements"
  | "transfers"
  | "requests"
  | "documents"
  | "audit";

const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: "Received",
  issue: "Issued",
  transfer_out: "Transfer Out",
  transfer_in: "Transfer In",
  adjustment: "Adjustment",
};

const MOVEMENT_STYLES: Record<MovementType, string> = {
  receipt: "bg-green-50 text-green-700 border-green-200",
  issue: "bg-amber-50 text-amber-700 border-amber-200",
  transfer_out: "bg-blue-50 text-blue-700 border-blue-200",
  transfer_in: "bg-blue-50 text-blue-700 border-blue-200",
  adjustment: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_STYLES = {
  healthy: "bg-green-50 text-green-700",
  low: "bg-red-50 text-red-700",
  critical: "bg-red-100 text-red-800",
  overstock: "bg-blue-50 text-blue-700",
};

const STATUS_ICONS = {
  healthy: <CheckCircle size={16} className="text-green-500" />,
  low: <AlertTriangle size={16} className="text-red-500" />,
  critical: <XCircle size={16} className="text-red-600" />,
  overstock: <TrendingUp size={16} className="text-blue-500" />,
};

// Tabs where recording a movement is the obviously relevant action —
// mirrors the SHOW_ACTIONS pattern in ProjectInventoryHeader.tsx so the
// two warehouse-style pages behave consistently.
const SHOW_ACTIONS: Tab[] = ["overview", "stock", "movements", "transfers"];

export function WarehousePage() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const id = Number(warehouseId);

  const { data: me } = useCurrentUser();
  // Transfer/Adjust hit can_manage_warehouse_logistics on the backend —
  // storekeeper doesn't have that permission and would just get a 403.
  // Matches the same restriction already applied on
  // ProjectInventoryHeader.tsx.
  const isStorekeeper = me?.role === "storekeeper";

  // UI State
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showModal, setShowModal] = useState(false);
  const [modalKind, setModalKind] = useState<MovementKind>("receive");
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Data fetching — fetch the FULL list, not just this one warehouse,
  // otherwise the transfer destination dropdown has nothing to offer.
  const { data: warehouses, reload: reloadWarehouses } = useFetch(() =>
    listWarehouses(),
  );
  const warehouse = warehouses?.find((w) => w.id === id);
  const { data: items } = useFetch(() => listStockItems());
  const { data: levels, reload: reloadLevels } = useFetch(
    () => listStockLevels({ warehouse: id }),
    [id],
  );
  const { data: movements, reload: reloadMovements } = useFetch(
    () => listStockMovements({ warehouse: id }),
    [id],
  );

  // reorder_level and category live on StockItem, not StockLevel
  const itemReorderMap = useMemo(() => {
    const map = new Map<number, number>();
    items?.forEach((i) => map.set(i.id, Number(i.reorder_level)));
    return map;
  }, [items]);

  const itemCategoryMap = useMemo(() => {
    const map = new Map<number, string>();
    items?.forEach((i) => map.set(i.id, i.category));
    return map;
  }, [items]);

  // Computed metrics
  const metrics = useMemo(() => {
    if (!levels || !movements || !warehouse) return null;

    const totalItems = levels.length;
    const totalQuantity = levels.reduce(
      (sum, l) => sum + Number(l.quantity),
      0,
    );
    const lowStockItems = levels.filter(
      (l) => Number(l.quantity) <= (itemReorderMap.get(l.item) || 0),
    );

    const today = new Date().toDateString();
    const todayMovements = movements.filter(
      (m) => new Date(m.created_at).toDateString() === today,
    );

    return {
      totalItems,
      totalQuantity,
      lowStockCount: lowStockItems.length,
      todayMovements: todayMovements.length,
      totalMovements: movements.length,
    };
  }, [levels, movements, warehouse, itemReorderMap]);

  // Filtered and sorted stock levels
  const filteredLevels = useMemo(() => {
    if (!levels) return [];

    let list = [...levels];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.item_name.toLowerCase().includes(q) ||
          l.item_code.toLowerCase().includes(q),
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter((l) => itemCategoryMap.get(l.item) === categoryFilter);
    }

    // Stock status filter
    if (statusFilter === "low") {
      list = list.filter(
        (l) => Number(l.quantity) <= (itemReorderMap.get(l.item) || 0),
      );
    } else if (statusFilter === "critical") {
      list = list.filter(
        (l) => Number(l.quantity) <= (itemReorderMap.get(l.item) || 0) / 2,
      );
    } else if (statusFilter === "healthy") {
      list = list.filter(
        (l) => Number(l.quantity) > (itemReorderMap.get(l.item) || 0) * 1.5,
      );
    }

    // Low stock only toggle
    if (lowStockOnly) {
      list = list.filter(
        (l) => Number(l.quantity) <= (itemReorderMap.get(l.item) || 0),
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.item_name.localeCompare(b.item_name);
          break;
        case "code":
          cmp = a.item_code.localeCompare(b.item_code);
          break;
        case "quantity":
          cmp = Number(a.quantity) - Number(b.quantity);
          break;
        case "reorder":
          cmp =
            (itemReorderMap.get(a.item) || 0) -
            (itemReorderMap.get(b.item) || 0);
          break;
        default:
          cmp = 0;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [
    levels,
    searchQuery,
    categoryFilter,
    statusFilter,
    lowStockOnly,
    sortBy,
    sortOrder,
    itemCategoryMap,
    itemReorderMap,
  ]);

  // Get stock status
  function getStockStatus(level: { quantity: number | string; item: number }) {
    const qty = Number(level.quantity);
    const reorder = itemReorderMap.get(level.item) || 0;

    if (reorder === 0) return { status: "healthy", label: "Healthy" };
    if (qty <= reorder / 2) return { status: "critical", label: "Critical" };
    if (qty <= reorder) return { status: "low", label: "Low" };
    if (qty > reorder * 2) return { status: "overstock", label: "Overstock" };
    return { status: "healthy", label: "Healthy" };
  }

  function reloadAll() {
    reloadLevels();
    reloadMovements();
    reloadWarehouses();
  }

  function openMovement(kind: MovementKind) {
    setModalKind(kind);
    setShowModal(true);
  }

  const handleMovementClick = (movementId: number) => {
    setSelectedMovement(movementId);
    setShowDrawer(true);
  };

  if (!warehouse) return <div className="text-steel-500">Loading...</div>;

  const total = levels?.reduce((sum, l) => sum + Number(l.quantity), 0) ?? 0;

  // Request Restock creates a PurchaseRequest tied to a project — it
  // only makes sense on a site store (warehouse.project set), not on
  // the Main Warehouse, and only for the storekeeper who'd be asking.
  const canRequestRestock = isStorekeeper && !!warehouse.project;

  const tabs = [
    { key: "overview", label: "Overview", icon: Boxes },
    { key: "stock", label: "Stock", icon: Package },
    { key: "movements", label: "Movements", icon: History },
    { key: "transfers", label: "Transfers", icon: ArrowRightLeft },
    { key: "requests", label: "Requests", icon: Truck },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "audit", label: "Audit", icon: Clock },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Breadcrumb — only shown when the user could plausibly have
          come from the company inventory dashboard. A storekeeper
          lands here straight off the sidebar via InventoryEntryPoint's
          redirect, and /company/inventory would just bounce them right
          back — so "Back to Inventory" points nowhere useful for them. */}
      {!isStorekeeper && (
        <Link
          to="/company/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-800 transition-colors"
        >
          <ArrowLeft size={14} />
          Inventory
        </Link>
      )}

      {/* Tabs — now sit above the identity card as their own row, so
          workspace navigation anchors the page before the warehouse's
          own details */}
      <div className="bg-white rounded-xl border border-steel-200/70 px-6">
        <div className="flex gap-6 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex items-center gap-1.5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? "text-steel-900"
                  : "text-steel-500 hover:text-steel-800"
              }`}
            >
              <Icon size={14} />
              {label}
              {activeTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full transition-all duration-200" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Warehouse identity + actions */}
      <div className="bg-white rounded-2xl border border-steel-200/70 overflow-hidden">
        <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-orange-500" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-steel-900 truncate">
                {warehouse.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-steel-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    {warehouse.is_active && (
                      <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        warehouse.is_active ? "bg-green-500" : "bg-steel-400"
                      }`}
                    />
                  </span>
                  <span
                    className={
                      warehouse.is_active
                        ? "text-green-700 font-medium"
                        : "text-steel-500 font-medium"
                    }
                  >
                    {warehouse.is_active ? "Operational" : "Inactive"}
                  </span>
                </span>
                <span>•</span>
                <span>
                  {warehouse.location_type === "main"
                    ? "Main Warehouse"
                    : "Site Store"}
                </span>
                {warehouse.project && (
                  <>
                    <span>•</span>
                    <span>Project #{warehouse.project}</span>
                  </>
                )}
                {warehouse.address && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {warehouse.address}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {SHOW_ACTIONS.includes(activeTab) && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => openMovement("receive")}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
              >
                <PackagePlus size={16} />
                Receive
              </button>
              <button
                onClick={() => openMovement("issue")}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
              >
                <PackageMinus size={16} />
                Issue
              </button>
              {!isStorekeeper && (
                <>
                  <button
                    onClick={() => openMovement("transfer")}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                  >
                    <ArrowRightLeft size={16} />
                    Transfer
                  </button>
                  <button
                    onClick={() => openMovement("adjust")}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                  >
                    <SlidersHorizontal size={16} />
                    Adjust
                  </button>
                </>
              )}
              {canRequestRestock && (
                <button
                  onClick={() => setShowRestockModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                >
                  <Truck size={16} />
                  Request Restock
                </button>
              )}
              <button className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.98]">
                <Printer size={16} />
                Reports
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Stats — single source of truth, was previously duplicated
              in a header row above the tabs too */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-steel-200/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-xs text-steel-500 flex items-center gap-1">
                <Package size={12} />
                Total Items
              </p>
              <p className="text-2xl font-semibold text-steel-900">
                {metrics?.totalItems || 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-steel-200/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-xs text-steel-500 flex items-center gap-1">
                <Boxes size={12} />
                Total Quantity
              </p>
              <p className="text-2xl font-semibold text-steel-900">
                {total.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-steel-200/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-xs text-steel-500 flex items-center gap-1">
                <AlertTriangle size={12} className="text-red-500" />
                Low Stock
              </p>
              <p className="text-2xl font-semibold text-red-600">
                {metrics?.lowStockCount || 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-steel-200/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
              <p className="text-xs text-steel-500 flex items-center gap-1">
                <Clock size={12} className="text-blue-500" />
                Today's Movements
              </p>
              <p className="text-2xl font-semibold text-steel-900">
                {metrics?.todayMovements || 0}
              </p>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-steel-200/50 p-6">
            <h3 className="text-sm font-semibold text-steel-900 mb-4">
              Alerts
            </h3>
            <div className="space-y-3">
              {levels
                ?.filter(
                  (l) =>
                    Number(l.quantity) <= (itemReorderMap.get(l.item) || 0),
                )
                .slice(0, 5)
                .map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 text-sm p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <AlertTriangle
                      size={16}
                      className="text-red-500 shrink-0"
                    />
                    <span className="flex-1 text-red-700">
                      {l.item_name} below reorder level ({Number(l.quantity)}{" "}
                      {l.item_unit} remaining)
                    </span>
                    <button className="text-xs text-red-600 hover:text-red-800 font-medium">
                      Reorder
                    </button>
                  </div>
                ))}
              {(!levels ||
                levels.filter(
                  (l) =>
                    Number(l.quantity) <= (itemReorderMap.get(l.item) || 0),
                ).length === 0) && (
                <p className="text-sm text-steel-500">No alerts at this time</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-steel-200/50">
            <div className="p-4 border-b border-steel-200/50">
              <h3 className="text-sm font-semibold text-steel-900">
                Recent Activity
              </h3>
            </div>
            <div className="divide-y divide-steel-100">
              {movements?.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleMovementClick(m.id)}
                  className="p-4 flex items-center justify-between hover:bg-steel-50/60 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${MOVEMENT_STYLES[m.movement_type]}`}
                      >
                        {MOVEMENT_LABELS[m.movement_type]}
                      </span>
                      <p className="text-sm text-steel-900">{m.item_name}</p>
                    </div>
                    <p className="text-xs text-steel-500 mt-0.5">
                      {Number(m.quantity).toLocaleString()} units ·{" "}
                      {m.performed_by_name || "System"}
                      {m.reference && ` · Ref: ${m.reference}`}
                    </p>
                  </div>
                  <span className="text-xs text-steel-400">
                    {new Date(m.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {(!movements || movements.length === 0) && (
                <div className="p-8 text-center text-steel-500 text-sm">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "stock" && (
        <>
          {/* Search and Filter Bar */}
          <div className="bg-white rounded-xl border border-steel-200/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or code..."
                  className="w-full border border-steel-300 rounded-lg pl-9 pr-3 py-2 text-sm"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                <option value="materials">Building Materials</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="tools">Tools</option>
                <option value="safety">Safety Equipment</option>
                <option value="other">Other</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="healthy">Healthy</option>
                <option value="low">Low Stock</option>
                <option value="critical">Critical</option>
                <option value="overstock">Overstock</option>
              </select>

              <label className="flex items-center gap-2 text-sm text-steel-600 px-1">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  className="rounded border-steel-300"
                />
                Low Stock Only
              </label>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="code">Sort by Code</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="reorder">Sort by Reorder Level</option>
              </select>

              <button
                onClick={() =>
                  setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                }
                className="px-3 py-2 text-sm border border-steel-300 rounded-lg hover:bg-steel-50"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
            {filteredLevels.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50 bg-steel-50/50">
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Available
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Reserved
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Reorder
                      </th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100">
                    {filteredLevels.map((level) => {
                      const status = getStockStatus(level);
                      const StatusIcon =
                        STATUS_ICONS[
                          status.status as keyof typeof STATUS_ICONS
                        ];

                      return (
                        <tr
                          key={level.id}
                          className="hover:bg-steel-50/60 transition-colors"
                        >
                          <td className="px-4 py-3 text-steel-500 font-mono text-xs">
                            {level.item_code}
                          </td>
                          <td className="px-4 py-3 font-medium text-steel-900">
                            {level.item_name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-steel-100 text-steel-600">
                              {itemCategoryMap.get(level.item) || "Other"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {Number(level.quantity).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-steel-500">
                            0
                          </td>
                          <td className="px-4 py-3 text-right text-steel-500">
                            {itemReorderMap.get(level.item)
                              ? itemReorderMap.get(level.item)!.toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-steel-500">
                            {level.item_unit}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[status.status as keyof typeof STATUS_STYLES]}`}
                            >
                              {StatusIcon}
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
                                title="View details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => openMovement("receive")}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-steel-400 hover:text-green-600 transition-colors"
                                title="Receive"
                              >
                                <PackagePlus size={16} />
                              </button>
                              <button
                                onClick={() => openMovement("issue")}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-steel-400 hover:text-amber-600 transition-colors"
                                title="Issue"
                              >
                                <PackageMinus size={16} />
                              </button>
                              {!isStorekeeper && (
                                <button
                                  onClick={() => openMovement("transfer")}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-steel-400 hover:text-blue-600 transition-colors"
                                  title="Transfer"
                                >
                                  <ArrowRightLeft size={16} />
                                </button>
                              )}
                              <button
                                className="p-1.5 rounded-lg hover:bg-purple-50 text-steel-400 hover:text-purple-600 transition-colors"
                                title="History"
                              >
                                <History size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Package size={24} className="text-steel-300 mx-auto mb-2" />
                <p className="text-sm text-steel-500">
                  {(levels?.length ?? 0) > 0
                    ? "No items match your search or filters."
                    : "No stock recorded at this warehouse yet."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "movements" && (
        <div className="space-y-4">
          {/* Movement filters */}
          <div className="bg-white rounded-xl border border-steel-200/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
                />
                <input
                  placeholder="Search movements..."
                  className="w-full border border-steel-300 rounded-lg pl-9 pr-3 py-2 text-sm"
                />
              </div>
              <select className="border border-steel-300 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Types</option>
                <option value="receipt">Receipt</option>
                <option value="issue">Issue</option>
                <option value="transfer_out">Transfer Out</option>
                <option value="transfer_in">Transfer In</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <select className="border border-steel-300 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-steel-400">to</span>
                <input
                  type="date"
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button className="px-3 py-2 text-sm font-medium rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 transition-colors ml-auto">
                Export
              </button>
            </div>
          </div>

          {/* Movement Cards */}
          <div className="space-y-3">
            {movements?.slice(0, 20).map((m) => {
              const style =
                MOVEMENT_STYLES[
                  m.movement_type as keyof typeof MOVEMENT_STYLES
                ] || MOVEMENT_STYLES.receipt;
              const label =
                MOVEMENT_LABELS[
                  m.movement_type as keyof typeof MOVEMENT_LABELS
                ] || m.movement_type;

              return (
                <div
                  key={m.id}
                  onClick={() => handleMovementClick(m.id)}
                  className="bg-white rounded-xl border border-steel-200/50 p-4 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border ${style}`}
                      >
                        {label}
                      </span>
                      <div>
                        <p className="font-medium text-steel-900">
                          {m.item_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-steel-500 mt-1">
                          <span>
                            {Number(m.quantity).toLocaleString()} units
                          </span>
                          {m.related_warehouse_name && (
                            <>
                              <span>·</span>
                              <span>
                                {m.warehouse_name} → {m.related_warehouse_name}
                              </span>
                            </>
                          )}
                          {m.reference && (
                            <>
                              <span>·</span>
                              <span className="font-mono">
                                Ref: {m.reference}
                              </span>
                            </>
                          )}
                          {m.performed_by_name && (
                            <>
                              <span>·</span>
                              <span>By: {m.performed_by_name}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="text-steel-400">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {(!movements || movements.length === 0) && (
              <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
                <History size={24} className="text-steel-300 mx-auto mb-2" />
                <p className="text-sm text-steel-500">
                  No movements recorded at this warehouse yet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "transfers" && (
        <div className="space-y-3">
          {movements
            ?.filter(
              (m) =>
                m.movement_type === "transfer_out" ||
                m.movement_type === "transfer_in",
            )
            .map((m) => (
              <div
                key={m.id}
                onClick={() => handleMovementClick(m.id)}
                className="bg-white rounded-xl border border-steel-200/50 p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border ${MOVEMENT_STYLES[m.movement_type]}`}
                    >
                      {MOVEMENT_LABELS[m.movement_type]}
                    </span>
                    <div>
                      <p className="font-medium text-steel-900">
                        {m.item_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-steel-500 mt-1">
                        <span>{Number(m.quantity).toLocaleString()} units</span>
                        {m.movement_type === "transfer_out" &&
                          m.related_warehouse_name && (
                            <>
                              <span>·</span>
                              <span>
                                {m.warehouse_name} → {m.related_warehouse_name}
                              </span>
                            </>
                          )}
                        {m.movement_type === "transfer_in" &&
                          m.related_warehouse_name && (
                            <>
                              <span>·</span>
                              <span>
                                {m.related_warehouse_name} → {m.warehouse_name}
                              </span>
                            </>
                          )}
                        {m.reference && (
                          <>
                            <span>·</span>
                            <span className="font-mono">
                              Ref: {m.reference}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span className="text-steel-400">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          {(!movements ||
            movements.filter(
              (m) =>
                m.movement_type === "transfer_out" ||
                m.movement_type === "transfer_in",
            ).length === 0) && (
            <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
              <ArrowRightLeft
                size={24}
                className="text-steel-300 mx-auto mb-2"
              />
              <p className="text-sm text-steel-500">
                No transfers involving this warehouse yet.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "requests" &&
        (warehouse.project ? (
          <RestockRequestsTab projectId={warehouse.project} />
        ) : (
          <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
            <Truck size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              Restock requests are made by project stores, not Main Warehouse.
            </p>
          </div>
        ))}

      {activeTab === "documents" && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
          <FileText size={24} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            Documents and attachments will appear here
          </p>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded-xl border border-steel-200/50">
          <div className="p-5 border-b border-steel-200/50">
            <h3 className="text-sm font-semibold text-steel-900">
              Audit Timeline
            </h3>
          </div>
          <div className="divide-y divide-steel-100">
            {movements?.slice(0, 20).map((m) => (
              <div
                key={m.id}
                onClick={() => handleMovementClick(m.id)}
                className="p-4 flex items-start gap-3 hover:bg-steel-50/60 transition-colors cursor-pointer"
              >
                <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-orange-500" />
                <div className="flex-1">
                  <p className="text-sm text-steel-900">
                    {m.performed_by_name || "System"}{" "}
                    {MOVEMENT_LABELS[
                      m.movement_type as keyof typeof MOVEMENT_LABELS
                    ]?.toLowerCase() || m.movement_type}{" "}
                    {Number(m.quantity).toLocaleString()} {m.item_name}
                    {m.related_warehouse_name &&
                      ` from ${m.warehouse_name} to ${m.related_warehouse_name}`}
                  </p>
                  <p className="text-xs text-steel-500">
                    {new Date(m.created_at).toLocaleString()}
                    {m.reference && ` · Ref: ${m.reference}`}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${MOVEMENT_STYLES[m.movement_type]}`}
                >
                  {MOVEMENT_LABELS[m.movement_type]}
                </span>
              </div>
            ))}
            {(!movements || movements.length === 0) && (
              <div className="p-8 text-center text-steel-500 text-sm">
                No audit history available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Movement Modal */}
      {items && warehouses && (
        <RecordMovementModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={reloadAll}
          items={items}
          warehouses={warehouses}
          presetWarehouseId={warehouse.id}
          initialKind={modalKind}
        />
      )}

      {/* Restock Request Modal — only reachable when canRequestRestock
          is true, which already guarantees warehouse.project is set */}
      {items && warehouse.project && (
        <RequestRestockModal
          isOpen={showRestockModal}
          onClose={() => setShowRestockModal(false)}
          onSuccess={reloadAll}
          projectId={warehouse.project}
          items={items}
        />
      )}

      {/* Movement Drawer */}
      {showDrawer && selectedMovement && (
        <MovementDrawer
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          movementId={selectedMovement}
          onReverse={() => {
            // Handle reverse
            setShowDrawer(false);
            reloadAll();
          }}
        />
      )}
    </div>
  );
}
