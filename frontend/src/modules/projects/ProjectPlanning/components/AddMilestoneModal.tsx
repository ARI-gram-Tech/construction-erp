// frontend/src/modules/projects/ProjectPlanning/components/AddMilestoneModal.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { Flag, X, AlertCircle } from "lucide-react";
import { createMilestone } from "@/services/planning";

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  onSuccess: () => void;
}

export function AddMilestoneModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: AddMilestoneModalProps) {
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetDate) {
      setFormError("Name and target date are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await createMilestone(projectId, { name, target_date: targetDate });
      onSuccess();
      onClose();
      setName("");
      setTargetDate("");
    } catch {
      setFormError("Failed to create milestone. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-steel-200/60 animate-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Flag size={20} className="text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-steel-900">
              Add Milestone
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-steel-100 text-steel-400 hover:text-steel-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1.5">
              Milestone Name <span className="text-red-500">*</span>
            </label>
            <input
              placeholder="e.g. Foundation complete"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-steel-600 block mb-1.5">
              Target Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
              required
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
              className="px-5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 disabled:opacity-60 shadow-sm hover:shadow-md"
            >
              {submitting ? "Adding..." : "Add Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
