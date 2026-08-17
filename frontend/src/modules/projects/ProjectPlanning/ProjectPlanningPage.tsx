// frontend/src/modules/projects/ProjectPlanning/ProjectPlanningPage.tsx

import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CalendarRange,
  Plus,
  LayoutDashboard,
  GitBranch,
  GitCommitVertical,
  CheckCircle,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import {
  listActivities,
  listMilestones,
  listWBS,
  listBaselines,
} from "@/services/planning";
import { WBSTree, type WBSTreeHandle } from "./WBSTree";
import { PlanningHeader } from "./components/PlanningHeader";
import { MilestonesSection } from "./components/MilestonesSection";
import { GanttView } from "./components/GanttView";
import { AddActivityModal } from "./components/AddActivityModal";
import { AddMilestoneModal } from "./components/AddMilestoneModal";
import { BaselinesSection } from "./components/BaselinesSection";
import { SourceProgrammePanel } from "./components/SourceProgrammePanel";
import { ActivityFilters } from "./components/ActivityFilters";
import { ActivityStats } from "./components/ActivityStats";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { RecycleBinPanel } from "./components/RecycleBinPanel";
import type { Activity } from "@/types/planning";

type Tab =
  | "overview"
  | "milestones"
  | "wbs"
  | "activities"
  | "baselines"
  | "gantt"
  | "bin";

