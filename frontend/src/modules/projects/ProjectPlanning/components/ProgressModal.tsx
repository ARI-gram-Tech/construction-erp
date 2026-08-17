// frontend/src/modules/projects/ProjectPlanning/components/ProgressModal.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, TrendingUp, Calendar } from "lucide-react";
import { updateActivityProgress } from "@/services/planning";
import type { Activity } from "@/types/planning";

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  activity?: Activity;
  onSuccess: () => void;
}

export function ProgressModal({
  isOpen,
  onClose,
  projectId,
  activity,
  onSuccess,
}: ProgressModalProps) {
  const [percent, setPercent] = useState(activity?.percent_complete || 0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !activity) return null;

  // Captured here, after the guard above — TS now knows this is definitely
  // an Activity, and that stays true inside handleSubmit even though it's
  // an async closure that runs later (the guard alone doesn't survive that).
  const currentActivity = activity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateActivityProgress(projectId, currentActivity.id, {
        percent_complete: percent,
        notes,
        progress_date: new Date().toISOString().slice(0, 10),
      });
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-steel-200/60 animate-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-steel-900">
              Update Progress
            </h3>
            <p className="text-sm text-steel-500 mt-0.5">
              {currentActivity.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-steel-50 rounded-lg p-3 mb-4 flex items-center gap-3 text-sm">
          <Calendar size={16} className="text-steel-400" />
          <span className="text-steel-600">
            {new Date(currentActivity.planned_start).toLocaleDateString()} —{" "}
            {new Date(currentActivity.planned_end).toLocaleDateString()}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-steel-600 mb-2">
              <span>Percent Complete</span>
              <span className="font-semibold text-orange-600">{percent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-full h-2 bg-steel-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-steel-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1.5">
              Notes
            </label>
            <textarea
              placeholder="Add notes about progress, blockers, or next steps..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200 placeholder:text-steel-400 resize-y min-h-20"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-steel-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <TrendingUp size={16} />
                  Update Progress
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
