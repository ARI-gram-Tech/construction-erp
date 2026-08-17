// frontend/src/modules/projects/ProjectPlanning/components/GanttView.tsx

import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import type { Activity, WBSNode } from "@/types/planning";
import { ProgressModal } from "./ProgressModal";

interface GanttViewProps {
  projectId: number;
  activities: Activity[];
  wbsNodes: WBSNode[];
  onProgressUpdate: () => void;
  onActivityClick?: (activity: Activity) => void;
}

const STATUS_STYLES: Record<
  Activity["status"],
  { bar: string; badge: string; label: string; icon: React.ElementType }
> = {
  not_started: {
    bar: "bg-steel-300",
    badge: "bg-steel-100 text-steel-600",
    label: "Not Started",
    icon: Clock,
  },
  in_progress: {
    bar: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
    label: "In Progress",
    icon: MoreVertical,
  },
  delayed: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700",
    label: "Delayed",
    icon: AlertCircle,
  },
  completed: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Completed",
    icon: CheckCircle,
  },
};

function daysBetween(a: string, b: string) {
  return Math.max(
    1,
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000),
  );
}

function groupByWBS(activities: Activity[], wbsNodes: WBSNode[]) {
  const nodeMap = new Map(wbsNodes.map((n) => [n.id, n]));
  const groups = new Map<
    number | "none",
    { label: string; items: Activity[] }
  >();

  activities.forEach((a) => {
    const key = a.wbs ?? "none";
    if (!groups.has(key)) {
      const label =
        a.wbs && nodeMap.has(a.wbs)
          ? `${nodeMap.get(a.wbs)!.code} ${nodeMap.get(a.wbs)!.name}`
          : "Ungrouped";
      groups.set(key, { label, items: [] });
    }
    groups.get(key)!.items.push(a);
  });

  return Array.from(groups.values());
}

export function GanttView({
  projectId,
  activities,
  wbsNodes,
  onProgressUpdate,
  onActivityClick,
}: GanttViewProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (!activities || activities.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return { rangeStart: today, rangeEnd: today, totalDays: 1 };
    }
    const starts = activities.map((a) => a.planned_start);
    const ends = activities.map((a) => a.planned_end);
    const start = starts.reduce((a, b) => (a < b ? a : b));
    const end = ends.reduce((a, b) => (a > b ? a : b));
    return {
      rangeStart: start,
      rangeEnd: end,
      totalDays: daysBetween(start, end),
    };
  }, [activities]);

  function barStyle(activity: Activity) {
    const offsetDays = daysBetween(rangeStart, activity.planned_start) - 1;
    const durationDays = daysBetween(
      activity.planned_start,
      activity.planned_end,
    );
    return {
      marginLeft: `${Math.max((offsetDays / totalDays) * 100, 0)}%`,
      width: `${Math.max((durationDays / totalDays) * 100, 2)}%`,
    };
  }

  const groups = groupByWBS(activities, wbsNodes);

  const handleActivityClick = (activity: Activity) => {
    if (onActivityClick) {
      onActivityClick(activity);
    } else {
      setSelectedActivity(activity);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-steel-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-steel-400" />
            <span className="text-sm font-medium text-steel-900">
              Gantt Chart
            </span>
            <span className="text-xs text-steel-400 ml-2">
              {activities.length} activities
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-steel-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-steel-300" />
              Not Started
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-blue-500" />
              In Progress
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-red-500" />
              Delayed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-emerald-500" />
              Completed
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="flex justify-between text-xs text-steel-400 mb-4 px-1">
          <span>{new Date(rangeStart).toLocaleDateString()}</span>
          <span>{new Date(rangeEnd).toLocaleDateString()}</span>
        </div>

        {activities.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-steel-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar size={24} className="text-steel-300" />
            </div>
            <p className="text-sm text-steel-500">No activities to display</p>
            <p className="text-xs text-steel-400 mt-1">
              Add activities to see them on the Gantt chart
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 min-w-125">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </p>
                <div className="flex flex-col gap-2">
                  {group.items.map((activity) => {
                    const style = STATUS_STYLES[activity.status];
                    const Icon = style.icon;

                    return (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 group cursor-pointer"
                        onClick={() => handleActivityClick(activity)}
                      >
                        <div className="w-48 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Icon size={12} className="text-steel-400" />
                            <span className="text-sm text-steel-700 truncate hover:text-orange-600 transition-colors">
                              {activity.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-steel-400 block">
                            {activity.percent_complete}% complete
                          </span>
                        </div>
                        <div className="flex-1 relative h-8 bg-steel-50 rounded-lg overflow-hidden group/bar">
                          <button
                            onClick={() => handleActivityClick(activity)}
                            style={barStyle(activity)}
                            className={`absolute top-0 h-8 rounded-lg ${style.bar} opacity-90 hover:opacity-100 transition-all duration-200 flex items-center px-2 shadow-sm hover:shadow-md group-hover/bar:scale-y-105`}
                          >
                            <span className="text-[10px] font-medium text-white truncate">
                              {activity.percent_complete}%
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedActivity && (
        <ProgressModal
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          projectId={projectId}
          activity={selectedActivity}
          onSuccess={() => {
            onProgressUpdate();
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}
