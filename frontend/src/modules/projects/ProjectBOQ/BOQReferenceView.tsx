// /src/modules/projects/ProjectBOQ/BOQReferenceView.tsx
import { Link } from "react-router-dom";
import { DocumentViewer } from "@/components/DocumentViewer";
import type { BOQ } from "@/types/boq";
import { ArrowLeft, Copy, FileStack } from "lucide-react";

interface BOQReferenceViewProps {
  boq: BOQ;
  pid: number;
  onDuplicate: () => void;
  busy: boolean;
}

export function BOQReferenceView({
  boq,
  pid,
  onDuplicate,
  busy,
}: BOQReferenceViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/projects/${pid}/boq`}
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-700 mb-2"
        >
          <ArrowLeft size={14} />
          Back to BOQs
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-steel-900">
              {boq.title}
            </h1>
            <p className="text-steel-500 text-sm flex items-center gap-1.5">
              <FileStack size={14} />
              Reference document — stored for viewing only, no cost tracking or
              line items.
            </p>
          </div>
          <button
            disabled={busy}
            onClick={onDuplicate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-steel-300 text-steel-700 hover:bg-steel-50 disabled:opacity-50"
          >
            <Copy size={14} />
            Duplicate
          </button>
        </div>
      </div>

      {boq.reference_document_url ? (
        <DocumentViewer
          fileUrl={boq.reference_document_url}
          fileName={boq.title}
        />
      ) : (
        <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center text-sm text-steel-500">
          No file is attached to this BOQ.
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        This BOQ won't feed Budget, Procurement, or Reports since it's
        reference-only. If you need cost tracking, either import this file
        properly (Excel/PDF → structured items) or build the items manually —
        either way, it'll need to be a separate BOQ from this one.
      </div>
    </div>
  );
}
