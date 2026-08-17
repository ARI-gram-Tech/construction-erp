// frontend/src/modules/projects/ProjectPlanning/components/ActivityTimeline.tsx

import { useMemo } from "react";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import type { Activity } from "@/types/planning";

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    activities.forEach((a) => {
      const date = new Date(a.planned_start).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(a);
    });
    return groups;
  }, [activities]);

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-8 text-center">
        <Clock size={24} className="text-steel-300 mx-auto mb-2" />
        <p className="text-sm text-steel-500">
          No activities to display in timeline
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-steel-900 mb-4">
        Activity Timeline
      </h3>
      <div className="space-y-6">
        {Object.entries(grouped)
          .slice(0, 10)
          .map(([date, items]) => (
            <div key={date}>
              <div className="text-xs font-medium text-steel-500 mb-2">
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="space-y-2">
                {items.map((activity) => {
                  const Icon =
                    activity.status === "completed"
                      ? CheckCircle
                      : activity.status === "delayed"
                        ? AlertTriangle
                        : Clock;
                  const iconColor =
                    activity.status === "completed"
                      ? "text-green-500"
                      : activity.status === "delayed"
                        ? "text-red-500"
                        : "text-blue-500";

                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-2 bg-steel-50/50 rounded-lg"
                    >
                      <Icon size={14} className={iconColor} />
                      <span className="text-sm text-steel-900 flex-1">
                        {activity.name}
                      </span>
                      <span className="text-xs text-steel-400">
                        {activity.percent_complete}% complete
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-steel-200 text-steel-600">
                        {activity.status === "completed"
                          ? "✅ Done"
                          : activity.status === "in_progress"
                            ? "🟡 Active"
                            : activity.status === "delayed"
                              ? "🔴 Delayed"
                              : "⚪ Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
