// frontend/src/modules/projects/ProjectPlanning/components/AddActivityModal.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import { createActivity } from "@/services/planning";
import { listMyCompanyUsers } from "@/services/users";
import { useFetch } from "@/hooks/useFetch";
import type { WBSNode } from "@/types/planning";

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  wbsNodes: WBSNode[];
  onSuccess: () => void;
}

export function AddActivityModal({
  isOpen,
  onClose,
  projectId,
  wbsNodes,
  onSuccess,
}: AddActivityModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [wbsId, setWbsId] = useState<number | "">("");
  const [responsibleId, setResponsibleId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { data: employees } = useFetch(() => listMyCompanyUsers());

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !plannedStart || !plannedEnd) {
      setFormError("Name, start date, and end date are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await createActivity(projectId, {
        name,
        code,
        planned_start: plannedStart,
        planned_end: plannedEnd,
        wbs: wbsId === "" ? null : wbsId,
        responsible: responsibleId === "" ? null : responsibleId,
      });
      onSuccess();
      onClose();
      setName("");
      setCode("");
      setPlannedStart("");
      setPlannedEnd("");
      setWbsId("");
      setResponsibleId("");
    } catch {
      setFormError("Failed to create activity. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-steel-200/60 animate-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-steel-900">
              Add Activity
            </h3>
            <p className="text-sm text-steel-500 mt-0.5">
              Define a new task in your project schedule
            </p>
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-steel-600 block mb-1.5">
                Code
              </label>
              <input
                placeholder="A1010"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-steel-600 block mb-1.5">
                Activity Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="e.g., Cast ground floor slab"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-steel-600 block mb-1.5">
                WBS Section
              </label>
              <select
                value={wbsId}
                onChange={(e) =>
                  setWbsId(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
              >
                <option value="">No WBS section</option>
                {wbsNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.code} — {node.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-steel-600 block mb-1.5">
                Responsible
              </label>
              <select
                value={responsibleId}
                onChange={(e) =>
                  setResponsibleId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
              >
                <option value="">Unassigned</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-steel-600 block mb-1.5">
                Planned Start <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-steel-600 block mb-1.5">
                Planned End <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-steel-100">
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
                  Adding...
                </>
              ) : (
                "Add Activity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
