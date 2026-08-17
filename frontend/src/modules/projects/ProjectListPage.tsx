import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { listProjects, createProject } from "@/services/projects";
import { listClients, createClient } from "@/services/clients";
import { createPortal } from "react-dom";
import type { ProjectPayload } from "@/types/project";
import { FolderKanban, Plus, MapPin } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-steel-100 text-steel-600",
  active: "bg-green-100 text-green-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export function ProjectListPage() {
  const navigate = useNavigate();
  const {
    data: projects,
    loading,
    error,
    reload,
  } = useFetch(() => listProjects());
  const { data: clients, reload: reloadClients } = useFetch(() =>
    listClients(),
  );

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  const [form, setForm] = useState<ProjectPayload>({
    name: "",
    client: 0,
    location: "",
    contract_value: "",
    start_date: "",
  });

  function updateField<K extends keyof ProjectPayload>(
    key: K,
    value: ProjectPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      let clientId = form.client;

      if (isNewClient) {
        if (!newClientName.trim()) {
          setFormError("Enter a client name.");
          setSubmitting(false);
          return;
        }
        const newClient = await createClient({
          name: newClientName,
          client_type: "private_company",
        });
        clientId = newClient.id;
        reloadClients();
      }

      if (!clientId) {
        setFormError("Select or create a client.");
        setSubmitting(false);
        return;
      }

      await createProject({ ...form, client: clientId });
      setShowModal(false);
      setForm({
        name: "",
        client: 0,
        location: "",
        contract_value: "",
        start_date: "",
      });
      setIsNewClient(false);
      setNewClientName("");
      reload();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.name?.[0] ||
          err?.response?.data?.client?.[0] ||
          "Failed to create project.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-steel-500">Loading projects...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-steel-900">Projects</h1>
          <p className="text-steel-500">
            All construction projects for your company
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects && projects.length > 0 ? (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/overview`)}
              className="text-left bg-white rounded-xl border border-steel-200/50 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-steel-900">{project.name}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    STATUS_COLORS[project.status] ??
                    "bg-steel-100 text-steel-600"
                  }`}
                >
                  {project.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-steel-500 mb-1">
                Client: {project.client_detail?.name ?? "—"}
              </p>
              {project.location && (
                <p className="text-xs text-steel-400 flex items-center gap-1">
                  <MapPin size={12} />
                  {project.location}
                </p>
              )}
              {project.contract_value && (
                <p className="text-sm font-medium text-steel-700 mt-3">
                  KES {Number(project.contract_value).toLocaleString()}
                </p>
              )}
            </button>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-white rounded-xl border border-steel-200/50">
            <FolderKanban size={24} className="text-steel-300 mx-auto mb-2" />
            <p className="text-sm text-steel-500">
              No projects yet. Create your first project.
            </p>
          </div>
        )}
      </div>

      {showModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto border border-steel-200/50">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-steel-900">
                  New Project
                </h2>
                <p className="text-sm text-steel-500 mt-0.5">
                  Add a new construction project to your company.
                </p>
              </div>
              {formError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  placeholder="Project name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  required
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-steel-700">
                      Client
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewClient(!isNewClient)}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      {isNewClient
                        ? "Choose existing client"
                        : "+ Add new client"}
                    </button>
                  </div>

                  {isNewClient ? (
                    <input
                      placeholder="New client name"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                    />
                  ) : (
                    <select
                      value={form.client}
                      onChange={(e) =>
                        updateField("client", Number(e.target.value))
                      }
                      className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value={0}>Select a client...</option>
                      {clients?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <input
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Contract value (KES)"
                  value={form.contract_value}
                  onChange={(e) =>
                    updateField("contract_value", e.target.value)
                  }
                  className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                />
                <div>
                  <label className="text-xs text-steel-500">Start date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => updateField("start_date", e.target.value)}
                    className="w-full border border-steel-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

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
                    {submitting ? "Creating..." : "Create Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
