import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { listClients, createClient, deleteClient } from "@/services/clients";
import type { ClientPayload } from "@/types/client";
import { Building2, Plus, Trash2 } from "lucide-react";

const CLIENT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "private_company", label: "Private Company" },
  { value: "government", label: "Government" },
  { value: "ngo", label: "NGO" },
  { value: "other", label: "Other" },
];

export function ClientsPage() {
  const {
    data: clients,
    loading,
    error,
    reload,
  } = useFetch(() => listClients());
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState<ClientPayload>({
    name: "",
    client_type: "private_company",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  });

  function updateField<K extends keyof ClientPayload>(
    key: K,
    value: ClientPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await createClient(form);
      setShowModal(false);
      setForm({
        name: "",
        client_type: "private_company",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
      });
      reload();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.name?.[0] || "Failed to create client.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    await deleteClient(id);
    reload();
  }

  if (loading) return <div className="text-steel-500">Loading clients...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-steel-900">Clients</h1>
          <p className="text-steel-500">
            Manage the clients you build projects for
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {clients && clients.length > 0 ? (
          clients.map((client) => (
            <div
              key={client.id}
              className="p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-steel-900">
                  {client.name}
                </p>
                <p className="text-xs text-steel-500">
                  {client.contact_person && `${client.contact_person} · `}
                  {client.email || client.phone || "No contact info"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-steel-100 text-steel-600 capitalize">
                  {client.client_type.replace("_", " ")}
                </span>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Building2 size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              No clients yet. Add your first client to get started.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-steel-900 mb-4">
              Add Client
            </h2>

            {formError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                placeholder="Client name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <select
                value={form.client_type}
                onChange={(e) => updateField("client_type", e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              >
                {CLIENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                placeholder="Contact person"
                value={form.contact_person}
                onChange={(e) => updateField("contact_person", e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-steel-300 text-steel-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
