// frontend/src/modules/projects/ProjectPlanning/components/PlanningHeader.tsx
import {
  CalendarRange,
  Plus,
  LayoutDashboard,
  GitBranch,
  GitCommitVertical,
  CheckCircle,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";

type Tab =
  | "overview"
  | "milestones"
  | "wbs"
  | "activities"
  | "baselines"
  | "gantt"
  | "bin";

interface PlanningHeaderProps {
  activeTab: Tab;
  onAddActivity: () => void;
  onAddMilestone: () => void;
  onAddSection: () => void;
  canManageStructure?: boolean;
  userRole?: string;
}

const TITLE_BY_TAB: Record<Tab, { label: string; icon: React.ElementType }> = {
  overview: { label: "Overview", icon: LayoutDashboard },
  milestones: { label: "Milestones", icon: GitCommitVertical },
  wbs: { label: "Work Breakdown Structure", icon: GitBranch },
  activities: { label: "Activities", icon: CalendarRange },
  baselines: { label: "Baselines", icon: CheckCircle },
  gantt: { label: "Gantt Chart", icon: CalendarRange },
  bin: { label: "Recycle Bin", icon: Trash2 },
};

export function PlanningHeader({
  activeTab,
  onAddActivity,
  onAddMilestone,
  onAddSection,
  canManageStructure = true,
  userRole,
}: PlanningHeaderProps) {
  const actionsByTab: Partial<
    Record<Tab, { label: string; onClick: () => void }>
  > = {
    wbs: { label: "Add Section", onClick: onAddSection },
    milestones: { label: "Add Milestone", onClick: onAddMilestone },
    activities: { label: "Add Activity", onClick: onAddActivity },
    gantt: { label: "Add Activity", onClick: onAddActivity },
  };

  const action = canManageStructure ? actionsByTab[activeTab] : undefined;
  const { label: title, icon: TitleIcon } = TITLE_BY_TAB[activeTab];

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-xl border border-orange-200/50">
            <TitleIcon size={24} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-steel-900">{title}</h1>
            {userRole === "qs" && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium mt-1">
                <FileSpreadsheet size={12} /> QS Verification Mode
              </span>
            )}
          </div>
        </div>

        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
