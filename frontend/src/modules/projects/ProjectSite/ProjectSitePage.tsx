// frontend/src/modules/projects/ProjectSite/ProjectSitePage.tsx
import { HardHat } from "lucide-react";

export function ProjectSitePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-steel-900">Site</h2>
        <p className="text-sm text-steel-500">
          Daily reports, attendance, and safety incidents from the field.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-steel-300 bg-white p-10 text-center">
        <HardHat size={24} className="text-steel-300 mx-auto mb-2" />
        <p className="text-sm text-steel-500">
          This tab will show what the mobile app submits from site — daily
          reports, attendance, and safety incidents — once the mobile app
          exists.
        </p>
      </div>
    </div>
  );
}
