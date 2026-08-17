// /src/modules/projects/ProjectCashFlow/components/CashFlowGrid.tsx
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type {
  CashFlowSummary,
  CashFlowSummaryRow,
  CashFlowEntryType,
} from "@/types/cashflow";

interface CashFlowGridProps {
  projectId: number;
  planId: number;
  summary: CashFlowSummary;
  grandTotals: Record<string, number>;
  entryType: CashFlowEntryType;
  onChanged: () => void;
}

function formatPeriodLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function CashFlowGrid({ summary, grandTotals }: CashFlowGridProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50 bg-steel-50/50">
              <th className="px-4 py-2.5 font-medium sticky left-0 bg-steel-50/50 min-w-56">
                Activity / WBS
              </th>
              {summary.periods.map((period) => (
                <th
                  key={period}
                  className="px-3 py-2.5 font-medium text-right whitespace-nowrap min-w-24"
                >
                  {formatPeriodLabel(period)}
                </th>
              ))}
              <th className="px-4 py-2.5 font-medium text-right min-w-28">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {summary.rows.map((row) => (
              <WBSGroupRows
                key={row.key}
                row={row}
                periods={summary.periods}
                collapsed={collapsed}
                onToggle={toggle}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-steel-300 bg-steel-50 font-semibold">
              <td className="px-4 py-3 sticky left-0 bg-steel-50">
                Grand Total
              </td>
              {summary.periods.map((period) => (
                <td key={period} className="px-3 py-3 text-right">
                  {(grandTotals[period] || 0).toLocaleString()}
                </td>
              ))}
              <td className="px-4 py-3 text-right">
                {Object.values(grandTotals)
                  .reduce((a, b) => a + b, 0)
                  .toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function WBSGroupRows({
  row,
  periods,
  collapsed,
  onToggle,
}: {
  row: CashFlowSummaryRow;
  periods: string[];
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}) {
  const isCollapsed = collapsed.has(row.key);
  const rowTotal = Object.values(row.totals).reduce((a, b) => a + b, 0);

  return (
    <>
      <tr className="bg-orange-50/30 font-medium">
        <td className="px-4 py-2.5 sticky left-0 bg-orange-50/30">
          <button
            onClick={() => onToggle(row.key)}
            className="flex items-center gap-1.5 text-steel-800"
          >
            {isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
            {row.label}
          </button>
        </td>
        {periods.map((period) => (
          <td key={period} className="px-3 py-2.5 text-right text-steel-700">
            {(row.totals[period] || 0).toLocaleString()}
          </td>
        ))}
        <td className="px-4 py-2.5 text-right text-steel-900">
          {rowTotal.toLocaleString()}
        </td>
      </tr>

      {!isCollapsed &&
        row.children?.map((child) => (
          <ActivityRow key={child.key} row={child} periods={periods} />
        ))}
    </>
  );
}

function ActivityRow({
  row,
  periods,
}: {
  row: CashFlowSummaryRow;
  periods: string[];
}) {
  const rowTotal = Object.values(row.totals).reduce((a, b) => a + b, 0);

  return (
    <tr className="hover:bg-steel-50/60">
      <td className="px-4 py-2 pl-9 sticky left-0 bg-white text-steel-600">
        {row.label}
      </td>
      {periods.map((period) => (
        <td key={period} className="px-3 py-2 text-right text-steel-600">
          {row.totals[period] ? row.totals[period].toLocaleString() : "—"}
        </td>
      ))}
      <td className="px-4 py-2 text-right text-steel-700">
        {rowTotal.toLocaleString()}
      </td>
    </tr>
  );
}
