// frontend/src/modules/users/UsersManagement.tsx
import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import {
  listUsers,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  listRoleChoices,
  createUser,
} from "@/services/users";
import { listCompanies } from "@/services/companies";
import type { PlatformUser } from "@/types/user";

export function UsersManagement() {
  const { data: users, loading, error, reload } = useFetch(() => listUsers());
  const { data: companies } = useFetch(() => listCompanies());
  const { data: roles } = useFetch(() => listRoleChoices());
  const [busyId, setBusyId] = useState<number | null>(null);

  // --- Create User modal state ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    password: "",
    role: "",
    company: "" as number | "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await createUser({
        ...createForm,
        company: createForm.company === "" ? null : Number(createForm.company),
      });
      setShowCreateModal(false);
      setCreateForm({
        email: "",
        username: "",
        first_name: "",
        last_name: "",
        password: "",
        role: "",
        company: "",
      });
      await reload();
    } catch (err: any) {
      setCreateError(
        err?.response?.data?.email?.[0] ||
          err?.response?.data?.password?.[0] ||
          err?.response?.data?.detail ||
          "Failed to create user.",
      );
    } finally {
      setCreating(false);
    }
  }

  function companyName(id: number | null) {
    if (!id) return "Platform (Super Admin)";
    return companies?.find((c) => c.id === id)?.name ?? `Company #${id}`;
  }

  async function handleToggleActive(user: PlatformUser) {
    setBusyId(user.id);
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
      } else {
        await activateUser(user.id);
      }
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(user: PlatformUser, role: string) {
    setBusyId(user.id);
    try {
      await updateUser(user.id, { role });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(user: PlatformUser) {
    if (!confirm(`Permanently delete ${user.email}? This cannot be undone.`))
      return;
    setBusyId(user.id);
    try {
      await deleteUser(user.id);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  if (loading)
    return <div className="p-8 text-steel-500">Loading users...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Platform Users</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          + Create User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {users?.map((user) => (
          <div
            key={user.id}
            className="p-4 flex items-center justify-between gap-4"
          >
            <div className="flex-1">
              <p className="font-medium">
                {user.first_name} {user.last_name}{" "}
                {user.is_superuser && (
                  <span className="text-xs bg-navy-900 text-white px-2 py-0.5 rounded ml-1">
                    Super Admin
                  </span>
                )}
              </p>
              <p className="text-sm text-steel-500">
                {user.email} · {companyName(user.company)} ·{" "}
                <span
                  className={user.is_active ? "text-green-600" : "text-red-600"}
                >
                  {user.is_active ? "Active" : "Deactivated"}
                </span>
              </p>
            </div>

            {!user.is_superuser && (
              <>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user, e.target.value)}
                  disabled={busyId === user.id}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">No role</option>
                  {roles?.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleToggleActive(user)}
                  disabled={busyId === user.id}
                  className={`px-3 py-1.5 text-sm rounded text-white ${
                    user.is_active ? "bg-amber-600" : "bg-green-600"
                  }`}
                >
                  {user.is_active ? "Deactivate" : "Activate"}
                </button>

                <button
                  onClick={() => handleDelete(user)}
                  disabled={busyId === user.id}
                  className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create User</h3>
            {createError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                placeholder="Email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
              <input
                placeholder="Username"
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, username: e.target.value }))
                }
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="First name"
                  value={createForm.first_name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  className="border rounded px-3 py-2 text-sm"
                />
                <input
                  placeholder="Last name"
                  value={createForm.last_name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  className="border rounded px-3 py-2 text-sm"
                />
              </div>
              <input
                placeholder="Password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
                className="w-full border rounded px-3 py-2 text-sm"
                required
                minLength={8}
              />
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value }))
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">No role</option>
                {roles?.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <select
                value={createForm.company}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    company: e.target.value ? Number(e.target.value) : "",
                  }))
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Platform (Super Admin) — no company</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-steel-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
