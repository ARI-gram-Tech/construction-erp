// frontend/src/modules/documents/DocumentsExplorer.tsx
// Shared by both Company Documents and Project Documents pages —
// same upload/list UI, only the query scope differs.
import { useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Upload, Download, File as FileIcon } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { listDocuments, uploadDocument } from "@/services/documents";
import { DOCUMENT_CATEGORIES } from "@/types/document";

interface DocumentsExplorerProps {
  projectId?: number;
  companyOnly?: boolean;
  title?: string;
  description?: string;
}

export function DocumentsExplorer({
  projectId,
  companyOnly,
  title = "Documents",
  description,
}: DocumentsExplorerProps) {
  const {
    data: documents,
    loading,
    error,
    reload,
  } = useFetch(
    () => listDocuments(projectId ? { project: projectId } : { companyOnly }),
    [projectId, companyOnly],
  );

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setFormError("Choose a file to upload.");
      return;
    }
    if (!name.trim()) {
      setFormError("Give the document a name.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await uploadDocument({ name, category, project: projectId, file });
      setShowModal(false);
      setName("");
      setCategory("other");
      setFile(null);
      reload();
    } catch {
      setFormError("Could not upload the document.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <div className="text-steel-500">Loading documents...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-steel-900">{title}</h2>
          {description && (
            <p className="text-sm text-steel-500">{description}</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <Upload size={16} />
          Upload document
        </button>
      </div>

      {documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-steel-200/50 p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={18} className="text-primary-500 shrink-0" />
                  <p className="font-medium text-steel-900 truncate">
                    {doc.name}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-steel-100 text-steel-600 capitalize shrink-0">
                  {doc.category}
                </span>
              </div>
              <p className="text-xs text-steel-500">
                {doc.uploaded_by_name ?? "Unknown"} · v
                {doc.latest_version?.version_number ?? 1}
              </p>
              {doc.latest_version?.file && (
                <a
                  href={doc.latest_version.file}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:underline mt-1"
                >
                  <Download size={14} />
                  Download latest
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-xl border border-steel-200/50">
          <FileIcon size={24} className="text-steel-300 mx-auto mb-2" />
          <p className="text-sm text-steel-500">
            No documents yet. Upload the first one.
          </p>
        </div>
      )}

      {showModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-steel-200/50">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-steel-900">
                  Upload document
                </h2>
              </div>
              {formError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                  {formError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  placeholder="Document name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                >
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                  >
                    {submitting ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
