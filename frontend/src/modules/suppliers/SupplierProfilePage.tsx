// /src/modules/suppliers/SupplierProfilePage.tsx

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  getSupplier,
  updateSupplier,
  createSupplierContact,
  updateSupplierContact,
  deleteSupplierContact,
} from "@/services/suppliers";
import type { SupplierStatus, SupplierContactPayload } from "@/types/supplier";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Star,
  Building2,
  Users,
  MapPin,
  CreditCard,
  FileText,
  Mail,
  Phone,
  Globe,
  User,
  Award,
} from "lucide-react";

type Tab = "overview" | "contacts";

const STATUS_STYLES: Record<SupplierStatus, string> = {
  active: "bg-green-50 text-green-700 border-green-200/50",
  inactive: "bg-steel-100 text-steel-600 border-steel-200/50",
  blacklisted: "bg-red-50 text-red-700 border-red-200/50",
};

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="group">
      <p className="text-xs text-steel-500 flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-steel-400" />}
        {label}
      </p>
      <p className="text-sm text-steel-900 mt-1 font-medium">
        {value || <span className="text-steel-400 font-normal">—</span>}
      </p>
    </div>
  );
}

function DetailCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-steel-100">
        {Icon && (
          <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
            <Icon size={16} />
          </div>
        )}
        <h2 className="text-sm font-semibold text-steel-900">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export function SupplierProfilePage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const id = Number(supplierId);
  const {
    data: supplier,
    loading,
    error,
    reload,
  } = useFetch(() => getSupplier(id), [id]);

  const [tab, setTab] = useState<Tab>("overview");
  const [statusSaving, setStatusSaving] = useState(false);

  // --- Contact form state ---
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const emptyContact: SupplierContactPayload = {
    supplier: id,
    name: "",
    position: "",
    phone: "",
    email: "",
    is_primary: false,
  };
  const [contactForm, setContactForm] =
    useState<SupplierContactPayload>(emptyContact);

  async function handleStatusChange(status: SupplierStatus) {
    if (!supplier) return;
    setStatusSaving(true);
    try {
      await updateSupplier(supplier.id, { status });
      reload();
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setContactSubmitting(true);
    try {
      await createSupplierContact(contactForm);
      setContactForm(emptyContact);
      setShowContactForm(false);
      reload();
    } finally {
      setContactSubmitting(false);
    }
  }

  async function handleDeleteContact(contactId: number) {
    if (!confirm("Remove this contact?")) return;
    await deleteSupplierContact(contactId);
    reload();
  }

  async function handleSetPrimary(contactId: number) {
    await updateSupplierContact(contactId, { is_primary: true });
    reload();
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <span className="text-steel-500 text-sm">Loading supplier...</span>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  if (!supplier) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 space-y-6">
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

        <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200/50 hidden sm:block">
                <Building2 size={32} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-mono text-steel-500 bg-steel-50 px-2.5 py-1 rounded inline-block">
                  {supplier.code}
                </p>
                <h1 className="text-2xl font-bold text-steel-900 mt-1.5">
                  {supplier.name}
                </h1>
                <p className="text-steel-500 text-sm capitalize flex items-center gap-2">
                  <span className="bg-steel-100 px-2.5 py-0.5 rounded-full text-xs">
                    {supplier.supplier_type.replace("_", " ")}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={supplier.status}
                disabled={statusSaving}
                onChange={(e) =>
                  handleStatusChange(e.target.value as SupplierStatus)
                }
                className={`text-xs px-3.5 py-2 rounded-full border font-medium ${STATUS_STYLES[supplier.status]} transition-all duration-200 cursor-pointer hover:shadow-sm`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
              {statusSaving && (
                <span className="text-xs text-steel-400 animate-pulse">
                  Updating...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-steel-200/60 flex gap-6 bg-white rounded-t-xl px-4 pt-2">
        {(["overview", "contacts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3.5 text-sm font-medium capitalize border-b-2 transition-all duration-200 ${
              tab === t
                ? "border-orange-500 text-steel-900"
                : "border-transparent text-steel-500 hover:text-steel-700 hover:border-steel-300"
            }`}
          >
            {t}
            {t === "contacts" && supplier.contacts.length > 0 && (
              <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                {supplier.contacts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Registration" icon={Award}>
            <InfoRow
              label="Registration No."
              value={supplier.registration_no}
            />
            <InfoRow label="Tax PIN" value={supplier.tax_pin} />
            <div className="col-span-2">
              <InfoRow label="Website" value={supplier.website} icon={Globe} />
            </div>
          </DetailCard>

          <DetailCard title="Primary Contact" icon={User}>
            <div className="col-span-2">
              <InfoRow label="Contact person" value={supplier.contact_person} />
            </div>
            <InfoRow label="Email" value={supplier.email} icon={Mail} />
            <InfoRow label="Phone" value={supplier.phone} icon={Phone} />
          </DetailCard>

          <DetailCard title="Address" icon={MapPin}>
            <InfoRow label="Country" value={supplier.country} />
            <InfoRow label="City" value={supplier.city} />
            <div className="col-span-2">
              <InfoRow
                label="Physical address"
                value={supplier.physical_address}
              />
            </div>
          </DetailCard>

          <DetailCard title="Financial" icon={CreditCard}>
            <InfoRow label="Currency" value={supplier.currency} />
            <InfoRow label="Payment terms" value={supplier.payment_terms} />
            <div className="col-span-2">
              <InfoRow
                label="Credit limit"
                value={
                  supplier.credit_limit != null
                    ? `${supplier.currency} ${Number(supplier.credit_limit).toLocaleString()}`
                    : null
                }
              />
            </div>
          </DetailCard>

          {supplier.notes && (
            <div className="md:col-span-2 bg-white rounded-xl border border-steel-200/60 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-steel-100">
                <div className="p-1.5 bg-orange-50 rounded-lg text-orange-500">
                  <FileText size={16} />
                </div>
                <h2 className="text-sm font-semibold text-steel-900">Notes</h2>
              </div>
              <p className="text-sm text-steel-700 whitespace-pre-wrap leading-relaxed">
                {supplier.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "contacts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowContactForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              Add Contact
            </button>
          </div>

          {showContactForm && (
            <form
              onSubmit={handleAddContact}
              className="bg-white rounded-xl border border-orange-200/50 shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-steel-100">
                <Users size={18} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-steel-900">
                  New Contact
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Full name *"
                  required
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200 placeholder:text-steel-400"
                />
                <input
                  placeholder="Position / Title"
                  value={contactForm.position}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, position: e.target.value }))
                  }
                  className="border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200 placeholder:text-steel-400"
                />
                <input
                  placeholder="Phone"
                  value={contactForm.phone}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200 placeholder:text-steel-400"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200 placeholder:text-steel-400"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-steel-100">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-steel-200 text-steel-700 hover:bg-steel-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="px-5 py-2 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  {contactSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Contact"
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm divide-y divide-steel-100">
            {supplier.contacts.length > 0 ? (
              supplier.contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-steel-50/50 transition-colors duration-150"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${c.is_primary ? "bg-orange-50 border border-orange-200/50" : "bg-steel-50"}`}
                    >
                      <Users
                        size={18}
                        className={
                          c.is_primary ? "text-orange-500" : "text-steel-400"
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-steel-900 flex items-center gap-2">
                        {c.name}
                        {c.is_primary && (
                          <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200/50">
                            <Star
                              size={12}
                              className="fill-orange-400 text-orange-400"
                            />
                            Primary
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-steel-500">
                        {[c.position, c.phone, c.email]
                          .filter(Boolean)
                          .join(" · ") || "No details"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-11 sm:ml-0">
                    {!c.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(c.id)}
                        className="text-xs text-steel-500 hover:text-orange-600 transition-colors duration-200 px-2.5 py-1 rounded hover:bg-orange-50"
                      >
                        Set primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-steel-400 hover:text-red-500 transition-colors duration-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-steel-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users size={28} className="text-steel-300" />
                </div>
                <p className="text-sm text-steel-500">
                  No contacts yet. Add the people you deal with at this
                  supplier.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
