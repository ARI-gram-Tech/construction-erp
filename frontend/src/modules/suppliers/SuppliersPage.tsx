// /src/modules/suppliers/SuppliersPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listSuppliers, deleteSupplier } from "@/services/suppliers";
import type { SupplierStatus, SupplierType } from "@/types/supplier";
import {
  Truck,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Ban,
  Users as UsersIcon,
  AlertCircle,
} from "lucide-react";

const SUPPLIER_TYPES: { value: SupplierType | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "materials", label: "Materials Supplier" },
  { value: "equipment", label: "Equipment Supplier" },
  { value: "services", label: "Services Provider" },
  { value: "other", label: "Other" },
];

const SUPPLIER_STATUSES: { value: SupplierStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blacklisted", label: "Blacklisted" },
];

function StatusBadge({ status }: { status: SupplierStatus }) {
  const styles: Record<SupplierStatus, string> = {
    active: "bg-green-50 text-green-700 border-green-200/50",
    inactive: "bg-steel-100 text-steel-600 border-steel-200/50",
    blacklisted: "bg-red-50 text-red-700 border-red-200/50",
  };
  const labels: Record<SupplierStatus, string> = {
    active: "Active",
    inactive: "Inactive",
    blacklisted: "Blacklisted",
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-steel-500">{label}</p>
          <p className="text-2xl font-semibold text-steel-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

const selectClass =
  "border border-steel-200 rounded-lg px-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-size-[20px] bg-position-[right_0.75rem_center] pr-10";

export function SuppliersPage() {
  const navigate = useNavigate();
  const {
    data: suppliers,
    loading,
    error,
    reload,
  } = useFetch(() => listSuppliers());

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SupplierType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | "all">(
    "all",
  );

  const stats = useMemo(() => {
    if (!suppliers) return null;
    return {
      active: suppliers.filter((s) => s.status === "active").length,
      inactive: suppliers.filter((s) => s.status === "inactive").length,
      blacklisted: suppliers.filter((s) => s.status === "blacklisted").length,
      noContacts: suppliers.filter((s) => s.contacts.length === 0).length,
    };
  }, [suppliers]);

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (typeFilter !== "all" && s.supplier_type !== typeFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.contact_person.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    });
  }, [suppliers, search, typeFilter, statusFilter]);

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm("Delete this supplier? This cannot be undone.")) return;
    await deleteSupplier(id);
    reload();
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <span className="text-steel-500 text-sm">Loading suppliers...</span>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );

  return (
    <>
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<CheckCircle2 size={20} />}
            label="Active"
            value={stats.active}
            color="bg-green-50 text-green-600"
          />
          <MetricCard
            icon={<UsersIcon size={20} />}
            label="Inactive"
            value={stats.inactive}
            color="bg-steel-100 text-steel-500"
          />
          <MetricCard
            icon={<Ban size={20} />}
            label="Blacklisted"
            value={stats.blacklisted}
            color="bg-red-50 text-red-600"
          />
          <MetricCard
            icon={<AlertCircle size={20} />}
            label="Missing Contacts"
            value={stats.noContacts}
            color="bg-amber-50 text-amber-600"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-steel-200/60 shadow-sm">
        <div className="relative flex-1 min-w-50">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers..."
            className="w-full border border-steel-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm bg-steel-50/50 hover:bg-white focus:bg-white transition-colors duration-200 placeholder:text-steel-400"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as SupplierType | "all")
            }
            className={selectClass}
          >
            {SUPPLIER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as SupplierStatus | "all")
            }
            className={selectClass}
          >
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/60 shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-steel-500 border-b border-steel-200/60 bg-steel-50/50">
                  <th className="px-4 py-3.5 font-medium">Code</th>
                  <th className="px-4 py-3.5 font-medium">Name</th>
                  <th className="px-4 py-3.5 font-medium">Category</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-4 py-3.5 font-medium hidden md:table-cell">
                    Contact
                  </th>
                  <th className="px-4 py-3.5 font-medium hidden lg:table-cell">
                    Location
                  </th>
                  <th className="px-4 py-3.5 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {filtered.map((supplier) => (
                  <tr
                    key={supplier.id}
                    onClick={() =>
                      navigate(`/company/suppliers/${supplier.id}`)
                    }
                    className="cursor-pointer hover:bg-orange-50/30 transition-colors duration-150 group"
                  >
                    <td className="px-4 py-3.5 text-steel-500 whitespace-nowrap font-mono text-xs">
                      {supplier.code}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-steel-900 group-hover:text-orange-600 transition-colors">
                      {supplier.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-steel-100 text-steel-600 capitalize border border-steel-200/50">
                        {supplier.supplier_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={supplier.status} />
                    </td>
                    <td className="px-4 py-3.5 text-steel-500 hidden md:table-cell">
                      {supplier.contact_person ||
                        supplier.email ||
                        supplier.phone ||
                        "—"}
                    </td>
                    <td className="px-4 py-3.5 text-steel-500 hidden lg:table-cell">
                      {[supplier.city, supplier.country]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => handleDelete(e, supplier.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-steel-400 hover:text-red-500 transition-colors duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-steel-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Truck size={28} className="text-steel-300" />
            </div>
            <p className="text-sm text-steel-500">
              {suppliers && suppliers.length > 0
                ? "No suppliers match your filters."
                : "No suppliers yet. Add your first supplier."}
            </p>
            {suppliers && suppliers.length === 0 && (
              <button
                onClick={() => navigate("/company/suppliers/new")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Plus size={16} />
                Create Supplier
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
