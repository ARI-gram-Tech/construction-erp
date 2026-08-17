// frontend/src/modules/projects/ProjectPlanning/components/ApprovalStatusCard.tsx
import { useState } from "react";
import { CheckCircle2, Circle, Send, XCircle } from "lucide-react";
import {
  submitPlanning,
  approvePlanning,
  requestPlanningChanges,
} from "@/services/planning";
import { isQS, isProjectPM } from "./PlanningRoles";
import type { Activity } from "@/types/planning";

interface ApprovalStatusCardProps {
  projectId: number;
  activity: Activity;
  currentUserId?: number;
  currentUserRole?: string;
  projectManagerId: number | null;
  onUpdate: () => void;
}

const STATUS_LABEL: Record<Activity["planning_status"], string> = {
  not_planned: "Not Planned",
  in_progress: "Planning In Progress",
  submitted: "Submitted for Approval",
  approved: "Approved for Execution",
  changes_requested: "Changes Requested",
};

const STATUS_COLOR: Record<Activity["planning_status"], string> = {
  not_planned: "bg-steel-100 text-steel-600",
  in_progress: "bg-blue-50 text-blue-700",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  changes_requested: "bg-red-50 text-red-700",
};

export function ApprovalStatusCard({
  projectId,
  activity,
  currentUserId,
  currentUserRole,
  projectManagerId,
  onUpdate,
}: ApprovalStatusCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [note, setNote] = useState("");
  const [budget, setBudget] = useState("");

  const isPlanner = activity.assigned_planner === currentUserId;
  const isPM = isProjectPM(currentUserId, currentUserRole, projectManagerId);
  const isQsUser = isQS(currentUserRole);

  async function run(fn: () => Promise<Activity>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onUpdate();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "That action didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    await run(() => submitPlanning(projectId, activity.id));
  }

  async function handleApprove(tier: "pm" | "qs") {
    await run(() =>
      approvePlanning(
        projectId,
        activity.id,
        tier,
        tier === "qs" && budget ? Number(budget) : undefined,
      ),
    );
    setBudget("");
  }

  async function handleRequestChanges() {
    if (!note.trim()) return;
    await run(() =>
      requestPlanningChanges(projectId, activity.id, note.trim()),
    );
    setNote("");
    setShowChangesForm(false);
  }

  if (activity.planning_status === "not_planned") return null;

  return (
    <div className="bg-white border border-steel-200/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-steel-900">
          Approval Status
        </h4>
        <span
          className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLOR[activity.planning_status]}`}
        >
          {STATUS_LABEL[activity.planning_status]}
        </span>
      </div>

      {activity.planning_status === "changes_requested" &&
        activity.changes_requested_note && (
          <p className="text-sm text-red-700 bg-red-50 p-2.5 rounded-lg">
            {activity.changes_requested_note}
          </p>
        )}

      {(activity.planning_status === "submitted" ||
        activity.planning_status === "approved") && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {activity.pm_approved_by ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <Circle size={14} className="text-steel-300" />
            )}
            <span className="text-steel-600">
              PM{" "}
              {activity.pm_approved_by_name
                ? `— ${activity.pm_approved_by_name}`
                : "pending"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {activity.qs_approved_by ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <Circle size={14} className="text-steel-300" />
            )}
            <span className="text-steel-600">
              QS{" "}
              {activity.qs_approved_by_name
                ? `— ${activity.qs_approved_by_name}`
                : "pending"}
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Planner: submit */}
      {isPlanner &&
        (activity.planning_status === "in_progress" ||
          activity.planning_status === "changes_requested") && (
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-orange-500 text-white rounded-lg py-2 disabled:opacity-50"
          >
            <Send size={14} />
            {busy ? "Submitting..." : "Submit for Approval"}
          </button>
        )}

      {/* PM / QS: approve or request changes */}
      {activity.planning_status === "submitted" && (isPM || isQsUser) && (
        <div className="space-y-2 pt-1 border-t border-steel-100">
          {isPM && !activity.pm_approved_by && (
            <button
              onClick={() => handleApprove("pm")}
              disabled={busy}
              className="w-full text-sm font-medium bg-green-600 text-white rounded-lg py-2 disabled:opacity-50"
            >
              Approve as PM
            </button>
          )}
          {isQsUser && !activity.qs_approved_by && (
            <div className="space-y-1.5">
              <input
                type="number"
                placeholder="Confirmed budget (optional)"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full border border-steel-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => handleApprove("qs")}
                disabled={busy}
                className="w-full text-sm font-medium bg-green-600 text-white rounded-lg py-2 disabled:opacity-50"
              >
                Approve as QS
              </button>
            </div>
          )}

          {!showChangesForm ? (
            <button
              onClick={() => setShowChangesForm(true)}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg py-2 hover:bg-red-50"
            >
              <XCircle size={14} />
              Request Changes
            </button>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What needs to change?"
                className="w-full border border-steel-200 rounded-lg px-3 py-1.5 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRequestChanges}
                  disabled={busy || !note.trim()}
                  className="flex-1 text-xs font-medium bg-red-600 text-white rounded-lg py-1.5 disabled:opacity-50"
                >
                  Send
                </button>
                <button
                  onClick={() => setShowChangesForm(false)}
                  className="flex-1 text-xs font-medium border border-steel-200 rounded-lg py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
