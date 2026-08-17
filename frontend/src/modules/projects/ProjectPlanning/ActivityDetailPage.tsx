// frontend/src/modules/projects/ProjectPlanning/ActivityDetailPage.tsx

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  FileText,
  GitBranch,
  CheckCircle,
  AlertTriangle,
  Link as LinkIcon,
  Trash2,
  Package,
  Users,
  Truck,
  Hammer,
  HardHat,
  Briefcase,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { useAuth } from "@/context/AuthContext";
import { listActivities, listWBS, deleteActivity } from "@/services/planning";
import { getProject } from "@/services/projects";
import { AssignPlannerControl } from "./components/AssignPlannerControl";
import { ApprovalStatusCard } from "./components/ApprovalStatusCard";
import { RequirementGroupTab } from "./components/RequirementGroupTab";
import { canManagePlanningStructure } from "./components/PlanningRoles";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { ActivityProgressPanel } from "./components/ActivityProgressPanel";
import type { RequirementGroupType } from "@/types/planning";

type DetailTab = "overview" | RequirementGroupType;

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    color: "bg-green-50 text-green-700",
    icon: CheckCircle,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-amber-50 text-amber-700",
    icon: Clock,
  },
  delayed: {
    label: "Delayed",
    color: "bg-red-50 text-red-700",
    icon: AlertTriangle,
  },
  not_started: {
    label: "Not Started",
    color: "bg-steel-100 text-steel-600",
    icon: Clock,
  },
};

// Order + labels/icons for the six requirement-group tabs. Each one now
// gets its own tab (instead of all six being stacked under a single
// "Requirements" tab), matching the tab row in the sketch.
const REQUIREMENT_TABS: {
  key: RequirementGroupType;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "materials", label: "Material", icon: Package },
  { key: "labour", label: "Labour", icon: Users },
  { key: "plant_equipment", label: "Plant & Equip.", icon: Truck },
  { key: "tools", label: "Tool", icon: Hammer },
  { key: "ppe_safety", label: "PPE & Safety", icon: HardHat },
  { key: "services", label: "Service", icon: Briefcase },
];

