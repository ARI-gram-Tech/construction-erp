// frontend/src/modules/projects/ProjectInventory/ProjectInventoryPage.tsx

import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listWarehouses,
  listStockItems,
  listStockLevels,
  listStockMovements,
} from "@/services/inventory";
import { listPurchaseRequests } from "@/services/purchaseRequests";
import type { PRStatus } from "@/types/purchaseRequest";
import type { MovementType } from "@/types/inventory";
import {
  RecordMovementModal,
  type MovementKind,
} from "../../inventory/components/RecordMovementModal";
import { MovementDrawer } from "../../inventory/components/MovementDrawer";
import { ProjectInventoryHeader } from "./components/ProjectInventoryHeader";
import { RequestRestockModal } from "./components/RequestRestockModal";
import { PendingReceiptsSection } from "../../inventory/components/PendingReceiptsSection";
import {
  Warehouse as WarehouseIcon,
  Search,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Eye,
  History,
  TrendingUp,
  Users,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  FileText,
} from "lucide-react";

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

const PR_STATUS_STYLES: Record<PRStatus, string> = {
  draft: "bg-steel-100 text-steel-600",
  pending_tier1: "bg-amber-50 text-amber-700",
  pending_tier2: "bg-amber-50 text-amber-700",
  pending_tier3: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-steel-100 text-steel-500",
};

const PR_STATUS_LABELS: Record<PRStatus, string> = {
  draft: "Draft",
  pending_tier1: "Pending PM",
  pending_tier2: "Pending Procurement",
  pending_tier3: "Pending Director",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: WarehouseIcon },
  { key: "stock", label: "Stock", icon: Package },
  { key: "movements", label: "Movements", icon: History },
  { key: "transfers", label: "Transfers", icon: ArrowRightLeft },
  { key: "requests", label: "Requests", icon: Users },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "audit", label: "Audit", icon: Clock },
];

