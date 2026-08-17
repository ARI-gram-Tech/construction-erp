// frontend/src/modules/projects/ProjectDocuments/ProjectDocumentsPage.tsx
import { useParams } from "react-router-dom";
import { DocumentsExplorer } from "@/modules/documents/DocumentsExplorer";

export function ProjectDocumentsPage() {
  const { projectId = "" } = useParams();
  return (
    <DocumentsExplorer
      projectId={Number(projectId)}
      title="Documents"
      description="Contracts, drawings, BQ, and reports for this project."
    />
  );
}
