// /src/modules/inventory/components/MovementTimeline.tsx

import { useMemo } from "react";
import type { StockMovement } from "@/types/inventory";
import {
  PackagePlus,
  PackageMinus,
  ArrowRightLeft,
  SlidersHorizontal,
} from "lucide-react";

interface MovementTimelineProps {
  movements: StockMovement[];
}

export function MovementTimeline({ movements }: MovementTimelineProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, StockMovement[]> = {};
    movements.forEach((m) => {
      const date = new Date(m.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(m);
    });
    return groups;
  }, [movements]);

  const iconMap = {
    receipt: <PackagePlus size={16} className="text-green-500" />,
    issue: <PackageMinus size={16} className="text-amber-500" />,
    transfer_out: <ArrowRightLeft size={16} className="text-blue-500" />,
    transfer_in: <ArrowRightLeft size={16} className="text-blue-500" />,
    adjustment: <SlidersHorizontal size={16} className="text-steel-500" />,
  };

  const labelMap = {
    receipt: "Received",
    issue: "Issued",
    transfer_out: "Transfer Out",
    transfer_in: "Transfer In",
    adjustment: "Adjusted",
  };

  if (movements.length === 0) {
    return (
      <div className="text-center text-steel-500 text-sm py-8">
        No movements recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <div className="text-sm font-medium text-steel-900 mb-3 border-b border-steel-200/50 pb-2">
            {new Date(date).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div className="space-y-2">
            {items.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-steel-200/50 hover:bg-steel-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {iconMap[m.movement_type as keyof typeof iconMap]}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-steel-900">
                        {labelMap[m.movement_type as keyof typeof labelMap]}
                      </span>
                      <span className="text-sm text-steel-700">
                        {m.item_name}
                      </span>
                    </div>
                    <div className="text-xs text-steel-500 flex items-center gap-2">
                      <span>{m.warehouse_name}</span>
                      {m.related_warehouse_name && (
                        <>
                          <span>→</span>
                          <span>{m.related_warehouse_name}</span>
                        </>
                      )}
                      {m.reference && (
                        <>
                          <span>·</span>
                          <span>Ref: {m.reference}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-steel-900">
                    {m.movement_type === "receipt" ? "+" : ""}
                    {m.movement_type === "issue" ? "-" : ""}
                    {Number(m.quantity).toLocaleString()}
                  </div>
                  <div className="text-xs text-steel-400">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