export function ProjectInventoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("stock");
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

  const {
    data: warehouses,
    loading: whLoading,
    error: whError,
  } = useFetch(() => listWarehouses());
  const { data: items } = useFetch(() => listStockItems());
  const { data: purchaseRequests } = useFetch(
    () => listPurchaseRequests(pid),
    [pid],
  );

  const store = warehouses?.find((w) => w.project === pid);

  const { data: levels, reload: reloadLevels } = useFetch(
    () =>
      store ? listStockLevels({ warehouse: store.id }) : Promise.resolve([]),
    [store?.id],
  );
  const { data: movements, reload: reloadMovements } = useFetch(
    () =>
      store ? listStockMovements({ warehouse: store.id }) : Promise.resolve([]),
    [store?.id],
  );

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

  const metrics = useMemo(() => {
    if (!levels || !movements) return null;

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
    };
  }, [levels, movements, itemReorderMap]);

  const filteredLevels = useMemo(() => {
    if (!levels) return [];

    let list = [...levels];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.item_name.toLowerCase().includes(q) ||
          l.item_code.toLowerCase().includes(q),
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((l) => itemCategoryMap.get(l.item) === categoryFilter);
    }

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

    if (lowStockOnly) {
      list = list.filter(
        (l) => Number(l.quantity) <= (itemReorderMap.get(l.item) || 0),
      );
    }

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
  }

  function openMovement(kind: MovementKind) {
    setModalKind(kind);
    setShowModal(true);
  }

  if (whLoading) return <div className="text-steel-500">Loading store...</div>;
  if (whError) return <div className="text-red-600">{whError}</div>;

  if (!store) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-steel-300 p-8 text-center">
        <WarehouseIcon size={24} className="text-steel-300 mx-auto mb-2" />
        <p className="text-sm text-steel-500">
          No site store found for this project. It should be created
          automatically — if it's missing, this project may predate the
          Inventory module being added.
        </p>
      </div>
    );
  }

  const handleMovementClick = (movementId: number) => {
    setSelectedMovement(movementId);
    setShowDrawer(true);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-steel-200/50 flex gap-6 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
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

      <ProjectInventoryHeader
        activeTab={activeTab}
        onReceive={() => openMovement("receive")}
        onIssue={() => openMovement("issue")}
        onTransfer={() => openMovement("transfer")}
        onAdjust={() => openMovement("adjust")}
        onRequestRestock={() => setShowRestockModal(true)}
      />

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-steel-200/50 p-4">
              <p className="text-xs text-steel-500">Items</p>
              <p className="text-lg font-semibold text-steel-900">
                {metrics?.totalItems || 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-steel-200/50 p-4">
              <p className="text-xs text-steel-500">Total Quantity</p>
              <p className="text-lg font-semibold text-steel-900">
                {metrics?.totalQuantity.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-steel-200/50 p-4">
              <p className="text-xs text-steel-500 flex items-center gap-1">
                <AlertTriangle size={12} className="text-red-500" />
                Low Stock
              </p>
              <p className="text-lg font-semibold text-red-600">
                {metrics?.lowStockCount || 0}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-steel-200/50 p-4">
              <p className="text-xs text-steel-500 flex items-center gap-1">
                <Clock size={12} className="text-blue-500" />
                Today's Movements
              </p>
              <p className="text-lg font-semibold text-steel-900">
                {metrics?.todayMovements || 0}
              </p>
            </div>
          </div>

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
        </div>
      )}

      {activeTab === "stock" && (
        <>
          <div className="bg-white rounded-xl border border-steel-200/50 p-4">
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
                              <button
                                onClick={() => openMovement("transfer")}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-steel-400 hover:text-blue-600 transition-colors"
                                title="Transfer"
                              >
                                <ArrowRightLeft size={16} />
                              </button>
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
                    : "No stock at this site store yet — transfer materials in from the Main Warehouse, or receive directly."}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "movements" && (
        <div className="space-y-4">
          <PendingReceiptsSection
            projectId={pid}
            warehouseId={store.id}
            onSuccess={reloadAll}
          />

          <div className="bg-white rounded-xl border border-steel-200/50 p-4">
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
                <option value="transfer">Transfer</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <select className="border border-steel-300 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
              </select>
              <input
                type="date"
                className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="date"
                className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

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
                  No movements recorded at this store yet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "transfers" && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
          <ArrowRightLeft size={24} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            Transfer history and pending transfers will appear here
          </p>
        </div>
      )}

      {activeTab === "requests" && (
        <div className="bg-white rounded-xl border border-steel-200/50">
          <div className="p-4 border-b border-steel-200/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-steel-900">
                Purchase Requests
              </h3>
              <p className="text-xs text-steel-500 mt-0.5">
                Materials requested from activities, routed through approval
              </p>
            </div>
            <button
              onClick={() => navigate(`/projects/${pid}/procurement/requests`)}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-steel-100">
            {purchaseRequests && purchaseRequests.length > 0 ? (
              purchaseRequests.slice(0, 6).map((pr) => (
                <div
                  key={pr.id}
                  onClick={() =>
                    navigate(`/projects/${pid}/procurement/${pr.id}`)
                  }
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-steel-50/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-steel-900">
                      <span className="text-steel-400 font-mono text-xs mr-2">
                        {pr.code}
                      </span>
                      {pr.title}
                    </p>
                    <p className="text-xs text-steel-500 mt-0.5">
                      Requested by {pr.requested_by_name || "—"}
                      {pr.priority === "urgent" && " · Urgent"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${PR_STATUS_STYLES[pr.status]}`}
                  >
                    {PR_STATUS_LABELS[pr.status]}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-steel-500 text-sm">
                No purchase requests for this project yet.
              </div>
            )}
          </div>
        </div>
      )}

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
            {movements?.slice(0, 10).map((m) => (
              <div key={m.id} className="p-4 flex items-start gap-3">
                <div className="shrink-0 w-2 h-2 mt-2 rounded-full bg-orange-500" />
                <div className="flex-1">
                  <p className="text-sm text-steel-900">
                    {m.performed_by_name || "System"}{" "}
                    {MOVEMENT_LABELS[
                      m.movement_type as keyof typeof MOVEMENT_LABELS
                    ]?.toLowerCase() || m.movement_type}{" "}
                    {Number(m.quantity).toLocaleString()} {m.item_name}
                  </p>
                  <p className="text-xs text-steel-500">
                    {new Date(m.created_at).toLocaleString()}
                    {m.reference && ` · Ref: ${m.reference}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {items && warehouses && (
        <RecordMovementModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={reloadAll}
          items={items}
          warehouses={warehouses}
          presetWarehouseId={store.id}
          initialKind={modalKind}
        />
      )}

      {/* Restock Request Modal */}
      {items && (
        <RequestRestockModal
          isOpen={showRestockModal}
          onClose={() => setShowRestockModal(false)}
          onSuccess={reloadAll}
          projectId={pid}
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
            setShowDrawer(false);
          }}
        />
      )}
    </div>
  );
}
