// /src/components/DocumentViewer.tsx
import { FileText, Download } from "lucide-react";

interface DocumentViewerProps {
  fileUrl: string;
  fileName?: string;
  className?: string;
}

// Renders a file inline where the browser can do it natively (PDF via
// iframe, images via img) so it feels like viewing inside the app
// rather than triggering a download. Falls back to a clear "can't
// preview this, here's a download link" for anything else (docx,
// etc.) rather than showing a broken/blank frame.
export function DocumentViewer({
  fileUrl,
  fileName,
  className = "",
}: DocumentViewerProps) {
  const ext = fileUrl.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  const isPdf = ext === "pdf";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);

  if (isPdf) {
    return (
      <iframe
        src={fileUrl}
        title={fileName ?? "document"}
        className={`w-full h-full min-h-[70vh] rounded-lg border border-steel-200 bg-white ${className}`}
      />
    );
  }

  if (isImage) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-steel-50 rounded-lg border border-steel-200 p-4 ${className}`}
      >
        <img
          src={fileUrl}
          alt={fileName ?? "document"}
          className="max-w-full max-h-[75vh] object-contain rounded"
        />
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full min-h-[40vh] flex flex-col items-center justify-center gap-3 text-steel-500 bg-steel-50 rounded-lg border border-steel-200 ${className}`}
    >
      <FileText size={32} className="text-steel-300" />
      <p className="text-sm">
        Preview isn't available for this file type
        {ext && ` (.${ext})`}.
      </p>
      <a
        href={fileUrl}
        download={fileName}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
      >
        <Download size={14} />
        Download instead
      </a>
    </div>
  );
}
