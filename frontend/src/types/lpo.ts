// frontend/src/types/lpo.ts

export type LPOStatus =
  | "awaiting_signature"
  | "signed"
  | "sent"
  | "fulfilled"
  | "cancelled";

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

export interface LPO {
  id: number;
  code: string;
  purchase_request: number;
  purchase_request_code: string;
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
