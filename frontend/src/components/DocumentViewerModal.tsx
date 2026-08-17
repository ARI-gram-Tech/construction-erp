// /src/components/DocumentViewerModal.tsx
import { X, Download } from "lucide-react";
import { DocumentViewer } from "./DocumentViewer";

interface DocumentViewerModalProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

// Usage from any page:
//   const [viewing, setViewing] = useState<{ url: string; name: string } | null>(null);
//   <button onClick={() => setViewing({ url: doc.latest_version.file, name: doc.name })}>View</button>
//   {viewing && (
//     <DocumentViewerModal fileUrl={viewing.url} fileName={viewing.name} onClose={() => setViewing(null)} />
//   )}
export function DocumentViewerModal({
  fileUrl,
  fileName,
  onClose,
}: DocumentViewerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-steel-200/50 shrink-0">
          <p className="text-sm font-medium text-steel-900 truncate">
            {fileName ?? "Document"}
          </p>
          <div className="flex items-center gap-1">
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-steel-100 text-steel-500"
              title="Download"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-steel-100 text-steel-500"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <DocumentViewer fileUrl={fileUrl} fileName={fileName} />
        </div>
      </div>
    </div>
  );
}
