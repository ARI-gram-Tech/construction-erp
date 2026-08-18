// frontend/src/types/lpo.ts

export type LPOStatus =
  | "awaiting_signature"
  | "signed"
  | "sent"
  | "fulfilled"
  | "cancelled";

export type LPOOrigin = "generated" | "manual";
export type SignatureMode = "wet_ink" | "digital" | "";
export type DeliveryLocation = "site" | "main_warehouse" | "";

export interface LPOItem {
  id: number;
  description: string;
  quantity: number | string;
  unit: string;
  rate: number | string;
  amount: number | string;
}

export interface LPOItemInput {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
}

export interface LPO {
  id: number;
  code: string;
  origin: LPOOrigin;
  purchase_request: number | null;
  purchase_request_code: string | null;
  project: number;
  project_name: string;
  supplier: number;

  company_name: string;
  company_address: string;
  company_po_box: string;
  company_phone: string;
  company_email: string;

  supplier_name: string;
  supplier_address: string;
  supplier_email: string;
  supplier_phone: string;

  vat_applicable: boolean;
  vat_percent: number | string;
  subtotal: number | string;
  vat_amount: number | string;
  total: number | string;

  status: LPOStatus;
  signature_mode: SignatureMode;
  signed_document: string | null;
  signed_document_url: string | null;
  source_document: string | null;
  source_document_url: string | null;
  digitally_approved_by: number | null;
  digitally_approved_by_name: string | null;
  digitally_approved_at: string | null;

  delivery_location: DeliveryLocation;
  created_by: number | null;
  created_by_name: string | null;
  sent_at: string | null;

  items: LPOItem[];
  created_at: string;
}

export interface GenerateLPOPayload {
  purchase_request: number;
  supplier: number;
  vat_applicable?: boolean;
  vat_percent?: number;
}

export interface ManualLPOPayload {
  supplier: number;
  project: number;
  items: LPOItemInput[];
  vat_applicable?: boolean;
  vat_percent?: number;
  purchase_request?: number;
  source_document?: File | null;
  already_signed?: boolean;
}

export interface SupplierItem {
  id: number;
  supplier: number;
  description: string;
  times_ordered: number;
  last_ordered_at: string | null;
}
