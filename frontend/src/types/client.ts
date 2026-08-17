export interface Client {
  id: number;
  name: string;
  client_type:
    | "individual"
    | "private_company"
    | "government"
    | "ngo"
    | "other";
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ClientPayload {
  name: string;
  client_type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}
