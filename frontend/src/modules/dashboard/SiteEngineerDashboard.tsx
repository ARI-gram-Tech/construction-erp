// frontend/src/modules/dashboard/SiteEngineerDashboard.tsx
import { useFetch } from "@/hooks/useFetch";
import { getSiteEngineerDashboard } from "@/services/dashboards";
import { ClipboardList, Package, FileImage, Clock } from "lucide-react";

export function SiteEngineerDashboard() {
  const { data, loading } = useFetch(() => getSiteEngineerDashboard());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
          <p className="text-sm text-steel-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const projects = data?.projects ?? [];

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-steel-900">
            Site Engineer Dashboard
          </h1>
          <p className="text-steel-500 mt-1">
            What's happening on your sites today.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-steel-200/50 p-8 text-center">
          <p className="text-sm text-steel-900 font-medium">
            No projects assigned yet
          </p>
          <p className="text-sm text-steel-500 mt-1">
            You'll see your site activities here once you're added to a project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-steel-900">
          Site Engineer Dashboard
        </h1>
        <p className="text-steel-500 mt-1">
          What's happening on your sites today.
        </p>
      </div>

      {projects.map((project) => (
        <div key={project.project_id} className="space-y-4">
          <h2 className="text-sm font-semibold text-steel-500 uppercase tracking-wider">
            Project #{project.project_id}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Activities */}
            <div className="bg-white rounded-xl border border-steel-200/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <ClipboardList size={18} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-steel-900">
                  Today's Activities
                </h3>
                <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
                  {project.todays_activities.length}
                </span>
              </div>

              {project.todays_activities.length === 0 ? (
                <p className="text-sm text-steel-500">
                  Nothing scheduled today.
                </p>
              ) : (
                <div className="divide-y divide-steel-200/50">
                  {project.todays_activities.map((activity) => (
                    <div key={activity.id} className="py-3 first:pt-0">
                      <p className="text-sm font-medium text-steel-900">
                        {activity.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-steel-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                activity.percent_complete,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-steel-500 font-medium">
                          {activity.percent_complete}%
                        </span>
                      </div>
                      <p className="text-xs text-steel-400 mt-1 capitalize">
                        {activity.status.replace(/_/g, " ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Materials */}
            <div className="bg-white rounded-xl border border-steel-200/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Package size={18} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-steel-900">
                  Pending Materials
                </h3>
                <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
                  {project.pending_materials.length}
                </span>
              </div>

              {project.pending_materials.length === 0 ? (
                <p className="text-sm text-steel-500">
                  No pending material requests.
                </p>
              ) : (
                <div className="divide-y divide-steel-200/50">
                  {project.pending_materials.map((material) => (
                    <div key={material.id} className="py-3 first:pt-0">
                      <p className="text-sm font-medium text-steel-900">
                        {material.item_name}
                      </p>
                      <p className="text-xs text-steel-500 mt-0.5">
                        {material.quantity_required} needed for{" "}
                        {material.activity_name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawings */}
            <div className="bg-white rounded-xl border border-steel-200/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <FileImage size={18} className="text-orange-500" />
                </div>
                <h3 className="font-semibold text-steel-900">Drawings</h3>
                <span className="ml-auto text-xs text-steel-400 bg-steel-50 px-2 py-0.5 rounded-full">
                  {project.drawings.length}
                </span>
              </div>

              {project.drawings.length === 0 ? (
                <p className="text-sm text-steel-500">
                  No drawings uploaded yet.
                </p>
              ) : (
                <div className="divide-y divide-steel-200/50">
                  {project.drawings.map((drawing) => (
                    <div
                      key={drawing.id}
                      className="py-3 first:pt-0 flex items-center gap-2"
                    >
                      <Clock size={14} className="text-steel-400 shrink-0" />
                      <p className="text-sm text-steel-900 truncate">
                        {drawing.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
