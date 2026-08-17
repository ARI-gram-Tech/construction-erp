// frontend/src/types/document.ts
export interface DocumentVersion {
  id: number;
  file: string;
  version_number: number;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface AppDocument {
  id: number;
  company: number;
  project: number | null;
  category: string;
  name: string;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  latest_version: DocumentVersion | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "drawing", label: "Drawing" },
  { value: "boq", label: "BOQ" },
  { value: "programme", label: "Programme" },
  { value: "report", label: "Report" },
  { value: "legal", label: "Legal" },
  { value: "policy", label: "Policy" },
  { value: "template", label: "Template" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
] as const;
