// frontend/src/modules/projects/ProjectPlanning/components/RequirementsTab.tsx
import { useMemo, useRef, useState, forwardRef } from "react";
import {
  ClipboardCheck,
  Plus,
  Package,
  Users,
  Truck,
  Hammer,
  HardHat,
  Briefcase,
} from "lucide-react";
import {
  listRequirementGroups,
  listActivityLabour,
  addActivityLabour,
  removeActivityLabour,
  submitActivityLabour,
  approveActivityLabour,
  requestActivityLabourChanges,
  listActivityEquipment,
  addActivityEquipment,
  removeActivityEquipment,
  submitActivityEquipment,
  approveActivityEquipment,
  requestActivityEquipmentChanges,
  listActivityTools,
  addActivityTool,
  removeActivityTool,
  submitActivityTool,
  approveActivityTool,
  requestActivityToolChanges,
  listActivityPPE,
  addActivityPPE,
  removeActivityPPE,
  submitActivityPPE,
  approveActivityPPE,
  requestActivityPPEChanges,
  listActivityServices,
  addActivityService,
  removeActivityService,
  submitActivityService,
  approveActivityService,
  requestActivityServiceChanges,
} from "@/services/planning";
import { useFetch } from "@/hooks/useFetch";
import { RequirementGroupCard } from "./RequirementGroupCard";
import {
  RequirementItemList,
  type RequirementItemListHandle,
} from "./RequirementItemList";
import { MaterialsItemList } from "./MaterialsItemList";
import { isQS, isProjectPM } from "./PlanningRoles";
import { canManagePlanningStructure } from "./PlanningRoles";
import type { RequirementGroupType } from "@/types/planning";

interface RequirementsTabProps {
  projectId: number;
  activityId: number;
  currentUserId?: number;
  currentUserRole?: string;
  projectManagerId: number | null;
}

const GROUP_ORDER: RequirementGroupType[] = [
  "materials",
  "labour",
  "plant_equipment",
  "tools",
  "ppe_safety",
  "services",
];

const GROUP_META: Record<
  RequirementGroupType,
  { label: string; icon: React.ElementType }
> = {
  materials: { label: "Material", icon: Package },
  labour: { label: "Labour", icon: Users },
  plant_equipment: { label: "Plant & Equipment", icon: Truck },
  tools: { label: "Tool", icon: Hammer },
  ppe_safety: { label: "PPE & Safety", icon: HardHat },
  services: { label: "Service", icon: Briefcase },
};

