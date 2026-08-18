// /src/modules/projects/ProjectCostControl/components/CostControlHeader.tsx
import { Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface CostControlHeaderProps {
  title?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export function CostControlHeader({
  title = "Cost Control",
  icon: Icon = Wallet,
  actions,
}: CostControlHeaderProps) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-steel-900 flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
            <Icon size={24} className="text-orange-500" />
          </div>
          {title}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
