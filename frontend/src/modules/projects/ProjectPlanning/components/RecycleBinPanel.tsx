// /modules/projects/ProjectPlanning/components/RecycleBinPanel.tsx
import { useEffect, useState } from "react";
import { Trash2, RotateCcw, FolderTree, CalendarRange } from "lucide-react";
import {
  listActivityBin,
  listWBSBin,
  restoreActivity,
  restoreWBSNode,
} from "@/services/planning";
import type { Activity, WBSNode } from "@/types/planning";

interface RecycleBinPanelProps {
  projectId: number;
  onChange: () => void; // refresh the live plan after a restore
}

export function RecycleBinPanel({ projectId, onChange }: RecycleBinPanelProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wbsNodes, setWbsNodes] = useState<WBSNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [a, w] = await Promise.all([
        listActivityBin(projectId),
        listWBSBin(projectId),
      ]);
      setActivities(a);
      setWbsNodes(w);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Couldn't load the recycle bin. You may not have permission to view it.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleRestoreActivity(id: number) {
    setRestoringId(`activity-${id}`);
    try {
      await restoreActivity(projectId, id);
      await load();
      onChange();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Couldn't restore this activity.");
    } finally {
      setRestoringId(null);
    }
  }

  async function handleRestoreWBS(id: number) {
    setRestoringId(`wbs-${id}`);
    try {
      await restoreWBSNode(projectId, id);
      await load();
      onChange();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Couldn't restore this section.");
    } finally {
      setRestoringId(null);
    }
  }

  const isEmpty = activities.length === 0 && wbsNodes.length === 0;

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-steel-100">
        <h3 className="text-sm font-semibold text-steel-900 flex items-center gap-2">
          <div className="p-1.5 bg-steel-100 rounded-lg text-steel-500">
            <Trash2 size={16} />
          </div>
          Recycle Bin
        </h3>
        <p className="text-xs text-steel-500 mt-1">
          Deleted WBS sections and activities land here first — nothing is gone
          for good until the bin is emptied. Restore anything below back into
          the live plan.
        </p>
      </div>

      <div className="p-2">
        {loading ? (
          <p className="text-sm text-steel-400 p-4">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-500 p-4">{error}</p>
        ) : isEmpty ? (
          <div className="py-8 text-center">
            <Trash2 size={28} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">The bin is empty.</p>
          </div>
        ) : (
          <div className="divide-y divide-steel-100">
            {wbsNodes.map((node) => (
              <div
                key={`wbs-${node.id}`}
                className="flex items-center gap-3 p-3"
              >
                <FolderTree size={16} className="text-steel-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-steel-900 truncate">
                    {node.code} {node.name}
                    <span className="ml-2 text-xs font-normal text-steel-400">
                      WBS Section
                    </span>
                  </p>
                  <p className="text-xs text-steel-500">
                    Deleted{" "}
                    {node.deleted_at
                      ? new Date(node.deleted_at).toLocaleString()
                      : ""}
                    {node.deleted_by_name ? ` by ${node.deleted_by_name}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleRestoreWBS(node.id)}
                  disabled={restoringId === `wbs-${node.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-steel-200 text-steel-600 hover:border-orange-300 hover:text-orange-600 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  {restoringId === `wbs-${node.id}`
                    ? "Restoring..."
                    : "Restore"}
                </button>
              </div>
            ))}

            {activities.map((activity) => (
              <div
                key={`activity-${activity.id}`}
                className="flex items-center gap-3 p-3"
              >
                <CalendarRange size={16} className="text-steel-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-steel-900 truncate">
                    {activity.name}
                    <span className="ml-2 text-xs font-normal text-steel-400">
                      Activity
                    </span>
                  </p>
                  <p className="text-xs text-steel-500">
                    Deleted{" "}
                    {activity.deleted_at
                      ? new Date(activity.deleted_at).toLocaleString()
                      : ""}
                    {activity.deleted_by_name
                      ? ` by ${activity.deleted_by_name}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleRestoreActivity(activity.id)}
                  disabled={restoringId === `activity-${activity.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-steel-200 text-steel-600 hover:border-orange-300 hover:text-orange-600 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  {restoringId === `activity-${activity.id}`
                    ? "Restoring..."
                    : "Restore"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
