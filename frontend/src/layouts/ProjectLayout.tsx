// frontend/src/layouts/ProjectLayout.tsx
import { Outlet, useParams } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import { getProject } from "@/services/projects";
import { ProjectSidebar } from "@/components/Layouts/Projects/ProjectSidebar";
import { ProjectHeader } from "@/components/Layouts/Projects/ProjectHeader";
import { PasswordGateway } from "@/components/PasswordGateway";

export function ProjectLayout() {
  const { projectId = "" } = useParams();
  const { data: project, loading } = useFetch(
    () => getProject(Number(projectId)),
    [projectId],
  );

  return (
    <PasswordGateway>
      <div className="min-h-screen flex bg-steel-50/50">
        <ProjectSidebar project={project} loading={loading} />

        <div className="flex-1 flex flex-col min-h-screen">
          <ProjectHeader project={project} loading={loading} />

          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PasswordGateway>
  );
}
