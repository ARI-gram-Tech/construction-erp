// frontend/src/components/Layouts/Projects/ProjectHeader.tsx
import { useState } from "react";
import {
  Building2,
  TrendingUp,
  Calendar,
  MoreVertical,
  Edit,
  Share2,
  Download,
} from "lucide-react";
import type { Project } from "@/types/project";
import { ProjectNotificationBell } from "@/components/Layouts/Projects/ProjectNotificationBell";

interface ProjectHeaderProps {
  project: Project | null;
  loading: boolean;
}

function getStatusColor(status?: string) {
  if (!status) return "bg-steel-100 text-steel-600";
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "planning":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "on_hold":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-steel-50 text-steel-600 border-steel-200";
  }
}

function getStatusDotColor(status?: string) {
  if (!status) return "bg-steel-400";
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-500";
    case "planning":
      return "bg-blue-500";
    case "on_hold":
      return "bg-amber-500";
    case "completed":
      return "bg-purple-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-steel-400";
  }
}

export function ProjectHeader({ project, loading }: ProjectHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-steel-200/70 sticky top-0 z-10">
      <div className="px-8 py-4">
        {/* Top Row - Project Name & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-steel-900">
              {loading ? "Loading..." : (project?.name ?? "Project")}
            </h1>

            {project?.status && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(project.status)}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(project.status)}`}
                />
                {project.status.replace(/_/g, " ").toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {project && (
              <ProjectNotificationBell projectId={String(project.id)} />
            )}

            <button className="p-2 rounded-lg hover:bg-steel-100/80 transition-colors text-steel-500 hover:text-steel-700">
              <Share2 size={18} />
            </button>
            <button className="p-2 rounded-lg hover:bg-steel-100/80 transition-colors text-steel-500 hover:text-steel-700">
              <Download size={18} />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm shadow-orange-500/20">
              <Edit size={16} />
              Edit Project
            </button>

            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-steel-100/80 transition-colors text-steel-500 hover:text-steel-700"
              >
                <MoreVertical size={18} />
              </button>
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-steel-200/50 py-1.5 z-50">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel-700 hover:bg-steel-50 transition-colors">
                      <Edit size={16} className="text-steel-400" />
                      Edit
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel-700 hover:bg-steel-50 transition-colors">
                      <Share2 size={16} className="text-steel-400" />
                      Share
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-steel-700 hover:bg-steel-50 transition-colors">
                      <Download size={16} className="text-steel-400" />
                      Export
                    </button>
                    <div className="h-px bg-steel-200/50 my-1" />
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      Archive Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row - Project Details */}
        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-steel-200/50">
          <div className="flex items-center gap-2 text-sm text-steel-600">
            <Building2 size={16} className="text-steel-400" />
            <span>{project?.client_detail?.name ?? "No client"}</span>
          </div>

          <div className="w-px h-5 bg-steel-200" />

          <div className="flex items-center gap-2 text-sm text-steel-600">
            <TrendingUp size={16} className="text-steel-400" />
            <span className="font-medium text-steel-900">
              {project?.contract_value
                ? `KES ${Number(project.contract_value).toLocaleString()}`
                : "—"}
            </span>
            <span className="text-steel-400 text-xs">Contract Value</span>
          </div>

          <div className="w-px h-5 bg-steel-200" />

          <div className="flex items-center gap-2 text-sm text-steel-600">
            <Calendar size={16} className="text-steel-400" />
            {project?.start_date && project?.end_date ? (
              <>
                <span>{new Date(project.start_date).toLocaleDateString()}</span>
                <span className="text-steel-400">→</span>
                <span>{new Date(project.end_date).toLocaleDateString()}</span>
              </>
            ) : (
              <span className="text-steel-400">No timeline set</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
