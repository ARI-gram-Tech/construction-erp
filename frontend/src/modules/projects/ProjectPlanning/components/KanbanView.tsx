// frontend/src/modules/projects/ProjectPlanning/components/KanbanView.tsx
import { useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import type { Activity } from "@/types/planning";
import { ProgressModal } from "./ProgressModal";

interface KanbanViewProps {
  projectId: number;
  activities: Activity[];
  onProgressUpdate: () => void;
}

const KANBAN_COLUMNS: {
  status: Activity["status"];
  label: string;
  icon: React.ElementType;
}[] = [
  { status: "not_started", label: "Not Started", icon: Clock },
  { status: "in_progress", label: "In Progress", icon: MoreVertical },
  { status: "delayed", label: "Delayed", icon: AlertCircle },
  { status: "completed", label: "Completed", icon: CheckCircle },
];

const STATUS_COLORS = {
  not_started: "border-steel-200 bg-steel-50/50",
  in_progress: "border-blue-200 bg-blue-50/30",
  delayed: "border-red-200 bg-red-50/30",
  completed: "border-emerald-200 bg-emerald-50/30",
};

const STATUS_BADGE = {
  not_started: "bg-steel-100 text-steel-600",
  in_progress: "bg-blue-100 text-blue-700",
  delayed: "bg-red-100 text-red-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export function KanbanView({
  projectId,
  activities,
  onProgressUpdate,
}: KanbanViewProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map((col) => {
        const items = activities.filter((a) => a.status === col.status);
        const Icon = col.icon;

        return (
          <div
            key={col.status}
            className={`rounded-xl border ${STATUS_COLORS[col.status]} p-4 min-h-50`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-steel-500" />
                <h4 className="text-xs font-semibold text-steel-700 uppercase tracking-wide">
                  {col.label}
                </h4>
              </div>
              <span className="text-xs font-medium text-steel-500 bg-white/60 px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="w-full text-left bg-white rounded-lg border border-steel-200/60 p-3 hover:shadow-md hover:border-orange-200 transition-all duration-200 group"
                >
                  <p className="text-sm font-medium text-steel-900 group-hover:text-orange-600 transition-colors">
                    {activity.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-steel-400">
                    <Calendar size={12} />
                    <span>
                      {new Date(activity.planned_start).toLocaleDateString()} →{" "}
                      {new Date(activity.planned_end).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-steel-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_BADGE[activity.status].split(" ")[0]}`}
                        style={{ width: `${activity.percent_complete}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-steel-500">
                      {activity.percent_complete}%
                    </span>
                  </div>
                </button>
              ))}

              {items.length === 0 && (
                <div className="text-center py-4 text-xs text-steel-400 border-2 border-dashed border-steel-200 rounded-lg">
                  No items
                </div>
              )}
            </div>
          </div>
        );
      })}

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
