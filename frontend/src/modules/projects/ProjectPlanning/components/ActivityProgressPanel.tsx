// /modules/projects/ProjectPlanning/components/ActivityProgressPanel.tsx
import { useEffect, useState } from "react";
import { Clock, Loader2, Send } from "lucide-react";
import {
  listActivityProgress,
  updateActivityProgress,
} from "@/services/planning";
import type { Activity, ProgressUpdate } from "@/types/planning";

interface ActivityProgressPanelProps {
  projectId: number;
  activity: Activity;
  onChange: () => void; // refetch parent activity list after a new log entry
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ActivityProgressPanel({
  projectId,
  activity,
  onChange,
}: ActivityProgressPanelProps) {
  const [history, setHistory] = useState<ProgressUpdate[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [percent, setPercent] = useState(activity.percent_complete);
  const [progressDate, setProgressDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await listActivityProgress(projectId, activity.id);
      setHistory(data);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await updateActivityProgress(projectId, activity.id, {
        percent_complete: percent,
        progress_date: progressDate,
        notes,
      });
      setNotes("");
      await loadHistory();
      onChange();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ?? "Couldn't save progress. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-steel-100">
        <h4 className="text-sm font-semibold text-steel-900">
          Log Progress — {activity.name}
        </h4>
        <p className="text-xs text-steel-500 mt-0.5">
          Report what was actually done on site. This updates the activity's
          live status and keeps a dated history below.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 space-y-3 border-b border-steel-100"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={progressDate}
              onChange={(e) => setProgressDate(e.target.value)}
              max={todayISO()}
              className="w-full border border-steel-200 rounded-lg px-3 py-2 text-sm bg-steel-50/50 focus:bg-white transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1.5">
              % Complete
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-full border border-steel-200 rounded-lg px-3 py-2 text-sm bg-steel-50/50 focus:bg-white transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-steel-600 block mb-1.5">
            Notes (delays, blockers, weather, etc.)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Rain stopped work at 2pm, resumed excavation tomorrow"
            className="w-full border border-steel-200 rounded-lg px-3 py-2 text-sm bg-steel-50/50 focus:bg-white transition-colors resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Save Progress
          </button>
        </div>
      </form>

      <div className="p-4">
        <h5 className="text-xs font-semibold text-steel-600 uppercase tracking-wide mb-3">
          History
        </h5>
        {loadingHistory ? (
          <p className="text-xs text-steel-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-steel-400">No progress logged yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-start gap-3 text-sm py-2 border-b border-steel-50 last:border-0"
              >
                <Clock size={14} className="text-steel-300 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-steel-800">
                      {h.percent_complete}%
                    </span>
                    <span className="text-xs text-steel-400">
                      {h.progress_date}
                    </span>
                    {h.updated_by_name && (
                      <span className="text-xs text-steel-400">
                        · {h.updated_by_name}
                      </span>
                    )}
                  </div>
                  {h.notes && (
                    <p className="text-xs text-steel-500 mt-0.5">{h.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
