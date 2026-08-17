import { useState } from "react";
import { createCompanyAdmin } from "@/services/companies";
import type { Company } from "@/types/company";

interface Props {
  company: Company;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateCompanyAdminModal({
  company,
  onClose,
  onCreated,
}: Props) {
  const [email, setEmail] = useState(company.email ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createCompanyAdmin(company.id, {
        email,
        first_name: firstName,
        last_name: lastName,
        username,
        password,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.email?.[0] ||
          err?.response?.data?.detail ||
          "Failed to create Company Admin.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-steel-900 mb-1">
          Create Company Admin
        </h2>
        <p className="text-sm text-steel-500 mb-4">
          For {company.name}. This creates the account immediately — no invite
          email is sent.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              required
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full border rounded px-3 py-2 text-sm"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded border border-steel-300 text-steel-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm rounded bg-orange-500 text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
