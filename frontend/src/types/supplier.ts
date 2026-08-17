// /src/types/supplier.ts

export type SupplierType = "materials" | "equipment" | "services" | "other";
export type SupplierStatus = "active" | "inactive" | "blacklisted";

export interface SupplierContact {
  id: number;
  supplier: number;
  name: string;
  position: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

export interface SupplierContactPayload {
  supplier: number;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  supplier_type: SupplierType;
  status: SupplierStatus;
  registration_no: string;
  tax_pin: string;
  website: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  physical_address: string;
  currency: string;
  payment_terms: string;
  credit_limit: number | null;
  notes: string;
  contacts: SupplierContact[];
  created_at: string;
  updated_at: string;
}

export interface SupplierPayload {
  name: string;
  supplier_type: SupplierType;
  status?: SupplierStatus;
  registration_no?: string;
  tax_pin?: string;
  website?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  country?: string;
  city?: string;
  physical_address?: string;
  currency?: string;
  payment_terms?: string;
  credit_limit?: number | null;
  notes?: string;
}
