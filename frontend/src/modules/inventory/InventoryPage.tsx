// /src/modules/inventory/InventoryPage.tsx

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  INVENTORY_CATALOG_MANAGER_ROLES,
  RESTOCK_APPROVER_ROLES,
} from "@/constants/projectRoles";
import { useFetch } from "@/hooks/useFetch";
import {
  listStockItems,
  listWarehouses,
  listStockMovements,
  updateWarehouse,
} from "@/services/inventory";
import type { StockCategory, MovementType } from "@/types/inventory";
import { InventoryDashboard } from "./InventoryDashboard";
import { InventoryHeader } from "./components/InventoryHeader";
import { PendingRequestsSection } from "./components/PendingRequestsSection";
import { RestockRequestsSection } from "./components/RestockRequestsSection";
import { MovementTimeline } from "./components/MovementTimeline";
import { FilterToolbar } from "./components/FilterToolbar";
import { RecordMovementModal } from "./components/RecordMovementModal";
import {
  Boxes,
  Warehouse as WarehouseIcon,
  History,
  LayoutDashboard,
  ArrowLeftRight,
  Search,
  ArrowUp,
  ArrowDown,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  Inbox,
} from "lucide-react";

type Tab =
  | "dashboard"
  | "items"
  | "warehouses"
  | "movements"
  | "timeline"
  | "requests";

const CATEGORY_LABELS: Record<StockCategory, string> = {
  materials: "Building Materials",
  electrical: "Electrical",
  plumbing: "Plumbing",
  tools: "Tools",
  safety: "Safety Equipment",
  other: "Other",
};

const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: "Received",
  issue: "Issued",
  transfer_out: "Transfer Out",
  transfer_in: "Transfer In",
  adjustment: "Adjustment",
};

const MOVEMENT_STYLES: Record<MovementType, string> = {
  receipt: "bg-green-50 text-green-700",
  issue: "bg-amber-50 text-amber-700",
  transfer_out: "bg-blue-50 text-blue-700",
  transfer_in: "bg-blue-50 text-blue-700",
  adjustment: "bg-steel-100 text-steel-600",
};

const VALID_TABS: Tab[] = [
  "dashboard",
  "items",
  "warehouses",
  "movements",
  "timeline",
  "requests",
];