export function ActivityDetailPage() {
  const { projectId = "", activityId = "" } = useParams();
  const id = Number(projectId);
  const actId = Number(activityId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<DetailTab>("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    data: activities,
    loading,
    error,
    reload,
  } = useFetch(() => listActivities(id), [id]);
  const { data: wbsNodes } = useFetch(() => listWBS(id), [id]);
  const { data: project } = useFetch(() => getProject(id), [id]);

  const activity = activities?.find((a) => a.id === actId);

  async function handleDeleteActivity() {
    if (!activity) return;
    setDeleting(true);
    try {
      await deleteActivity(id, activity.id);
      setShowDeleteConfirm(false);
      navigate(`/projects/${id}/planning?tab=activities`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "";
      if (detail.includes("force-delete")) {
        setShowDeleteConfirm(false);
        const reason = prompt(
          `${detail}\n\nIf you are a company admin/director and want to proceed anyway, enter a reason below:`,
        );
        if (!reason) {
          setDeleting(false);
          return;
        }
        try {
          await deleteActivity(id, activity.id, { force: true, reason });
          navigate(`/projects/${id}/planning?tab=activities`);
        } catch (err2: any) {
          alert(err2?.response?.data?.detail || "Force-delete failed.");
        }
      } else {
        alert(detail || "Couldn't delete this activity.");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <span className="text-steel-500 text-sm">Loading activity...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg max-w-3xl">
        {error}
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-3xl space-y-4">
        <Link
          to={`/projects/${id}/planning?tab=activities`}
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-800"
        >
          <ArrowLeft size={14} />
          Back to Activities
        </Link>
        <div className="bg-white rounded-xl border border-dashed border-steel-300 p-8 text-center text-sm text-steel-500">
          Activity not found — it may have been deleted.
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[activity.status] || STATUS_CONFIG.not_started;
  const StatusIcon = config.icon;

  const durationDays = Math.max(
    1,
    Math.round(
      (new Date(activity.planned_end).getTime() -
        new Date(activity.planned_start).getTime()) /
        86400000,
    ) + 1,
  );

  const wbsNode = activity.wbs
    ? wbsNodes?.find((w) => w.id === activity.wbs)
    : null;
  const dependsOnActivity = activity.depends_on
    ? activities?.find((a) => a.id === activity.depends_on)
    : null;

  const TABS: { key: DetailTab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: FileText },
    ...REQUIREMENT_TABS,
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        to={`/projects/${id}/planning?tab=activities`}
        className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-800 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Activities
      </Link>

      {/* Header card — identity + tabs. The tab row now covers Overview
          plus each of the six requirement groups individually, so
          switching to "Labour" (say) shows only Labour, not all six
          groups stacked. */}
      <div className="bg-white rounded-2xl border border-steel-200/70 overflow-hidden">
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full ${config.color}`}
              >
                <StatusIcon size={12} className="inline mr-1" />
                {config.label}
              </span>
              {user?.role === "qs" && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                  QS View
                </span>
              )}
              <span className="font-mono text-xs bg-steel-50 px-2 py-0.5 rounded text-steel-400">
                {activity.code || `A${String(activity.id).padStart(4, "0")}`}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-steel-900 mt-2 truncate">
              {activity.name}
            </h1>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-red-50 text-steel-400 hover:text-red-500 transition-colors shrink-0"
            title="Delete activity"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="flex flex-wrap items-center gap-1 bg-steel-100 rounded-lg p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 basis-24 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                  tab === key
                    ? "bg-white text-steel-900 shadow-sm"
                    : "text-steel-500 hover:text-steel-700"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Persistent summary strip — title, progress, and dates stay
            visible no matter which tab is selected, so switching between
            Material / Labour / Tool etc. never loses this context. */}
        <div className="px-6 pb-5 pt-1 border-t border-steel-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-medium text-steel-700">
              {activity.name}
            </p>
            <div className="flex items-center gap-2 min-w-40">
              <div className="flex-1 h-2 bg-steel-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${activity.percent_complete}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-steel-600 shrink-0">
                {activity.percent_complete}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-steel-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-steel-400" />
              {new Date(activity.planned_start).toLocaleDateString()} →{" "}
              {new Date(activity.planned_end).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-steel-400" />
              {durationDays} days
            </span>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-6">
          <ActivityProgressPanel
            projectId={id}
            activity={activity}
            onChange={reload}
          />

          <AssignPlannerControl
            projectId={id}
            activity={activity}
            canAssign={canManagePlanningStructure(user?.role)}
            onUpdate={reload}
          />
          <ApprovalStatusCard
            projectId={id}
            activity={activity}
            currentUserId={user?.id}
            currentUserRole={user?.role}
            projectManagerId={project?.project_manager ?? null}
            onUpdate={reload}
          />

          <div className="bg-white rounded-xl border border-steel-200/60 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-steel-500 uppercase tracking-wide">
                  Start Date
                </p>
                <p className="text-sm font-medium text-steel-900 flex items-center gap-1">
                  <Calendar size={14} className="text-steel-400 shrink-0" />
                  {new Date(activity.planned_start).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-steel-500 uppercase tracking-wide">
                  End Date
                </p>
                <p className="text-sm font-medium text-steel-900 flex items-center gap-1">
                  <Calendar size={14} className="text-steel-400 shrink-0" />
                  {new Date(activity.planned_end).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2 space-y-1 min-w-0">
                <p className="text-xs text-steel-500 uppercase tracking-wide">
                  Responsible
                </p>
                <p
                  className="text-sm font-medium text-steel-900 flex items-center gap-1 min-w-0"
                  title={activity.responsible_name || "Unassigned"}
                >
                  <User size={14} className="text-steel-400 shrink-0" />
                  <span className="truncate">
                    {activity.responsible_name || "Unassigned"}
                  </span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-steel-500 uppercase tracking-wide">
                  Duration
                </p>
                <p className="text-sm font-medium text-steel-900 flex items-center gap-1">
                  <Clock size={14} className="text-steel-400 shrink-0" />
                  {durationDays} days
                </p>
              </div>
            </div>

            {wbsNode && (
              <div className="bg-steel-50/50 rounded-lg p-3 flex items-center gap-2 mt-4">
                <GitBranch size={14} className="text-steel-400" />
                <span className="text-sm text-steel-600">WBS Section</span>
                <span className="text-sm font-medium text-steel-900 ml-auto">
                  {wbsNode.code} {wbsNode.name}
                </span>
              </div>
            )}

            {dependsOnActivity && (
              <div className="mt-4">
                <p className="text-xs text-steel-500 uppercase tracking-wide mb-2">
                  Depends On
                </p>
                <div className="flex items-center gap-2 text-sm p-2 bg-steel-50 rounded-lg">
                  <LinkIcon size={14} className="text-steel-400" />
                  <span className="text-steel-700">
                    {dependsOnActivity.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab !== "overview" && (
        <RequirementGroupTab
          projectId={id}
          activityId={activity.id}
          groupType={tab}
          currentUserId={user?.id}
          currentUserRole={user?.role}
          projectManagerId={project?.project_manager ?? null}
        />
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title="Delete Activity?"
        itemName={`${activity.code || `A${activity.id}`} - ${activity.name}`}
        consequences={[
          "This activity will be removed from the project schedule.",
          "Associated material, labour, and equipment allocations will be unlinked.",
        ]}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteActivity}
        confirming={deleting}
      />
    </div>
  );
}