export function RequirementsTab({
  projectId,
  activityId,
  currentUserId,
  currentUserRole,
  projectManagerId,
}: RequirementsTabProps) {
  const { data: groups, reload: reloadGroups } = useFetch(
    () => listRequirementGroups(projectId, activityId),
    [projectId, activityId],
  );

  const canManage =
    isProjectPM(currentUserId, currentUserRole, projectManagerId) ||
    canManagePlanningStructure(currentUserRole);
  const canReview = canManage || isQS(currentUserRole);

  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // One imperative handle + one scroll target per group type, so
  // "Create +" -> pick a type can jump straight to that group's card
  // and pop its add-item modal open, instead of the person having to
  // scroll and hunt for the right section themselves.
  const itemListRefs = useRef<
    Partial<Record<RequirementGroupType, RequirementItemListHandle>>
  >({});
  const sectionRefs = useRef<
    Partial<Record<RequirementGroupType, HTMLDivElement | null>>
  >({});

  const orderedGroups = useMemo(() => {
    if (!groups) return [];
    return GROUP_ORDER.map((type) =>
      groups.find((g) => g.group_type === type),
    ).filter((g): g is NonNullable<typeof g> => !!g);
  }, [groups]);

  const readyCount = orderedGroups.filter(
    (g) => g.status === "approved",
  ).length;
  const applicableCount = orderedGroups.filter(
    (g) => g.status !== "not_required",
  ).length;

  function handleCreateSelect(type: RequirementGroupType) {
    setShowCreateMenu(false);
    sectionRefs.current[type]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    // Materials uses its own catalog-picker flow (MaterialsItemList),
    // which doesn't expose the same openAdd() handle as the other five
    // — scrolling to it is still correct, it just won't auto-pop a
    // modal the way Labour/Equipment/Tools/PPE/Services do.
    setTimeout(() => {
      itemListRefs.current[type]?.openAdd();
    }, 300);
  }

  if (!groups) {
    return (
      <p className="text-sm text-steel-400 p-4">
        Loading requirement groups...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 bg-orange-50/60 border border-orange-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-steel-900">
              {applicableCount === 0
                ? "No requirement groups assigned yet"
                : `${readyCount} / ${applicableCount} groups ready`}
            </p>
          </div>
          {applicableCount > 0 && (
            <div className="w-full h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${(readyCount / applicableCount) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowCreateMenu((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Create
          </button>
          {showCreateMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowCreateMenu(false)}
              />
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-steel-200/60 shadow-lg z-20 overflow-hidden">
                {GROUP_ORDER.map((type) => {
                  const { label, icon: Icon } = GROUP_META[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleCreateSelect(type)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-steel-700 hover:bg-steel-50 transition-colors text-left"
                    >
                      <Icon size={15} className="text-steel-400" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {orderedGroups.map((group) => {
        let content: React.ReactNode;

        switch (group.group_type) {
          case "materials":
            content = (
              <MaterialsItemList
                projectId={projectId}
                activityId={activityId}
                canAdd={canManage || currentUserId === group.responsible}
                canReview={canReview}
                currentUserId={currentUserId}
                onReload={reloadGroups}
              />
            );
            break;
          case "labour":
            content = (
              <LabourList
                ref={(el) => {
                  itemListRefs.current.labour = el ?? undefined;
                }}
                projectId={projectId}
                activityId={activityId}
                canManage={canManage}
                canReview={canReview}
                currentUserId={currentUserId}
                responsibleId={group.responsible}
                onReload={reloadGroups}
              />
            );
            break;
          case "plant_equipment":
            content = (
              <EquipmentList
                ref={(el) => {
                  itemListRefs.current.plant_equipment = el ?? undefined;
                }}
                projectId={projectId}
                activityId={activityId}
                canManage={canManage}
                canReview={canReview}
                currentUserId={currentUserId}
                responsibleId={group.responsible}
                onReload={reloadGroups}
              />
            );
            break;
          case "tools":
            content = (
              <ToolsList
                ref={(el) => {
                  itemListRefs.current.tools = el ?? undefined;
                }}
                projectId={projectId}
                activityId={activityId}
                canManage={canManage}
                canReview={canReview}
                currentUserId={currentUserId}
                responsibleId={group.responsible}
                onReload={reloadGroups}
              />
            );
            break;
          case "ppe_safety":
            content = (
              <PPEList
                ref={(el) => {
                  itemListRefs.current.ppe_safety = el ?? undefined;
                }}
                projectId={projectId}
                activityId={activityId}
                canManage={canManage}
                canReview={canReview}
                currentUserId={currentUserId}
                responsibleId={group.responsible}
                onReload={reloadGroups}
              />
            );
            break;
          case "services":
            content = (
              <ServicesList
                ref={(el) => {
                  itemListRefs.current.services = el ?? undefined;
                }}
                projectId={projectId}
                activityId={activityId}
                canManage={canManage}
                canReview={canReview}
                currentUserId={currentUserId}
                responsibleId={group.responsible}
                onReload={reloadGroups}
              />
            );
            break;
        }

        return (
          <div
            key={group.id}
            ref={(el) => {
              sectionRefs.current[group.group_type] = el;
            }}
          >
            <RequirementGroupCard
              projectId={projectId}
              activityId={activityId}
              group={group}
              canManage={canManage}
              canReview={canReview}
              onUpdate={reloadGroups}
            >
              {content}
            </RequirementGroupCard>
          </div>
        );
      })}
    </div>
  );
}

// --- Small wrappers: each fetches its own item list and feeds RequirementItemList ---

const LabourList = forwardRef<
  RequirementItemListHandle,
  {
    projectId: number;
    activityId: number;
    canManage: boolean;
    canReview: boolean;
    currentUserId?: number;
    responsibleId: number | null;
    onReload: () => void;
  }
>(function LabourList(
  {
    projectId,
    activityId,
    canManage,
    canReview,
    currentUserId,
    responsibleId,
    onReload,
  },
  ref,
) {
  const { data, reload } = useFetch(
    () => listActivityLabour(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      ref={ref}
      items={data}
      primaryField="role"
      primaryLabel="Role (e.g. Mason)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityLabour(projectId, activityId, payload as any)
      }
      onRemove={(id) => removeActivityLabour(projectId, activityId, id)}
      onSubmit={(id) => submitActivityLabour(projectId, activityId, id)}
      onApprove={(id) => approveActivityLabour(projectId, activityId, id)}
      onRequestChanges={(id, note) =>
        requestActivityLabourChanges(projectId, activityId, id, note)
      }
      onReload={() => {
        reload();
        onReload();
      }}
    />
  );
});

const EquipmentList = forwardRef<
  RequirementItemListHandle,
  {
    projectId: number;
    activityId: number;
    canManage: boolean;
    canReview: boolean;
    currentUserId?: number;
    responsibleId: number | null;
    onReload: () => void;
  }
>(function EquipmentList(
  {
    projectId,
    activityId,
    canManage,
    canReview,
    currentUserId,
    responsibleId,
    onReload,
  },
  ref,
) {
  const { data, reload } = useFetch(
    () => listActivityEquipment(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      ref={ref}
      items={data}
      primaryField="equipment_name"
      primaryLabel="Equipment (e.g. Concrete Mixer)"
      showDates
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityEquipment(projectId, activityId, payload as any)
      }
      onRemove={(id) => removeActivityEquipment(projectId, activityId, id)}
      onSubmit={(id) => submitActivityEquipment(projectId, activityId, id)}
      onApprove={(id) => approveActivityEquipment(projectId, activityId, id)}
      onRequestChanges={(id, note) =>
        requestActivityEquipmentChanges(projectId, activityId, id, note)
      }
      onReload={() => {
        reload();
        onReload();
      }}
    />
  );
});

const ToolsList = forwardRef<
  RequirementItemListHandle,
  {
    projectId: number;
    activityId: number;
    canManage: boolean;
    canReview: boolean;
    currentUserId?: number;
    responsibleId: number | null;
    onReload: () => void;
  }
>(function ToolsList(
  {
    projectId,
    activityId,
    canManage,
    canReview,
    currentUserId,
    responsibleId,
    onReload,
  },
  ref,
) {
  const { data, reload } = useFetch(
    () => listActivityTools(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      ref={ref}
      items={data}
      primaryField="tool_name"
      primaryLabel="Tool (e.g. Wheelbarrow)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityTool(projectId, activityId, payload as any)
      }
      onRemove={(id) => removeActivityTool(projectId, activityId, id)}
      onSubmit={(id) => submitActivityTool(projectId, activityId, id)}
      onApprove={(id) => approveActivityTool(projectId, activityId, id)}
      onRequestChanges={(id, note) =>
        requestActivityToolChanges(projectId, activityId, id, note)
      }
      onReload={() => {
        reload();
        onReload();
      }}
    />
  );
});

const PPEList = forwardRef<
  RequirementItemListHandle,
  {
    projectId: number;
    activityId: number;
    canManage: boolean;
    canReview: boolean;
    currentUserId?: number;
    responsibleId: number | null;
    onReload: () => void;
  }
>(function PPEList(
  {
    projectId,
    activityId,
    canManage,
    canReview,
    currentUserId,
    responsibleId,
    onReload,
  },
  ref,
) {
  const { data, reload } = useFetch(
    () => listActivityPPE(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      ref={ref}
      items={data}
      primaryField="ppe_name"
      primaryLabel="PPE Item (e.g. Helmet)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) => addActivityPPE(projectId, activityId, payload as any)}
      onRemove={(id) => removeActivityPPE(projectId, activityId, id)}
      onSubmit={(id) => submitActivityPPE(projectId, activityId, id)}
      onApprove={(id) => approveActivityPPE(projectId, activityId, id)}
      onRequestChanges={(id, note) =>
        requestActivityPPEChanges(projectId, activityId, id, note)
      }
      onReload={() => {
        reload();
        onReload();
      }}
    />
  );
});

const ServicesList = forwardRef<
  RequirementItemListHandle,
  {
    projectId: number;
    activityId: number;
    canManage: boolean;
    canReview: boolean;
    currentUserId?: number;
    responsibleId: number | null;
    onReload: () => void;
  }
>(function ServicesList(
  {
    projectId,
    activityId,
    canManage,
    canReview,
    currentUserId,
    responsibleId,
    onReload,
  },
  ref,
) {
  const { data, reload } = useFetch(
    () => listActivityServices(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      ref={ref}
      items={data}
      primaryField="service_name"
      primaryLabel="Service (e.g. Concrete Pumping)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityService(projectId, activityId, payload as any)
      }
      onRemove={(id) => removeActivityService(projectId, activityId, id)}
      onSubmit={(id) => submitActivityService(projectId, activityId, id)}
      onApprove={(id) => approveActivityService(projectId, activityId, id)}
      onRequestChanges={(id, note) =>
        requestActivityServiceChanges(projectId, activityId, id, note)
      }
      onReload={() => {
        reload();
        onReload();
      }}
    />
  );
});
