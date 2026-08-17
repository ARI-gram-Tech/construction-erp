// frontend/src/modules/projects/ProjectPlanning/components/ActivityDrawer.tsx

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Calendar,
  Clock,
  FileText,
  GitBranch,
  CheckCircle,
  AlertTriangle,
  Link,
  Trash2,
  Maximize2,
  Minimize2,
  ClipboardList,
} from "lucide-react";
import { deleteActivity } from "@/services/planning";
import { AssignPlannerControl } from "./AssignPlannerControl";
import { ApprovalStatusCard } from "./ApprovalStatusCard";
import { RequirementsTab } from "./RequirementsTab";
import { canManagePlanningStructure } from "./PlanningRoles";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { ActivityProgressPanel } from "./ActivityProgressPanel";
import type { Activity, WBSNode } from "@/types/planning";

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  activity: Activity;
  activities: Activity[];
  wbsNodes: WBSNode[];
  onUpdate: () => void;
  userRole?: string;
  currentUserId?: number;
  projectManagerId?: number | null;
}

type DrawerTab = "overview" | "requirements";

export function ActivityDrawer({
  isOpen,
  onClose,
  projectId,
  activity,
  activities,
  wbsNodes,
  onUpdate,
  userRole,
  currentUserId,
  projectManagerId,
}: ActivityDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [isExpanded, setIsExpanded] = useState(false);

  // Confirmation & deletion modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  async function handleDeleteActivity() {
    setDeleting(true);
    try {
      await deleteActivity(projectId, activity.id);
      setShowDeleteConfirm(false);
      onClose();
      onUpdate();
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
          await deleteActivity(projectId, activity.id, { force: true, reason });
          onClose();
          onUpdate();
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

  const statusConfig = {
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

  const config = statusConfig[activity.status] || statusConfig.not_started;
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
    ? wbsNodes.find((w) => w.id === activity.wbs)
    : null;
  const dependsOnActivity = activity.depends_on
    ? activities.find((a) => a.id === activity.depends_on)
    : null;

  const TABS: { key: DrawerTab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: FileText },
    { key: "requirements", label: "Requirements", icon: ClipboardList },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      {/* Resizable Modal Wrapper */}
      <div
        className={`relative flex flex-col w-full ${
          isExpanded ? "max-w-5xl" : "max-w-lg"
        } min-w-[320px] min-h-400px h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 resize animate-in fade-in zoom-in-95`}
        style={{ resize: "both" }}
      >
        {/* Fixed Header Chrome */}
        <div className="shrink-0 bg-white border-b border-steel-200/50 p-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${config.color}`}
            >
              <StatusIcon size={12} className="inline mr-1" />
              {config.label}
            </span>
            {userRole === "qs" && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                QS View
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-steel-400 hover:text-red-500 transition-colors"
              title="Delete activity"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="shrink-0 px-6 pt-4">
          <div className="flex items-center gap-2 text-xs text-steel-400">
            <span className="font-mono bg-steel-50 px-2 py-0.5 rounded">
              {activity.code || `A${String(activity.id).padStart(4, "0")}`}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-steel-900 mt-1">
            {activity.name}
          </h2>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 px-6 mt-4 border-b border-steel-200/50 flex gap-4">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                tab === key
                  ? "border-orange-500 text-steel-900"
                  : "border-transparent text-steel-500 hover:text-steel-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === "overview" && (
            <>
              <ActivityProgressPanel
                projectId={projectId}
                activity={activity}
                onChange={onUpdate}
              />

              <AssignPlannerControl
                projectId={projectId}
                activity={activity}
                canAssign={canManagePlanningStructure(userRole)}
                onUpdate={onUpdate}
              />
              <ApprovalStatusCard
                projectId={projectId}
                activity={activity}
                currentUserId={currentUserId}
                currentUserRole={userRole}
                projectManagerId={projectManagerId ?? null}
                onUpdate={onUpdate}
              />

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
                <div className="bg-steel-50/50 rounded-lg p-3 flex items-center gap-2">
                  <GitBranch size={14} className="text-steel-400" />
                  <span className="text-sm text-steel-600">WBS Section</span>
                  <span className="text-sm font-medium text-steel-900 ml-auto">
                    {wbsNode.code} {wbsNode.name}
                  </span>
                </div>
              )}

              {dependsOnActivity && (
                <div>
                  <p className="text-xs text-steel-500 uppercase tracking-wide mb-2">
                    Depends On
                  </p>
                  <div className="flex items-center gap-2 text-sm p-2 bg-steel-50 rounded-lg">
                    <Link size={14} className="text-steel-400" />
                    <span className="text-steel-700">
                      {dependsOnActivity.name}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "requirements" && (
            <RequirementsTab
              projectId={projectId}
              activityId={activity.id}
              currentUserId={currentUserId}
              currentUserRole={userRole}
              projectManagerId={projectManagerId ?? null}
            />
          )}
        </div>
      </div>

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
    </div>,
    document.body,
  );
}
