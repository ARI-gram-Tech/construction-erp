// /src/modules/projects/ProjectBOQ/BOQListPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listBOQs } from "@/services/boq";
import { BOQ_STATUS_LABELS, type BOQStatus } from "@/types/boq";
import { FileSpreadsheet, Plus } from "lucide-react";

const STATUS_STYLES: Record<BOQStatus, string> = {
  draft: "bg-steel-100 text-steel-600",
  active: "bg-green-50 text-green-700",
  superseded: "bg-steel-100 text-steel-500",
};

function StatusBadge({ status }: { status: BOQStatus }) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}
    >
      {BOQ_STATUS_LABELS[status]}
    </span>
  );
}

export function BOQListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();

  const { data: boqs, loading, error } = useFetch(() => listBOQs(id), [id]);

  if (loading) return <div className="text-steel-500">Loading BOQs...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-steel-900">
            Bills of Quantities
          </h1>
          <p className="text-steel-500">BOQ / QS workspace for this project</p>
        </div>
        <button
          onClick={() => navigate(`/projects/${id}/boq/new`)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          New BOQ
        </button>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {boqs && boqs.length > 0 ? (
          boqs.map((boq) => (
            <div
              key={boq.id}
              onClick={() => navigate(`/projects/${id}/boq/${boq.id}`)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-steel-50/60 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-steel-900">
                  {boq.title}
                </p>
                <p className="text-xs text-steel-500">
                  {boq.item_count} item{boq.item_count === 1 ? "" : "s"} ·{" "}
                  {boq.currency} {Number(boq.total_amount).toLocaleString()}
                  {boq.created_by_name && ` · by ${boq.created_by_name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-steel-500">
                  {boq.health_label}
                </span>
                <StatusBadge status={boq.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <FileSpreadsheet
              size={24}
              className="text-steel-300 mx-auto mb-2"
            />
            <p className="text-sm text-steel-500">
              No BOQs yet for this project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
