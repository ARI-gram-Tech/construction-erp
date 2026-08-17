// frontend/src/modules/projects/ProjectTeam/ProjectTeamPage.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import {
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "@/services/team";
import { listMyCompanyUsers } from "@/services/users";
import { getProject, setProjectManager } from "@/services/projects";
import { Users, Plus, Trash2, Star } from "lucide-react";

export function ProjectTeamPage() {
  const { projectId = "" } = useParams();
  const id = Number(projectId);

  const {
    data: members,
    loading,
    error,
    reload,
  } = useFetch(() => listProjectMembers(id), [id]);
  const { data: employees } = useFetch(() => listMyCompanyUsers());
  const { data: project, reload: reloadProject } = useFetch(
    () => getProject(id),
    [id],
  );
  const [settingPmId, setSettingPmId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number>(0);
  const [customLabel, setCustomLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Don't show people already on the project in the "add" dropdown
  const availableEmployees = employees?.filter(
    (e) => !members?.some((m) => m.user === e.id),
  );

  function roleLabel(role: string) {
    return role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Only these two account roles are generic enough that a project-specific
  // label actually adds information (e.g. "Structural Steel Sub" for a
  // subcontractor, or a client's org name). Every real system role
  // (QS, PM, Site Manager, Foreman, etc.) already says what it is —
  // no need to make anyone retype it.
  const NEEDS_CUSTOM_LABEL = new Set(["subcontractor", "client"]);

  const selectedEmployee = availableEmployees?.find(
    (e) => e.id === selectedUser,
  );
  const needsCustomLabel =
    !!selectedEmployee && NEEDS_CUSTOM_LABEL.has(selectedEmployee.role);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setFormError("Select a person to add to the project.");
      return;
    }
    if (needsCustomLabel && !customLabel.trim()) {
      setFormError(
        `Enter a project-specific label for this ${roleLabel(selectedEmployee!.role)}.`,
      );
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await addProjectMember(id, {
        user: selectedUser,
        // Real system roles (QS, PM, Site Manager, etc.) use the account's
        // actual role as the label — no retyping something that already
        // exists. Only subcontractor/client get a free-text label, since
        // those account roles alone don't say what they're actually doing
        // on THIS project.
        role_on_project: needsCustomLabel
          ? customLabel.trim()
          : roleLabel(selectedEmployee!.role),
      });
      setShowModal(false);
      setSelectedUser(0);
      setCustomLabel("");
      reload();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.detail ||
          err?.response?.data?.non_field_errors?.[0] ||
          "Failed to add team member.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(memberId: number) {
    if (!confirm("Remove this person from the project?")) return;
    await removeProjectMember(id, memberId);
    reload();
  }

  async function handleMakePM(userId: number) {
    setSettingPmId(userId);
    try {
      await setProjectManager(id, userId);
      await reloadProject();
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          "Couldn't set this person as Project Manager.",
      );
    } finally {
      setSettingPmId(null);
    }
  }

  if (loading) return <div className="text-steel-500">Loading team...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-steel-900">Team</h2>
          <p className="text-sm text-steel-500">
            Everyone assigned to this project, and their role on it.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      <div className="bg-white rounded-xl border border-steel-200/50 divide-y">
        {members && members.length > 0 ? (
          members.map((member) => (
            <div
              key={member.id}
              className="p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-steel-900">
                  {member.user_name || member.user_email}
                </p>
                <p className="text-xs text-steel-500">{member.user_email}</p>
              </div>
              <div className="flex items-center gap-3">
                {project?.project_manager === member.user ? (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-medium flex items-center gap-1">
                    <Star
                      size={12}
                      className="fill-orange-500 text-orange-500"
                    />
                    Assigned PM
                  </span>
                ) : member.role === "project_manager" ? (
                  // Only offered when the account itself already holds the
                  // Project Manager role — this designates WHICH of the
                  // company's PMs runs this project, it never grants the
                  // role to someone who doesn't already have it.
                  <button
                    onClick={() => handleMakePM(member.user)}
                    disabled={settingPmId === member.user}
                    className="text-xs px-2.5 py-1 rounded-full border border-steel-200 text-steel-500 hover:border-orange-300 hover:text-orange-600 transition-colors disabled:opacity-50"
                  >
                    {settingPmId === member.user
                      ? "Setting..."
                      : "Assign as PM for this project"}
                  </button>
                ) : null}
                <span className="text-xs px-2.5 py-1 rounded-full bg-steel-100 text-steel-600">
                  {member.role_on_project}
                </span>
                <button
                  onClick={() => handleRemove(member.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center">
            <Users size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              No one's been added to this project yet.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-steel-200/50">
            <h3 className="text-lg font-semibold text-steel-900 mb-4">
              Add Team Member
            </h3>

            {formError && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-3">
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(Number(e.target.value));
                  setCustomLabel("");
                }}
                className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>Select an employee...</option>
                {availableEmployees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.email})
                    {emp.role ? ` — ${roleLabel(emp.role)}` : ""}
                  </option>
                ))}
              </select>

              {selectedEmployee && !needsCustomLabel && (
                <div className="bg-steel-50 border border-steel-200 rounded-lg px-3 py-2 text-sm text-steel-600">
                  Will join this project as{" "}
                  <span className="font-medium text-steel-900">
                    {roleLabel(selectedEmployee.role)}
                  </span>{" "}
                  — their existing account role. This determines what they can
                  actually do here.
                </div>
              )}

              {needsCustomLabel && (
                <div>
                  <input
                    placeholder={`e.g. "Structural Steel Sub" or their organization name`}
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-steel-400 mt-1">
                    Their account role ({roleLabel(selectedEmployee!.role)})
                    doesn't say what they're doing on this specific project —
                    add a label so the team roster is clear.
                  </p>
                </div>
              )}

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
                  disabled={submitting || !selectedUser}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add to Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
