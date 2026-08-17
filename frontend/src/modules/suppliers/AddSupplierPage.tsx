// /src/modules/suppliers/AddSupplierPage.tsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createSupplier } from "@/services/suppliers";
import type { SupplierPayload, SupplierType } from "@/types/supplier";
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  CreditCard,
  FileText,
} from "lucide-react";

const SUPPLIER_TYPES: { value: SupplierType; label: string }[] = [
  { value: "materials", label: "Materials Supplier" },
  { value: "equipment", label: "Equipment Supplier" },
  { value: "services", label: "Services Provider" },
  { value: "other", label: "Other" },
];

const emptyForm: SupplierPayload = {
  name: "",
  supplier_type: "materials",
  registration_no: "",
  tax_pin: "",
  website: "",
  contact_person: "",
  email: "",
  phone: "",
  country: "Kenya",
  city: "",
  physical_address: "",
  currency: "KES",
  payment_terms: "",
  credit_limit: null,
  notes: "",
};

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-steel-600 mb-1.5">
        {label}
        {required && <span className="text-orange-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm transition-all duration-200 bg-steel-50/50 hover:bg-white focus:bg-white";

const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-size-[20px] bg-position-[right_0.75rem_center] pr-10`;

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 space-y-5">
      <div className="flex items-center gap-2.5 border-b border-steel-100 pb-3.5">
        {Icon && (
          <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
            <Icon size={18} />
          </div>
        )}
        <h2 className="text-sm font-semibold text-steel-900">{title}</h2>
        <span className="ml-auto text-xs text-steel-400">
          Required fields marked *
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export function AddSupplierPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SupplierPayload>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function updateField<K extends keyof SupplierPayload>(
    key: K,
    value: SupplierPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const supplier = await createSupplier(form);
      navigate(`/company/suppliers/${supplier.id}`);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.name?.[0] || "Failed to create supplier.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 sm:px-0 pb-12">
      <div className="animate-in fade-in slide-in-from-top-2">
        <Link
          to="/company/suppliers"
          className="inline-flex items-center gap-1.5 text-sm text-steel-500 hover:text-orange-600 transition-colors duration-200 mb-3 group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Back to Suppliers
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-steel-900">New Supplier</h1>
            <p className="text-steel-500 mt-1 text-sm">
              Create a vendor master record. You can add contacts and documents
              once it's saved.
            </p>
          </div>
          <div className="hidden sm:block p-2.5 bg-orange-50 rounded-xl border border-orange-200/50">
            <Building2 size={28} className="text-orange-500" />
          </div>
        </div>
      </div>

      {formError && (
        <div className="animate-in fade-in slide-in-from-top-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-lg flex items-start gap-3">
          <div className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="Basic Information" icon={Building2}>
          <Field label="Supplier name" required>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={inputClass}
              placeholder="Enter supplier name..."
              required
            />
          </Field>
          <Field label="Category">
            <select
              value={form.supplier_type}
              onChange={(e) =>
                updateField("supplier_type", e.target.value as SupplierType)
              }
              className={selectClass}
            >
              {SUPPLIER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Registration number">
            <input
              value={form.registration_no}
              onChange={(e) => updateField("registration_no", e.target.value)}
              className={inputClass}
              placeholder="CR12 / company reg. no."
            />
          </Field>
          <Field label="Tax PIN">
            <input
              value={form.tax_pin}
              onChange={(e) => updateField("tax_pin", e.target.value)}
              className={inputClass}
              placeholder="KRA PIN or equivalent"
            />
          </Field>
          <Field label="Website">
            <input
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              className={inputClass}
              placeholder="https://example.com"
            />
          </Field>
        </Section>

        <Section title="Contact Information" icon={Users}>
          <Field label="Primary contact person">
            <input
              value={form.contact_person}
              onChange={(e) => updateField("contact_person", e.target.value)}
              className={inputClass}
              placeholder="Full name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClass}
              placeholder="contact@supplier.com"
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={inputClass}
              placeholder="+254 700 123 456"
            />
          </Field>
        </Section>

        <Section title="Address" icon={MapPin}>
          <Field label="Country">
            <input
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              className={inputClass}
              placeholder="Country"
            />
          </Field>
          <Field label="City">
            <input
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              className={inputClass}
              placeholder="City"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Physical address">
              <input
                value={form.physical_address}
                onChange={(e) =>
                  updateField("physical_address", e.target.value)
                }
                className={inputClass}
                placeholder="Street address, building, floor"
              />
            </Field>
          </div>
        </Section>

        <Section title="Financial & Terms" icon={CreditCard}>
          <Field label="Currency">
            <input
              value={form.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              className={inputClass}
              placeholder="KES, USD, etc."
            />
          </Field>
          <Field label="Payment terms">
            <input
              value={form.payment_terms}
              onChange={(e) => updateField("payment_terms", e.target.value)}
              className={inputClass}
              placeholder="e.g. Net 30"
            />
          </Field>
          <Field label="Credit limit">
            <input
              type="number"
              value={form.credit_limit ?? ""}
              onChange={(e) =>
                updateField(
                  "credit_limit",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className={inputClass}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </Field>
        </Section>

        <Section title="Additional Notes" icon={FileText}>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className={`${inputClass} resize-y min-h-20`}
                rows={3}
                placeholder="Any additional information about the supplier..."
              />
            </Field>
          </div>
        </Section>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-steel-200/60">
          <button
            type="button"
            onClick={() => navigate("/company/suppliers")}
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2 min-w-35"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              "Save Supplier"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
