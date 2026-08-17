// frontend/src/modules/projects/ProjectPlanning/components/RequirementGroupTab.tsx
//
// Renders a SINGLE requirement group (Material / Labour / Plant & Equipment /
// Tool / PPE & Safety / Service) as the content of its own top-level tab.
//
// This replaces the old pattern in RequirementsTab.tsx where all six groups
// were fetched and stacked vertically on one "Requirements" tab. Now each
// group type gets its own tab (see ActivityDetailPage.tsx), and this
// component is responsible for rendering just the one the person clicked
// into.
//
// It still fetches `listRequirementGroups` itself (cheap — same call the
// old RequirementsTab made) so it can read that one group's status,
// responsible person, dates, etc. and hand them to RequirementGroupCard.

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
import { RequirementItemList } from "./RequirementItemList";
import { MaterialsItemList } from "./MaterialsItemList";
import { isQS, isProjectPM, canManagePlanningStructure } from "./PlanningRoles";
import type { RequirementGroupType } from "@/types/planning";

interface RequirementGroupTabProps {
  projectId: number;
  activityId: number;
  groupType: RequirementGroupType;
  currentUserId?: number;
  currentUserRole?: string;
  projectManagerId: number | null;
}

export function RequirementGroupTab({
  projectId,
  activityId,
  groupType,
  currentUserId,
  currentUserRole,
  projectManagerId,
}: RequirementGroupTabProps) {
  const { data: groups, reload: reloadGroups } = useFetch(
    () => listRequirementGroups(projectId, activityId),
    [projectId, activityId],
  );

  const canManage =
    isProjectPM(currentUserId, currentUserRole, projectManagerId) ||
    canManagePlanningStructure(currentUserRole);
  const canReview = canManage || isQS(currentUserRole);

  if (!groups) {
    return (
      <p className="text-sm text-steel-400 p-4">Loading requirement group...</p>
    );
  }

  const group = groups.find((g) => g.group_type === groupType);

  if (!group) {
    return (
      <p className="text-sm text-steel-400 p-4">
        This requirement group isn't set up for this activity yet.
      </p>
    );
  }

  let content: React.ReactNode;
  switch (groupType) {
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
          projectId={projectId}
          activityId={activityId}
          groupId={group.id}
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
          projectId={projectId}
          activityId={activityId}
          groupId={group.id}
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
          projectId={projectId}
          activityId={activityId}
          groupId={group.id}
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
          projectId={projectId}
          activityId={activityId}
          groupId={group.id}
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
          projectId={projectId}
          activityId={activityId}
          groupId={group.id}
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
  );
}

// --- Small wrappers: each fetches its own item list and feeds RequirementItemList ---
// (same five as before — Materials is handled separately above via MaterialsItemList)

function LabourList({
  projectId,
  activityId,
  groupId,
  canManage,
  canReview,
  currentUserId,
  responsibleId,
  onReload,
}: {
  projectId: number;
  activityId: number;
  groupId: number;
  canManage: boolean;
  canReview: boolean;
  currentUserId?: number;
  responsibleId: number | null;
  onReload: () => void;
}) {
  const { data, reload } = useFetch(
    () => listActivityLabour(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      items={data}
      primaryField="role"
      primaryLabel="Role (e.g. Mason)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        // Backend requires `group` on create — this is the id of the
        // Labour requirement group this item belongs to (fixes
        // "This field is required." on the group field).
        addActivityLabour(projectId, activityId, {
          ...payload,
          group: groupId,
        } as any)
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
}

function EquipmentList({
  projectId,
  activityId,
  groupId,
  canManage,
  canReview,
  currentUserId,
  responsibleId,
  onReload,
}: {
  projectId: number;
  activityId: number;
  groupId: number;
  canManage: boolean;
  canReview: boolean;
  currentUserId?: number;
  responsibleId: number | null;
  onReload: () => void;
}) {
  const { data, reload } = useFetch(
    () => listActivityEquipment(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      items={data}
      primaryField="equipment_name"
      primaryLabel="Equipment (e.g. Concrete Mixer)"
      showDates
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityEquipment(projectId, activityId, {
          ...payload,
          group: groupId,
        } as any)
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
}

function ToolsList({
  projectId,
  activityId,
  groupId,
  canManage,
  canReview,
  currentUserId,
  responsibleId,
  onReload,
}: {
  projectId: number;
  activityId: number;
  groupId: number;
  canManage: boolean;
  canReview: boolean;
  currentUserId?: number;
  responsibleId: number | null;
  onReload: () => void;
}) {
  const { data, reload } = useFetch(
    () => listActivityTools(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      items={data}
      primaryField="tool_name"
      primaryLabel="Tool (e.g. Wheelbarrow)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityTool(projectId, activityId, {
          ...payload,
          group: groupId,
        } as any)
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
}

function PPEList({
  projectId,
  activityId,
  groupId,
  canManage,
  canReview,
  currentUserId,
  responsibleId,
  onReload,
}: {
  projectId: number;
  activityId: number;
  groupId: number;
  canManage: boolean;
  canReview: boolean;
  currentUserId?: number;
  responsibleId: number | null;
  onReload: () => void;
}) {
  const { data, reload } = useFetch(
    () => listActivityPPE(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      items={data}
      primaryField="ppe_name"
      primaryLabel="PPE Item (e.g. Helmet)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityPPE(projectId, activityId, {
          ...payload,
          group: groupId,
        } as any)
      }
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
}

function ServicesList({
  projectId,
  activityId,
  groupId,
  canManage,
  canReview,
  currentUserId,
  responsibleId,
  onReload,
}: {
  projectId: number;
  activityId: number;
  groupId: number;
  canManage: boolean;
  canReview: boolean;
  currentUserId?: number;
  responsibleId: number | null;
  onReload: () => void;
}) {
  const { data, reload } = useFetch(
    () => listActivityServices(projectId, activityId),
    [projectId, activityId],
  );
  return (
    <RequirementItemList
      items={data}
      primaryField="service_name"
      primaryLabel="Service (e.g. Concrete Pumping)"
      canAdd={canManage || currentUserId === responsibleId}
      canReview={canReview}
      currentUserId={currentUserId}
      onAdd={(payload) =>
        addActivityService(projectId, activityId, {
          ...payload,
          group: groupId,
        } as any)
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
}
