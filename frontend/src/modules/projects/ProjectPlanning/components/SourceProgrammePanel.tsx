// frontend/src/modules/projects/ProjectPlanning/components/SourceProgrammePanel.tsx
import { Link } from "react-router-dom";
import { FileClock, ExternalLink } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { listDocuments } from "@/services/documents";

interface SourceProgrammePanelProps {
  projectId: number;
}

export function SourceProgrammePanel({ projectId }: SourceProgrammePanelProps) {
  const { data: documents, loading } = useFetch(
    () => listDocuments({ project: projectId }),
    [projectId],
  );

  const programmeDocs = (documents ?? [])
    .filter((d) => d.category === "programme")
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

  const current = programmeDocs[0];

  if (loading) return null;

  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-steel-900 flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
          <FileClock size={16} />
        </div>
        Source Programme
      </h3>

      {!current ? (
        <div className="text-center py-3">
          <p className="text-xs text-steel-500 mb-2">
            No official programme document uploaded yet.
          </p>
          <Link
            to={`/projects/${projectId}/documents`}
            className="text-xs font-medium text-orange-600 hover:text-orange-700"
          >
            Upload one in Documents →
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-steel-900 truncate">
              {current.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
              v{current.latest_version?.version_number ?? 1}
            </span>
          </div>
          <p className="text-xs text-steel-400 mb-3">
            Uploaded {new Date(current.created_at).toLocaleDateString()}
            {current.uploaded_by_name ? ` by ${current.uploaded_by_name}` : ""}
          </p>
          <div className="flex items-center gap-3">
            {current.latest_version?.file && (
              <a
                href={current.latest_version.file}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
              >
                <ExternalLink size={12} />
                Open Document
              </a>
            )}
            <Link
              to={`/projects/${projectId}/documents`}
              className="text-xs font-medium text-steel-500 hover:text-steel-700"
            >
              View all revisions
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
