// frontend/src/modules/company/CompanyDocumentsPage.tsx
import { DocumentsExplorer } from "@/modules/documents/DocumentsExplorer";

export function CompanyDocumentsPage() {
  return (
    <DocumentsExplorer
      companyOnly
      title="Company documents"
      description="Legal documents, policies, templates — not tied to any one project."
    />
  );
}
