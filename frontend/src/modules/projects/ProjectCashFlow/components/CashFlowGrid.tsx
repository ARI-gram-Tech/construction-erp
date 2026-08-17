// /src/modules/projects/ProjectCashFlow/components/CashFlowGrid.tsx
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { updateCashFlowEntry, createCashFlowEntry } from "@/services/cashflow";
import type {
  CashFlowSummary,
  CashFlowWBSGroup,
  CashFlowActivityRow,
  CashFlowCategoryRow,
  CashFlowCategory,
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

const CATEGORY_LABELS: Record<CashFlowCategory, string> = {
  materials: "Materials",
  labour: "Labour",
  plant: "Plant & Equipment",
  subcontract: "Subcontract",
  other: "Other",
};

const ALL_CATEGORIES: CashFlowCategory[] = [
  "materials",
  "labour",
  "plant",
  "subcontract",
  "other",
];

function formatPeriodLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export function CashFlowGrid({
  projectId,
  planId,
  summary,
  grandTotals,
  entryType,
  onChanged,
}: CashFlowGridProps) {
  const [collapsedWBS, setCollapsedWBS] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );

  function toggleWBS(key: string) {
    setCollapsedWBS((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleActivity(key: string) {
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-xl border border-steel-200/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-steel-500 border-b border-steel-200/50 bg-steel-50/50">
              <th className="px-4 py-2.5 font-medium sticky left-0 bg-steel-50/50 min-w-56 z-10">
                Activity / WBS
              </th>
              {summary.periods.map((period) => (
                <th
                  key={period}
                  className="px-3 py-2.5 font-medium text-right whitespace-nowrap min-w-28"
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
                projectId={projectId}
                planId={planId}
                row={row}
                periods={summary.periods}
                entryType={entryType}
                collapsedWBS={collapsedWBS}
                expandedActivities={expandedActivities}
                onToggleWBS={toggleWBS}
                onToggleActivity={toggleActivity}
                onChanged={onChanged}
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
  projectId,
  planId,
  row,
  periods,
  entryType,
  collapsedWBS,
  expandedActivities,
  onToggleWBS,
  onToggleActivity,
  onChanged,
}: {
  projectId: number;
  planId: number;
  row: CashFlowWBSGroup;
  periods: string[];
  entryType: CashFlowEntryType;
  collapsedWBS: Set<string>;
  expandedActivities: Set<string>;
  onToggleWBS: (key: string) => void;
  onToggleActivity: (key: string) => void;
  onChanged: () => void;
}) {
  const isCollapsed = collapsedWBS.has(row.key);
  const rowTotal = Object.values(row.totals).reduce((a, b) => a + b, 0);

  return (
    <>
      <tr className="bg-orange-50/30 font-medium">
        <td className="px-4 py-2.5 sticky left-0 bg-orange-50/30 z-10">
          <button
            onClick={() => onToggleWBS(row.key)}
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
        row.children.map((activity) => (
          <ActivityBlock
            key={activity.key}
            projectId={projectId}
            planId={planId}
            activity={activity}
            periods={periods}
            entryType={entryType}
            expanded={expandedActivities.has(activity.key)}
            onToggle={() => onToggleActivity(activity.key)}
            onChanged={onChanged}
          />
        ))}
    </>
  );
}

function ActivityBlock({
  projectId,
  planId,
  activity,
  periods,
  entryType,
  expanded,
  onToggle,
  onChanged,
}: {
  projectId: number;
  planId: number;
  activity: CashFlowActivityRow;
  periods: string[];
  entryType: CashFlowEntryType;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const rowTotal = Object.values(activity.totals).reduce((a, b) => a + b, 0);
  const usedCategories = new Set(activity.categories.map((c) => c.category));
  const [addingCategory, setAddingCategory] = useState(false);

  return (
    <>
      <tr className="hover:bg-steel-50/60">
        <td className="px-4 py-2 pl-9 sticky left-0 bg-white z-10">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-steel-700"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {activity.label}
          </button>
        </td>
        {periods.map((period) => (
          <td key={period} className="px-3 py-2 text-right text-steel-600">
            {activity.totals[period]
              ? activity.totals[period].toLocaleString()
              : "—"}
          </td>
        ))}
        <td className="px-4 py-2 text-right text-steel-700">
          {rowTotal.toLocaleString()}
        </td>
      </tr>

      {expanded && (
        <>
          {activity.categories.map((cat) => (
            <CategoryEditRow
              key={cat.key}
              projectId={projectId}
              planId={planId}
              activityId={activity.activity_id}
              category={cat}
              periods={periods}
              entryType={entryType}
              onChanged={onChanged}
            />
          ))}

          {addingCategory ? (
            <tr>
              <td
                className="px-4 py-1.5 pl-14 sticky left-0 bg-white z-10"
                colSpan={periods.length + 2}
              >
                <div className="flex items-center gap-2">
                  <select
                    autoFocus
                    className="border border-steel-300 rounded px-2 py-1 text-xs"
                    onChange={async (e) => {
                      const category = e.target.value as CashFlowCategory;
                      if (!category) return;
                      await createCashFlowEntry(projectId, planId, {
                        activity: activity.activity_id,
                        category,
                        entry_type: entryType,
                        period_start: periods[0],
                        amount: 0,
                      });
                      setAddingCategory(false);
                      onChanged();
                    }}
                  >
                    <option value="">Choose category...</option>
                    {ALL_CATEGORIES.filter((c) => !usedCategories.has(c)).map(
                      (c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ),
                    )}
                  </select>
                  <button
                    onClick={() => setAddingCategory(false)}
                    className="text-xs text-steel-400 hover:text-steel-600"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            usedCategories.size < ALL_CATEGORIES.length && (
              <tr>
                <td
                  className="px-4 py-1.5 pl-14 sticky left-0 bg-white z-10"
                  colSpan={periods.length + 2}
                >
                  <button
                    onClick={() => setAddingCategory(true)}
                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
                  >
                    <Plus size={11} />
                    Add category
                  </button>
                </td>
              </tr>
            )
          )}
        </>
      )}
    </>
  );
}

function CategoryEditRow({
  projectId,
  planId,
  activityId,
  category,
  periods,
  entryType,
  onChanged,
}: {
  projectId: number;
  planId: number;
  activityId: number;
  category: CashFlowCategoryRow;
  periods: string[];
  entryType: CashFlowEntryType;
  onChanged: () => void;
}) {
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [saving, setSaving] = useState(false);

  const total = Object.values(category.cells).reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  function startEdit(period: string) {
    const cell = category.cells[period];
    setEditingPeriod(period);
    setDraftValue(cell ? String(cell.amount) : "0");
  }

  async function commitEdit(period: string) {
    setSaving(true);
    try {
      const amount = Number(draftValue) || 0;
      const cell = category.cells[period];
      if (cell) {
        await updateCashFlowEntry(projectId, planId, cell.entry_id, {
          amount,
        });
      } else {
        await createCashFlowEntry(projectId, planId, {
          activity: activityId,
          category: category.category,
          entry_type: entryType,
          period_start: period,
          amount,
        });
      }
      onChanged();
    } finally {
      setSaving(false);
      setEditingPeriod(null);
    }
  }

  return (
    <tr className="bg-steel-50/30">
      <td className="px-4 py-1.5 pl-14 sticky left-0 bg-steel-50/30 z-10 text-xs text-steel-500">
        {CATEGORY_LABELS[category.category]}
      </td>
      {periods.map((period) => {
        const cell = category.cells[period];
        const isEditing = editingPeriod === period;
        return (
          <td key={period} className="px-1 py-1 text-right">
            {isEditing ? (
              <input
                autoFocus
                type="number"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onBlur={() => commitEdit(period)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(period);
                  if (e.key === "Escape") setEditingPeriod(null);
                }}
                disabled={saving}
                className="w-24 border border-orange-300 rounded px-2 py-1 text-xs text-right"
              />
            ) : (
              <button
                onClick={() => startEdit(period)}
                className="w-24 px-2 py-1 text-xs text-right text-steel-600 hover:bg-orange-50 rounded"
              >
                {cell ? cell.amount.toLocaleString() : "—"}
              </button>
            )}
          </td>
        );
      })}
      <td className="px-4 py-1.5 text-right text-xs text-steel-600 font-medium">
        {total.toLocaleString()}
      </td>
    </tr>
  );
}