export function InventoryPage() {
  const navigate = useNavigate();
  const { data: me } = useCurrentUser();
  const canManageCatalog = me
    ? INVENTORY_CATALOG_MANAGER_ROLES.includes(me.role)
    : false;
  const canApproveRestock = me
    ? RESTOCK_APPROVER_ROLES.includes(me.role)
    : false;
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as Tab)
    ? (searchParams.get("tab") as Tab)
    : "dashboard";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [generalModalKind, setGeneralModalKind] = useState<
    "receive" | "issue" | "transfer" | "adjust"
  >("receive");
  const [rowAction, setRowAction] = useState<{
    itemId: number;
    kind: "receive" | "issue" | "transfer" | "adjust";
  } | null>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<StockCategory | "all">(
    "all",
  );
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortKey, setSortKey] = useState<
    "code" | "name" | "category" | "unit" | "total" | "reorder"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");

  const {
    data: items,
    loading: itemsLoading,
    error: itemsError,
    reload: reloadItems,
  } = useFetch(() => listStockItems());
  const {
    data: warehouses,
    loading: whLoading,
    error: whError,
    reload: reloadWarehouses,
  } = useFetch(() => listWarehouses());
  const {
    data: movements,
    loading: movLoading,
    error: movError,
    reload: reloadMovements,
  } = useFetch(() => listStockMovements());

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    let list = items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter)
        return false;
      if (
        lowStockOnly &&
        Number(item.total_quantity) > Number(item.reorder_level)
      )
        return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "code":
          cmp = a.code.localeCompare(b.code);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "unit":
          cmp = a.unit.localeCompare(b.unit);
          break;
        case "total":
          cmp = Number(a.total_quantity) - Number(b.total_quantity);
          break;
        case "reorder":
          cmp = Number(a.reorder_level) - Number(b.reorder_level);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [items, search, categoryFilter, lowStockOnly, sortKey, sortDir]);

  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    let list = movements;
    if (movementTypeFilter !== "all") {
      list = list.filter((m) => m.movement_type === movementTypeFilter);
    }
    return list;
  }, [movements, movementTypeFilter]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function openRowAction(
    itemId: number,
    kind: "receive" | "issue" | "transfer" | "adjust",
  ) {
    setRowAction({ itemId, kind });
  }

  async function toggleActive(id: number, current: boolean) {
    await updateWarehouse(id, { is_active: !current });
    reloadWarehouses();
  }

  function reloadAll() {
    reloadItems();
    reloadWarehouses();
    reloadMovements();
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-steel-200/50 flex gap-6 overflow-x-auto">
        {[
          { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { key: "items", label: "Items", icon: Boxes },
          { key: "warehouses", label: "Warehouses", icon: WarehouseIcon },
          { key: "movements", label: "Movements", icon: History },
          { key: "timeline", label: "Timeline", icon: ArrowLeftRight },
          ...(canManageCatalog
            ? [{ key: "requests" as Tab, label: "Requests", icon: Inbox }]
            : []),
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`pb-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? "border-orange-500 text-steel-900"
                : "border-transparent text-steel-500 hover:text-steel-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <InventoryHeader
        activeTab={tab}
        onNewItem={() => navigate("/company/inventory/items/new")}
        onRecordMovement={() => setShowMovementModal(true)}
      />

      {tab === "dashboard" && (
        <InventoryDashboard
          onNavigateTab={setTab}
          onOpenMovement={(kind) => {
            setGeneralModalKind(kind);
            setShowMovementModal(true);
          }}
        />
      )}

      {tab === "items" && (
        <>
          {itemsLoading && (
            <div className="text-steel-500">Loading items...</div>
          )}
          {itemsError && <div className="text-red-600">{itemsError}</div>}
          {items && (
            <>
              <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-steel-200/50">
                <div className="relative flex-1 min-w-55">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or code..."
                    className="w-full border border-steel-300 rounded-lg pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as StockCategory | "all")
                  }
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All categories</option>
                  {(Object.keys(CATEGORY_LABELS) as StockCategory[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ),
                  )}
                </select>
                <label className="flex items-center gap-2 text-sm text-steel-600 px-1">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                    className="rounded border-steel-300"
                  />
                  Low stock only
                </label>
              </div>

              <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
                {filteredItems.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50">
                        {[
                          ["code", "Code"],
                          ["name", "Name"],
                          ["category", "Category"],
                          ["unit", "Unit"],
                          ["total", "Total Stock"],
                          ["reorder", "Reorder Level"],
                        ].map(([key, label]) => (
                          <th
                            key={key}
                            onClick={() => toggleSort(key as typeof sortKey)}
                            className="px-4 py-3 font-medium cursor-pointer select-none hover:text-steel-700"
                          >
                            <span className="inline-flex items-center gap-1">
                              {label}
                              {sortKey === key &&
                                (sortDir === "asc" ? (
                                  <ArrowUp size={12} />
                                ) : (
                                  <ArrowDown size={12} />
                                ))}
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3 font-medium text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel-100">
                      {filteredItems.map((item) => {
                        const total = Number(item.total_quantity);
                        const low = total <= Number(item.reorder_level);
                        return (
                          <tr
                            key={item.id}
                            onClick={() =>
                              navigate(`/company/inventory/items/${item.id}`)
                            }
                            className="cursor-pointer hover:bg-steel-50/60 transition-colors"
                          >
                            <td className="px-4 py-3 text-steel-500 font-mono text-xs">
                              {item.code}
                            </td>
                            <td className="px-4 py-3 font-medium text-steel-900">
                              {item.name}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2.5 py-1 rounded-full bg-steel-100 text-steel-600">
                                {CATEGORY_LABELS[item.category]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-steel-600">
                              {item.unit}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  low
                                    ? "text-red-600 font-medium"
                                    : "text-steel-900"
                                }
                              >
                                {total.toLocaleString()}
                              </span>
                              {low && (
                                <span className="ml-2 text-xs text-red-600">
                                  Low stock
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-steel-500">
                              {Number(item.reorder_level).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div
                                className="flex items-center justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  title="Receive stock"
                                  onClick={() =>
                                    openRowAction(item.id, "receive")
                                  }
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-steel-400 hover:text-green-600 transition-colors"
                                >
                                  <PackagePlus size={16} />
                                </button>
                                <button
                                  title="Issue stock"
                                  onClick={() =>
                                    openRowAction(item.id, "issue")
                                  }
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-steel-400 hover:text-amber-600 transition-colors"
                                >
                                  <PackageMinus size={16} />
                                </button>
                                <button
                                  title="Transfer stock"
                                  onClick={() =>
                                    openRowAction(item.id, "transfer")
                                  }
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-steel-400 hover:text-blue-600 transition-colors"
                                >
                                  <ArrowLeftRight size={16} />
                                </button>
                                <button
                                  title="Adjust stock"
                                  onClick={() =>
                                    openRowAction(item.id, "adjust")
                                  }
                                  className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-700 transition-colors"
                                >
                                  <SlidersHorizontal size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center">
                    <Boxes size={24} className="text-steel-300 mx-auto mb-2" />
                    <p className="text-sm text-steel-500">
                      {items.length > 0
                        ? "No items match your search or filters."
                        : "No items in the catalog yet."}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === "warehouses" && (
        <>
          {whLoading && (
            <div className="text-steel-500">Loading warehouses...</div>
          )}
          {whError && <div className="text-red-600">{whError}</div>}
          {warehouses && (
            <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
              {warehouses.map((w) => (
                <div
                  key={w.id}
                  onClick={() =>
                    navigate(`/company/inventory/warehouses/${w.id}`)
                  }
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-steel-50/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-steel-900">
                      {w.name}
                    </p>
                    <p className="text-xs text-steel-500">
                      {w.location_type === "main"
                        ? "Main Warehouse"
                        : "Project Store"}
                      {w.address && ` · ${w.address}`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(w.id, w.is_active);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      w.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-steel-100 text-steel-500"
                    }`}
                  >
                    {w.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "movements" && (
        <>
          {movLoading && (
            <div className="text-steel-500">Loading movements...</div>
          )}
          {movError && <div className="text-red-600">{movError}</div>}
          {movements && (
            <>
              <FilterToolbar
                searchValue={search}
                onSearchChange={setSearch}
                movementTypeFilter={movementTypeFilter}
                onMovementTypeChange={setMovementTypeFilter}
              />
              <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
                {filteredMovements.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50">
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Warehouse</th>
                        <th className="px-4 py-3 font-medium">Qty</th>
                        <th className="px-4 py-3 font-medium">Reference</th>
                        <th className="px-4 py-3 font-medium">By</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-steel-100">
                      {filteredMovements.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() =>
                            navigate(`/company/inventory/movements/${m.id}`)
                          }
                          className="cursor-pointer hover:bg-steel-50/60 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full ${MOVEMENT_STYLES[m.movement_type]}`}
                            >
                              {MOVEMENT_LABELS[m.movement_type]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-steel-900">
                            {m.item_name}
                          </td>
                          <td className="px-4 py-3 text-steel-600">
                            {m.warehouse_name}
                            {m.related_warehouse_name &&
                              ` ↔ ${m.related_warehouse_name}`}
                          </td>
                          <td className="px-4 py-3 text-steel-600">
                            {Number(m.quantity).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-steel-500">
                            {m.reference || "—"}
                          </td>
                          <td className="px-4 py-3 text-steel-500">
                            {m.performed_by_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-steel-400 text-xs">
                            {new Date(m.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center">
                    <History
                      size={24}
                      className="text-steel-300 mx-auto mb-2"
                    />
                    <p className="text-sm text-steel-500">
                      No movements match your filters.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === "timeline" && movements && (
        <div className="bg-white rounded-xl border border-steel-200/50 p-6">
          <MovementTimeline movements={movements} />
        </div>
      )}

      {tab === "requests" && canManageCatalog && (
        <div className="space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-steel-900 mb-3">
              New Item Requests
            </h2>
            <p className="text-xs text-steel-500 mb-3">
              Materials that don't exist in the catalog yet.
            </p>
            <PendingRequestsSection />
          </div>
          {canApproveRestock && (
            <div>
              <h2 className="text-sm font-semibold text-steel-900 mb-3">
                Restock Requests
              </h2>
              <p className="text-xs text-steel-500 mb-3">
                Storekeepers asking for more of an item that's already in the
                catalog.
              </p>
              <RestockRequestsSection />
            </div>
          )}
        </div>
      )}

      {items && warehouses && (
        <RecordMovementModal
          isOpen={showMovementModal}
          onClose={() => setShowMovementModal(false)}
          onSuccess={reloadAll}
          items={items}
          warehouses={warehouses}
          initialKind={generalModalKind}
        />
      )}

      {items && warehouses && rowAction && (
        <RecordMovementModal
          isOpen={!!rowAction}
          onClose={() => setRowAction(null)}
          onSuccess={reloadAll}
          items={items}
          warehouses={warehouses}
          presetItemId={rowAction.itemId}
          initialKind={rowAction.kind}
        />
      )}
    </div>
  );
}
