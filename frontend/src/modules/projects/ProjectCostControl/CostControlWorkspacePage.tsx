// /src/modules/projects/ProjectCostControl/CostControlWorkspacePage.tsx
import { useSearchParams } from "react-router-dom";
import {
  CostControlTabs,
  type CostControlTab,
} from "./components/CostControlTabs";
import { BudgetTabContent } from "./tabs/BudgetTabContent";
import { CashFlowTabContent } from "./tabs/CashFlowTabContent";

const VALID_TABS: CostControlTab[] = [
  "budget",
  "cashflow",
  "variations",
  "valuation",
];

export function CostControlWorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: CostControlTab = VALID_TABS.includes(
    rawTab as CostControlTab,
  )
    ? (rawTab as CostControlTab)
    : "budget";

  function handleTabChange(tab: CostControlTab) {
    setSearchParams({ tab }, { replace: false });
  }

  return (
    <div className="space-y-4">
      <CostControlTabs active={activeTab} onChange={handleTabChange} />

      <div className="space-y-6">
        {activeTab === "budget" && <BudgetTabContent />}
        {activeTab === "cashflow" && <CashFlowTabContent />}
        {activeTab === "variations" && (
          <PlaceholderTab title="Variations — coming in a later phase." />
        )}
        {activeTab === "valuation" && (
          <PlaceholderTab title="Valuation — coming in a later phase." />
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-steel-300 p-10 text-center text-sm text-steel-500">
      {title}
    </div>
  );
}
