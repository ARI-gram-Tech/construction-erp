import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { listMyCompanyUsers } from "@/services/users";
import {
  inviteEmployee,
  resendEmployeeCredentials,
} from "@/services/companies";
import { UserPlus, Mail, RotateCcw } from "lucide-react";

export function EmployeesPage() {
  const {
    data: employees,
    loading,
    error,
    reload,
  } = useFetch(() => listMyCompanyUsers());
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("employee");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendingId, setResendingId] = useState<number | null>(null);

  async function handleResend(userId: number, email: string) {
    if (
      !confirm(
        `Send a new temporary password to ${email}? Their previous temporary password will stop working.`,
      )
    ) {
      return;
    }
    setResendingId(userId);
    try {
      const result = await resendEmployeeCredentials(userId);
      setSuccessMsg(result.detail);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.detail || "Failed to resend credentials.",
      );
    } finally {
      setResendingId(null);
    }
  }

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setRole("employee");
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await inviteEmployee({
        email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        role,
      });
      setSuccessMsg(
        `Account created for ${email}. Login credentials have been emailed to them.`,
      );
      resetForm();
      setShowModal(false);
      reload();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.email?.[0] ||
          err?.response?.data?.first_name?.[0] ||
          err?.response?.data?.last_name?.[0] ||
          err?.response?.data?.detail ||
          "Failed to create employee account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <div className="text-steel-500">Loading employees...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-steel-900">Employees</h1>
          <p className="text-steel-500">Manage your company's team members</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <UserPlus size={16} />
          Add Employee
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {employees && employees.length > 0 ? (
          employees.map((member) => (
            <div
              key={member.id}
              className="p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-steel-900">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-xs text-steel-500">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-steel-100 text-steel-600 capitalize">
                  {member.role || "No role"}
                </span>
                <span
                  className={`text-xs ${member.is_active ? "text-green-600" : "text-red-600"}`}
                >
                  {member.is_active ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => handleResend(member.id, member.email)}
                  disabled={resendingId === member.id}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-steel-200 text-steel-500 hover:border-orange-300 hover:text-orange-600 transition-colors disabled:opacity-50"
                  title="Send a new temporary password"
                >
                  <RotateCcw size={12} />
                  {resendingId === member.id
                    ? "Sending..."
                    : "Resend Credentials"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Mail size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              No employees yet. Invite your first team member.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-steel-900 mb-1">
              Add Employee
            </h2>
            <p className="text-sm text-steel-500 mb-4">
              Their account is created immediately — login credentials (with a
              temporary password) are emailed to them, and they'll be required
              to set a new password on first login.
            </p>

            {formError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-3">
              <input
                type="email"
                placeholder="employee@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <input
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <input
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="employee">Employee</option>
                <option value="company_admin">Company Admin</option>
                <option value="director">Director</option>
                <option value="operations_manager">Operations Manager</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="accountant">Accountant</option>
                <option value="procurement_manager">Procurement Manager</option>
                <option value="main_store_manager">Main Store Manager</option>
                <option value="hr_manager">HR Manager</option>
                <option value="project_manager">Project Manager</option>
                <option value="site_manager">Site Manager</option>
                <option value="site_engineer">Site Engineer</option>
                <option value="foreman">Foreman</option>
                <option value="qs">Quantity Surveyor</option>
                <option value="storekeeper">Site Storekeeper</option>
                <option value="procurement">Procurement Officer</option>
                <option value="safety_officer">Safety Officer</option>
                <option value="qa_qc_engineer">QA/QC Engineer</option>
                <option value="plant_equipment_officer">
                  Plant & Equipment Officer
                </option>
                <option value="document_controller">Document Controller</option>
                <option value="management">Management</option>
                <option value="site_supervisor">Site Supervisor</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="client">Client</option>
              </select>
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
                  {submitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
