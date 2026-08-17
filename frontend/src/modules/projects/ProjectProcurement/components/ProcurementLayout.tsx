// modules/projects/ProjectProcurement/components/ProcurementLayout.tsx
import { Outlet } from "react-router-dom";
import { ProcurementHeader } from "./ProcurementHeader";
import { ProcurementPageHeader } from "./ProcurementPageHeader";

export function ProcurementLayout() {
  return (
    <div className="flex flex-col gap-4">
      <ProcurementHeader />
      <ProcurementPageHeader />
      <Outlet />
    </div>
  );
}
