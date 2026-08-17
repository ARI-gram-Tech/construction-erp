// frontend/src/modules/projects/ProjectPlanning/components/ActivityStats.tsx

import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
} from "lucide-react";

interface ActivityStatsProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    delayed: number;
    notStarted: number;
    progress: number;
    overdue: number;
  } | null;
  activities: any[];
  milestones: any[];
}

export function ActivityStats({
  stats,
  activities,
  milestones,
}: ActivityStatsProps) {
  if (!stats) return null;

  const today = new Date().toDateString();
  const completedToday = activities.filter(
    (a) =>
      a.status === "completed" &&
      a.updated_at &&
      new Date(a.updated_at).toDateString() === today,
  ).length;

  const upcoming = activities.filter(
    (a) =>
      a.status !== "completed" &&
      new Date(a.planned_start) > new Date() &&
      new Date(a.planned_start) <=
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ).length;

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-5 space-y-4 sticky top-4">
      <h4 className="text-xs font-semibold text-steel-500 uppercase tracking-wider">
        Today's Progress
      </h4>

      <div className="space-y-3">
        <StatItem
          icon={<Calendar size={14} className="text-steel-400" />}
          label="Activities"
          value={stats.total}
        />
        <StatItem
          icon={<CheckCircle size={14} className="text-green-500" />}
          label="Completed Today"
          value={completedToday}
        />
        <StatItem
          icon={<AlertTriangle size={14} className="text-red-500" />}
          label="Delayed"
          value={stats.delayed}
        />
        <StatItem
          icon={<Clock size={14} className="text-blue-500" />}
          label="Upcoming (7 days)"
          value={upcoming}
        />

        <StatItem
          icon={<Users size={14} className="text-purple-500" />}
          label="Milestones"
          value={milestones.length}
        />
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-steel-100 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-steel-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-steel-900">{value}</span>
    </div>
  );
}
