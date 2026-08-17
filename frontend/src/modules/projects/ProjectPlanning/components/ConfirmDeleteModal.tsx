// /modules/projects/ProjectPlanning/components/ConfirmDeleteModal.tsx
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  consequences?: string[]; // e.g. ["3 material requirements", "12 progress updates"]
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  itemName,
  consequences,
  onCancel,
  onConfirm,
  confirming,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-100">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-2 border-red-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-xl shrink-0">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-steel-900">{title}</h3>
            <p className="text-sm text-steel-600 mt-1">
              You're about to delete{" "}
              <span className="font-medium text-steel-900">"{itemName}"</span>.
            </p>
          </div>
        </div>

        {consequences && consequences.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-red-700 mb-1.5">
              This will also carry into the bin:
            </p>
            <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
              {consequences.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-steel-50 rounded-lg p-3 mb-5 text-xs text-steel-500">
          This moves it to the project's recycle bin rather than destroying it
          immediately — it can be restored by a Project Manager or company
          admin. It is not permanently deleted until the bin is later emptied.
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
          >
            <Trash2 size={14} />
            {confirming ? "Deleting..." : "Yes, delete it"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
