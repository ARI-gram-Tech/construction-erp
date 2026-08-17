// frontend/src/modules/projects/ProjectPlanning/components/AssignPlannerControl.tsx
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { assignPlanner } from "@/services/planning";
import { listMyCompanyUsers } from "@/services/users";
import { useFetch } from "@/hooks/useFetch";
import type { Activity } from "@/types/planning";

interface AssignPlannerControlProps {
  projectId: number;
  activity: Activity;
  canAssign: boolean;
  onUpdate: () => void;
}

export function AssignPlannerControl({
  projectId,
  activity,
  canAssign,
  onUpdate,
}: AssignPlannerControlProps) {
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { data: employees } = useFetch(() => listMyCompanyUsers(), []);

  if (!canAssign) {
    return activity.assigned_planner_name ? (
      <div className="text-sm text-steel-600">
        <span className="text-steel-400">Assigned planner: </span>
        {activity.assigned_planner_name}
        {activity.assigned_planner_role && (
          <span className="text-steel-400">
            {" "}
            — {formatRoleLabel(activity.assigned_planner_role)}
          </span>
        )}
      </div>
    ) : null;
  }

  async function handleAssign() {
    if (!selectedId) return;
    setSubmitting(true);
    setError("");
    try {
      await assignPlanner(projectId, activity.id, Number(selectedId));
      setPicking(false);
      setSelectedId("");
      onUpdate();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Couldn't assign planner.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatRoleLabel(role: string) {
    return role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return (
    <div className="bg-steel-50/50 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-steel-500 uppercase tracking-wide">
            Assigned Planner
          </p>
          <p className="text-sm font-medium text-steel-900">
            {activity.assigned_planner_name ? (
              <>
                {activity.assigned_planner_name}
                {activity.assigned_planner_role && (
                  <span className="text-steel-400 font-normal">
                    {" "}
                    — {formatRoleLabel(activity.assigned_planner_role)}
                  </span>
                )}
              </>
            ) : (
              "Not assigned yet"
            )}
          </p>
        </div>
        {!picking && (
          <button
            onClick={() => setPicking(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 px-2.5 py-1.5 rounded-lg hover:bg-orange-50"
          >
            <UserPlus size={14} />
            {activity.assigned_planner_name ? "Reassign" : "Assign"}
          </button>
        )}
      </div>

      {picking && (
        <div className="mt-3 flex flex-col gap-2">
          <select
            value={selectedId}
            onChange={(e) =>
              setSelectedId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border border-steel-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Select a person...</option>
            {employees?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
                {emp.role ? ` — ${formatRoleLabel(emp.role)}` : ""}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAssign}
              disabled={!selectedId || submitting}
              className="flex-1 text-xs font-medium bg-orange-500 text-white rounded-lg py-1.5 disabled:opacity-50"
            >
              {submitting ? "Assigning..." : "Confirm"}
            </button>
            <button
              onClick={() => {
                setPicking(false);
                setError("");
              }}
              className="flex-1 text-xs font-medium border border-steel-200 rounded-lg py-1.5 text-steel-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
