// /src/modules/inventory/StockItemDetailPage.tsx

import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  getStockItem,
  listStockLevels,
  listStockMovements,
  listWarehouses,
} from "@/services/inventory";
import type { MovementType } from "@/types/inventory";
import { RecordMovementModal } from "./components/RecordMovementModal";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
} from "lucide-react";

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

export function StockItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const id = Number(itemId);
  const [showModal, setShowModal] = useState(false);

  const {
    data: item,
    loading,
    error,
    reload,
  } = useFetch(() => getStockItem(id), [id]);
  const { data: levels } = useFetch(() => listStockLevels({ item: id }), [id]);
  const { data: movements } = useFetch(
    () => listStockMovements({ item: id }),
    [id],
  );
  const { data: warehouses } = useFetch(() => listWarehouses());

  const stats = useMemo(() => {
    if (!movements) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentIssues = movements.filter(
      (m) =>
        m.movement_type === "issue" && new Date(m.created_at) >= thirtyDaysAgo,
    );

    const avgMonthlyUse = recentIssues.reduce(
      (sum, m) => sum + Number(m.quantity),
      0,
    );

    // Find fastest moving site
    const siteUsage: Record<number, number> = {};
    movements
      .filter((m) => m.movement_type === "issue")
      .forEach((m) => {
        siteUsage[m.warehouse] =
          (siteUsage[m.warehouse] || 0) + Number(m.quantity);
      });

    let fastestSite = "";
    let maxUsage = 0;
    Object.entries(siteUsage).forEach(([id, usage]) => {
      if (usage > maxUsage) {
        maxUsage = usage;
        const warehouse = warehouses?.find((w) => w.id === Number(id));
        fastestSite = warehouse?.name || "";
      }
    });

    const total = Number(item?.total_quantity || 0);
    const reorder = Number(item?.reorder_level || 0);
    const daysUntilEmpty =
      avgMonthlyUse > 0 ? Math.round((total / avgMonthlyUse) * 30) : 0;

    return {
      avgMonthlyUse,
      fastestSite,
      daysUntilEmpty,
      total,
      reorder,
    };
  }, [movements, warehouses, item]);

  if (loading) return <div className="text-steel-500">Loading item...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!item || !stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/company/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to Inventory
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-steel-500 font-mono">{item.code}</p>
            <h1 className="text-2xl font-semibold text-steel-900">
              {item.name}
            </h1>
            <p className="text-steel-500 text-sm">
              {item.category} · {item.unit}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Record Movement
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <div className="flex items-center gap-2 text-steel-500">
            <Package size={16} />
            <span className="text-xs">Current Stock</span>
          </div>
          <p className="text-xl font-semibold text-steel-900 mt-1">
            {stats.total.toLocaleString()} {item.unit}
          </p>
          <p className="text-xs text-steel-500">
            Reorder: {stats.reorder.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <div className="flex items-center gap-2 text-steel-500">
            <TrendingUp size={16} />
            <span className="text-xs">Average Monthly Use</span>
          </div>
          <p className="text-xl font-semibold text-steel-900 mt-1">
            {stats.avgMonthlyUse.toLocaleString()} {item.unit}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <div className="flex items-center gap-2 text-steel-500">
            <TrendingDown size={16} />
            <span className="text-xs">Days Until Empty</span>
          </div>
          <p className="text-xl font-semibold text-steel-900 mt-1">
            {stats.daysUntilEmpty > 0 ? `${stats.daysUntilEmpty} days` : "—"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-steel-200/50 p-4">
          <div className="flex items-center gap-2 text-steel-500">
            <Clock size={16} />
            <span className="text-xs">Fastest Moving Site</span>
          </div>
          <p className="text-sm font-medium text-steel-900 mt-1">
            {stats.fastestSite || "—"}
          </p>
        </div>
      </div>

      {/* Stock by Warehouse */}
      <div className="bg-white rounded-xl border border-steel-200/50">
        <div className="p-5 border-b border-steel-200/50">
          <h2 className="text-sm font-semibold text-steel-900">
            Stock by Warehouse
          </h2>
        </div>
        <div className="divide-y divide-steel-100">
          {levels && levels.length > 0 ? (
            levels.map((l) => (
              <div key={l.id} className="p-4 flex items-center justify-between">
                <span className="text-sm text-steel-700">
                  {l.warehouse_name}
                </span>
                <span className="font-medium text-steel-900">
                  {Number(l.quantity).toLocaleString()} {item.unit}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-steel-500 text-sm">
              No stock recorded at any warehouse yet.
            </div>
          )}
        </div>
      </div>

      {/* Movement History */}
      <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
        <div className="p-5 border-b border-steel-200/50">
          <h2 className="text-sm font-semibold text-steel-900">
            Movement History
          </h2>
        </div>
        {movements && movements.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50">
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Warehouse</th>
                <th className="px-5 py-2 font-medium">Qty</th>
                <th className="px-5 py-2 font-medium">Reference</th>
                <th className="px-5 py-2 font-medium">By</th>
                <th className="px-5 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {movements.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-steel-50/60 transition-colors"
                >
                  <td className="px-5 py-2.5">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${MOVEMENT_STYLES[m.movement_type]}`}
                    >
                      {MOVEMENT_LABELS[m.movement_type]}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-steel-600">
                    {m.warehouse_name}
                    {m.related_warehouse_name &&
                      ` ↔ ${m.related_warehouse_name}`}
                  </td>
                  <td className="px-5 py-2.5 text-steel-600">
                    {Number(m.quantity).toLocaleString()}
                  </td>
                  <td className="px-5 py-2.5 text-steel-500">
                    {m.reference || "—"}
                  </td>
                  <td className="px-5 py-2.5 text-steel-500">
                    {m.performed_by_name || "—"}
                  </td>
                  <td className="px-5 py-2.5 text-steel-400 text-xs">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-steel-500 text-sm">
            No movements yet for this item.
          </div>
        )}
      </div>

      {warehouses && (
        <RecordMovementModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={reload}
          items={[item]}
          warehouses={warehouses}
          presetItemId={item.id}
        />
      )}
    </div>
  );
}
