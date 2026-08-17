// frontend/src/modules/projects/ProjectPlanning/components/MilestonesSection.tsx (updated)

import {
  Flag,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
} from "lucide-react";
import type { Milestone } from "@/types/planning";

interface MilestonesSectionProps {
  milestones: Milestone[];
  onAddMilestone: () => void;
  onMilestoneClick?: (milestone: Milestone) => void;
}

const STATUS_CONFIG = {
  achieved: {
    icon: CheckCircle,
    label: "Achieved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  },
  missed: {
    icon: XCircle,
    label: "Missed",
    className: "bg-red-50 text-red-700 border-red-200/50",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-steel-100 text-steel-600 border-steel-200/50",
  },
};

export function MilestonesSection({
  milestones,
  onAddMilestone,
  onMilestoneClick,
}: MilestonesSectionProps) {
  // Group by month for timeline view
  const groupedByMonth = milestones.reduce(
    (acc, m) => {
      const date = new Date(m.target_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    },
    {} as Record<string, Milestone[]>,
  );

  const sortedMonths = Object.keys(groupedByMonth).sort();

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-steel-100">
        <h3 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
            <Flag size={16} />
          </div>
          Milestones
          <span className="text-xs text-steel-400 font-normal ml-1">
            ({milestones.length})
          </span>
        </h3>
        <button
          onClick={onAddMilestone}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="p-4">
        {milestones.length > 0 ? (
          <div className="space-y-4">
            {sortedMonths.map((month) => (
              <div key={month}>
                <div className="text-xs font-medium text-steel-500 mb-2">
                  {new Date(month + "-01").toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="space-y-2">
                  {groupedByMonth[month].map((m) => {
                    const config =
                      STATUS_CONFIG[m.status] || STATUS_CONFIG.pending;
                    const Icon = config.icon;
                    return (
                      <div
                        key={m.id}
                        onClick={() => onMilestoneClick?.(m)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border ${config.className} transition-colors cursor-pointer hover:shadow-sm`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon size={14} className="shrink-0" />
                          <span className="text-sm font-medium text-steel-900 truncate">
                            {m.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-steel-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(m.target_date).toLocaleDateString()}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">
                            {config.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Flag size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">No milestones set yet.</p>
            <p className="text-xs text-steel-400 mt-1">
              Milestones are key project events like "Foundation Complete" or
              "Handover"
            </p>
            <button
              onClick={onAddMilestone}
              className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              Add your first milestone
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