export function ProjectPlanningPage() {
  const { projectId = "" } = useParams();
  const id = Number(projectId);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const wbsTreeRef = useRef<WBSTreeHandle>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [delayFilter, setDelayFilter] = useState<string>("all");

  const {
    data: activities,
    loading,
    error,
    reload,
  } = useFetch(() => listActivities(id), [id]);
  const { data: milestones, reload: reloadMilestones } = useFetch(
    () => listMilestones(id),
    [id],
  );
  const { data: wbsNodes, reload: reloadWBS } = useFetch(
    () => listWBS(id),
    [id],
  );
  const { data: baselines, reload: reloadBaselines } = useFetch(
    () => listBaselines(id),
    [id],
  );

  // Computed stats
  const stats = useMemo(() => {
    if (!activities) return null;

    const total = activities.length;
    const completed = activities.filter((a) => a.status === "completed").length;
    const inProgress = activities.filter(
      (a) => a.status === "in_progress",
    ).length;
    const delayed = activities.filter((a) => a.status === "delayed").length;
    const notStarted = activities.filter(
      (a) => a.status === "not_started",
    ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    const overdue = activities.filter((a) => {
      if (a.status === "completed") return false;
      return new Date(a.planned_end) < new Date();
    }).length;

    return {
      total,
      completed,
      inProgress,
      delayed,
      notStarted,
      progress,
      overdue,
    };
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    if (!activities) return [];

    let list = [...activities];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.code && a.code.toLowerCase().includes(q)),
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (delayFilter === "overdue") {
      list = list.filter((a) => {
        if (a.status === "completed") return false;
        return new Date(a.planned_end) < new Date();
      });
    } else if (delayFilter === "delayed") {
      list = list.filter((a) => a.status === "delayed");
    }

    return list;
  }, [activities, searchQuery, statusFilter, delayFilter]);

  const handleActivityClick = (activity: Activity) => {
    navigate(`/projects/${id}/planning/activities/${activity.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <span className="text-steel-500 text-sm">
            Loading planning data...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-steel-100 rounded-lg p-1 overflow-x-auto max-w-full">
        {[
          { key: "overview", label: "Overview", icon: LayoutDashboard },
          { key: "milestones", label: "Milestones", icon: GitCommitVertical },
          { key: "wbs", label: "WBS", icon: GitBranch },
          { key: "activities", label: "Activities", icon: CalendarRange },
          { key: "baselines", label: "Baselines", icon: CheckCircle },
          { key: "gantt", label: "Gantt", icon: CalendarRange },
          { key: "bin", label: "Bin", icon: Trash2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as Tab)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all shrink-0 ${
              activeTab === key
                ? "bg-white text-steel-900 shadow-sm"
                : "text-steel-500 hover:text-steel-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <PlanningHeader
        activeTab={activeTab}
        onAddActivity={() => setShowActivityModal(true)}
        onAddMilestone={() => setShowMilestoneModal(true)}
        onAddSection={() => wbsTreeRef.current?.openAddSection()}
      />

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-4">
                  <p className="text-xs text-steel-500">Activities</p>
                  <p className="text-xl font-bold text-steel-900">
                    {stats.total}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-4">
                  <p className="text-xs text-green-600">Completed</p>
                  <p className="text-xl font-bold text-green-600">
                    {stats.completed}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-4">
                  <p className="text-xs text-amber-600">In Progress</p>
                  <p className="text-xl font-bold text-amber-600">
                    {stats.inProgress}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-4">
                  <p className="text-xs text-red-600">Delayed</p>
                  <p className="text-xl font-bold text-red-600">
                    {stats.delayed}
                  </p>
                </div>
              </div>
            )}

            {/* Progress Overview */}
            <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-steel-900 mb-4">
                Overall Progress
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-steel-600">
                      {stats?.progress || 0}% Complete
                    </span>
                    <span className="text-steel-400">
                      {stats?.total || 0} activities
                    </span>
                  </div>
                  <div className="w-full h-3 bg-steel-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats?.progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-steel-600">Completed</span>
                    <span className="text-sm font-semibold ml-auto">
                      {stats?.completed || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-steel-600">In Progress</span>
                    <span className="text-sm font-semibold ml-auto">
                      {stats?.inProgress || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm text-steel-600">Delayed</span>
                    <span className="text-sm font-semibold ml-auto">
                      {stats?.delayed || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-steel-300" />
                    <span className="text-sm text-steel-600">Not Started</span>
                    <span className="text-sm font-semibold ml-auto">
                      {stats?.notStarted || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm">
              <div className="p-4 border-b border-steel-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-steel-900">
                  Recent Activities
                </h3>
                <button
                  onClick={() => setActiveTab("activities")}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="divide-y divide-steel-100">
                {activities?.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className="p-4 hover:bg-steel-50/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-steel-900">
                          {activity.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-steel-500 mt-0.5">
                          <span>Progress: {activity.percent_complete}%</span>
                          <span>•</span>
                          <span>
                            {new Date(
                              activity.planned_start,
                            ).toLocaleDateString()}{" "}
                            →{" "}
                            {new Date(
                              activity.planned_end,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          activity.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : activity.status === "in_progress"
                              ? "bg-amber-50 text-amber-700"
                              : activity.status === "delayed"
                                ? "bg-red-50 text-red-700"
                                : "bg-steel-100 text-steel-600"
                        }`}
                      >
                        {activity.status === "completed"
                          ? "✅ Completed"
                          : activity.status === "in_progress"
                            ? "🟡 In Progress"
                            : activity.status === "delayed"
                              ? "🔴 Delayed"
                              : "⚪ Not Started"}
                      </span>
                    </div>
                  </div>
                ))}
                {(!activities || activities.length === 0) && (
                  <div className="p-8 text-center text-steel-500 text-sm">
                    No activities yet. Start planning by adding your first
                    activity.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SourceProgrammePanel projectId={id} />
            <MilestonesSection
              milestones={milestones ?? []}
              onAddMilestone={() => setShowMilestoneModal(true)}
              onMilestoneClick={() => {
                /* Handle milestone click */
              }}
            />
            <ActivityStats
              stats={stats}
              activities={activities ?? []}
              milestones={milestones ?? []}
            />
          </div>
        </div>
      )}

      {activeTab === "activities" && (
        <div className="space-y-4">
          <ActivityFilters
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            delayFilter={delayFilter}
            onDelayFilterChange={setDelayFilter}
          />

          <div className="grid grid-cols-1 gap-3">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className="bg-white rounded-xl border border-steel-200/60 p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-steel-400 bg-steel-50 px-2 py-0.5 rounded">
                          {activity.code ||
                            `A${String(activity.id).padStart(4, "0")}`}
                        </span>
                        <h4 className="text-sm font-medium text-steel-900 group-hover:text-orange-600 transition-colors truncate">
                          {activity.name}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-steel-500">
                        <span className="flex items-center gap-1">
                          👷 {activity.responsible_name || "Unassigned"}
                        </span>
                        <span className="flex items-center gap-1">
                          📅{" "}
                          {new Date(
                            activity.planned_start,
                          ).toLocaleDateString()}{" "}
                          →{" "}
                          {new Date(activity.planned_end).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          ⏱️{" "}
                          {Math.max(
                            1,
                            Math.round(
                              (new Date(activity.planned_end).getTime() -
                                new Date(activity.planned_start).getTime()) /
                                86400000,
                            ) + 1,
                          )}{" "}
                          days
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 max-w-48 h-2 bg-steel-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              activity.status === "completed"
                                ? "bg-green-500"
                                : activity.status === "delayed"
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                            }`}
                            style={{ width: `${activity.percent_complete}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-steel-600">
                          {activity.percent_complete}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${
                          activity.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : activity.status === "in_progress"
                              ? "bg-amber-50 text-amber-700"
                              : activity.status === "delayed"
                                ? "bg-red-50 text-red-700"
                                : "bg-steel-100 text-steel-600"
                        }`}
                      >
                        {activity.status === "completed"
                          ? "✅ Completed"
                          : activity.status === "in_progress"
                            ? "🟡 In Progress"
                            : activity.status === "delayed"
                              ? "🔴 Delayed"
                              : "⚪ Not Started"}
                      </span>
                      <button className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-steel-200/60 p-12 text-center">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarRange size={32} className="text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-steel-900 mb-2">
                  No Activities Found
                </h3>
                <p className="text-sm text-steel-500 max-w-sm mx-auto">
                  {searchQuery ||
                  statusFilter !== "all" ||
                  delayFilter !== "all"
                    ? "No activities match your current filters. Try adjusting your search or filters."
                    : "Start building your project schedule by creating activities."}
                </p>
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  <Plus size={16} />
                  Add Activity
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "gantt" && (
        <GanttView
          projectId={id}
          activities={activities ?? []}
          wbsNodes={wbsNodes ?? []}
          onProgressUpdate={reload}
          onActivityClick={handleActivityClick}
        />
      )}

      {activeTab === "wbs" && (
        <WBSTree
          ref={wbsTreeRef}
          projectId={id}
          nodes={wbsNodes ?? []}
          activities={activities ?? []}
          onChange={reloadWBS}
        />
      )}

      {activeTab === "milestones" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-steel-900">
            Milestones Timeline
          </h2>
          <MilestonesSection
            milestones={milestones ?? []}
            onAddMilestone={() => setShowMilestoneModal(true)}
            onMilestoneClick={() => {
              /* Handle milestone click */
            }}
          />
          <ActivityTimeline activities={activities ?? []} />
        </div>
      )}

      {activeTab === "baselines" && (
        <BaselinesSection
          projectId={id}
          baselines={baselines ?? []}
          onChange={reloadBaselines}
        />
      )}

      {activeTab === "bin" && (
        <RecycleBinPanel
          projectId={id}
          onChange={() => {
            reload();
            reloadWBS();
          }}
        />
      )}

      {/* Modals */}
      <AddActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        projectId={id}
        wbsNodes={wbsNodes ?? []}
        onSuccess={reload}
      />

      <AddMilestoneModal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        projectId={id}
        onSuccess={reloadMilestones}
      />
    </div>
  );
}
