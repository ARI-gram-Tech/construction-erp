// /src/modules/projects/ProjectOverview/ProjectOverviewPage.tsx
import { useParams } from "react-router-dom";
import { StatCard } from "@/components/StatCard";
import { useFetch } from "@/hooks/useFetch";
import { getProject } from "@/services/projects";

export function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  const {
    data: project,
    loading,
    error,
  } = useFetch(() => getProject(Number(projectId)), [projectId]);

  if (loading) {
    return <div className="text-steel-500">Loading project...</div>;
  }

  if (error || !project) {
    return <div className="text-red-600">Failed to load this project.</div>;
  }

  const contractValue = project.contract_value
    ? Number(project.contract_value)
    : null;
  const budget = project.budget ? Number(project.budget) : null;

  const costControl = [
    {
      label: "Contract value",
      value: contractValue
        ? `KES ${contractValue.toLocaleString()}`
        : "Not set",
    },
    {
      label: "Budget",
      value: budget ? `KES ${budget.toLocaleString()}` : "Not set",
    },
    {
      label: "Spent to date",
      value: "Not tracked yet",
    },
    {
      label: "Expected profit",
      value:
        contractValue && budget
          ? `KES ${(contractValue - budget).toLocaleString()}`
          : "Not set",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-steel-900">Overview</h2>
        <p className="text-sm text-steel-500">
          Cost control, timeline, and resource status for {project.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {costControl.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="bg-white rounded-lg border border-steel-200/50 p-5">
        <h3 className="text-sm font-semibold text-steel-900 mb-3">
          Project details
        </h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-steel-500">Client</dt>
            <dd className="text-steel-900">
              {project.client_detail?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-steel-500">Location</dt>
            <dd className="text-steel-900">{project.location || "—"}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Start date</dt>
            <dd className="text-steel-900">{project.start_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-steel-500">Project manager</dt>
            <dd className="text-steel-900">
              {project.project_manager_name ?? "Not assigned"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-dashed border-steel-300 bg-white p-8 text-center text-sm text-steel-500">
        Planning (Gantt), documents, BOQ, procurement, inventory, and finance
        panels for this project workspace are built in later phases.
      </div>
    </div>
  );
}
