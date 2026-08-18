// /src/modules/projects/ProjectCostControl/components/CostControlTabs.tsx
import { Wallet, TrendingUp, GitPullRequest, FileCheck } from "lucide-react";

export type CostControlTab = "budget" | "cashflow" | "variations" | "valuation";

interface TabDef {
  key: CostControlTab;
  label: string;
  icon: typeof Wallet;
  enabled: boolean;
}

const TABS: TabDef[] = [
  { key: "budget", label: "Budget", icon: Wallet, enabled: true },
  { key: "cashflow", label: "Cash Flow", icon: TrendingUp, enabled: true },
  {
    key: "variations",
    label: "Variations",
    icon: GitPullRequest,
    enabled: false,
  },
  { key: "valuation", label: "Valuation", icon: FileCheck, enabled: false },
];

interface CostControlTabsProps {
  active: CostControlTab;
  onChange: (tab: CostControlTab) => void;
}

export function CostControlTabs({ active, onChange }: CostControlTabsProps) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm px-3 pt-1">
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => tab.enabled && onChange(tab.key)}
              disabled={!tab.enabled}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-orange-500 text-orange-600"
                  : tab.enabled
                    ? "border-transparent text-steel-500 hover:text-steel-800 hover:border-steel-200"
                    : "border-transparent text-steel-300 cursor-not-allowed"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {!tab.enabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-steel-100 text-steel-400">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
