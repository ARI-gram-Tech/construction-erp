// frontend/src/modules/inventory/InventoryEntryPoint.tsx
//
// Sits in front of InventoryPage at /company/inventory. A storekeeper
// clicking "Inventory" in the sidebar has exactly one place they can
// actually do anything — their own project's store — so there's no
// reason to make them click through Dashboard -> Warehouses tab -> the
// one row in a list of one. This redirects them straight there.
//
// Every other role sees the normal company-wide InventoryPage
// (Dashboard/Items/Warehouses/Movements/Timeline) unchanged.

import { Navigate, Link } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useFetch } from "@/hooks/useFetch";
import { listWarehouses } from "@/services/inventory";
import { InventoryPage } from "./InventoryPage";
import { Warehouse as WarehouseIcon } from "lucide-react";

const STOREKEEPER_ROLE = "storekeeper";

export function InventoryEntryPoint() {
  const { data: me, loading: meLoading } = useCurrentUser();

  // Only fetch warehouses at all if we might need to redirect — no
  // point firing this request for every other role on every page load.
  const isStorekeeper = me?.role === STOREKEEPER_ROLE;
  const {
    data: warehouses,
    loading: whLoading,
    error: whError,
  } = useFetch(
    () => (isStorekeeper ? listWarehouses() : Promise.resolve([])),
    [isStorekeeper],
  );

  if (meLoading || (isStorekeeper && whLoading)) {
    return <div className="text-steel-500 p-6">Loading inventory...</div>;
  }

  if (!isStorekeeper) {
    return <InventoryPage />;
  }

  if (whError) {
    return <div className="text-red-600 p-6">{whError}</div>;
  }

  // Backend already scopes listWarehouses() to warehouses this user is
  // a ProjectMember of (visible_warehouses_queryset) — a storekeeper
  // never sees Main Warehouse or another project's store here, so
  // whatever comes back is already the right set to choose from.
  const stores = warehouses ?? [];

  if (stores.length === 1) {
    return (
      <Navigate to={`/company/inventory/warehouses/${stores[0].id}`} replace />
    );
  }

  if (stores.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-steel-300 p-8 text-center max-w-lg mx-auto mt-8">
        <WarehouseIcon size={24} className="text-steel-300 mx-auto mb-2" />
        <p className="text-sm text-steel-500">
          No site store found for your project yet. If you believe this is
          wrong, check that you've been added as a member of the project.
        </p>
      </div>
    );
  }

  // Edge case: a storekeeper assigned to more than one project. Rare,
  // but the permission model doesn't forbid it, so don't silently pick
  // one for them — a short picker instead of dumping them into the
  // full company-wide InventoryPage.
  return (
    <div className="bg-white rounded-xl border border-steel-200/50 max-w-lg mx-auto mt-8 divide-y divide-steel-100">
      <div className="p-4 border-b border-steel-200/50">
        <h2 className="text-sm font-semibold text-steel-900">Choose a store</h2>
        <p className="text-xs text-steel-500 mt-0.5">
          You're assigned to more than one project's store.
        </p>
      </div>
      {stores.map((w) => (
        <Link
          key={w.id}
          to={`/company/inventory/warehouses/${w.id}`}
          className="p-4 flex items-center gap-3 hover:bg-steel-50/60 transition-colors"
        >
          <WarehouseIcon size={16} className="text-steel-400" />
          <span className="text-sm text-steel-900">{w.name}</span>
        </Link>
      ))}
    </div>
  );
}
