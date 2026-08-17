// frontend/src/services/planning.ts
import { api } from "./api";
import type {
  Activity,
  Milestone,
  WBSNode,
  ProjectBaseline,
  VarianceRow,
  ActivityMaterial,
  ActivityMaterialPayload,
  ActivityLabourRequirement,
  ActivityLabourPayload,
  ActivityEquipmentRequirement,
  ActivityEquipmentPayload,
  ActivityToolRequirement,
  ActivityToolPayload,
  ActivityPPERequirement,
  ActivityPPEPayload,
  ActivityServiceRequirement,
  ActivityServicePayload,
  ProgressUpdate,
  ProgressUpdatePayload,
  RequirementGroup,
} from "@/types/planning";

export async function listActivities(projectId: number): Promise<Activity[]> {
  const { data } = await api.get(`/planning/projects/${projectId}/activities/`);
  return data.results ?? data;
}

export async function createActivity(
  projectId: number,
  payload: Pick<Activity, "name" | "planned_start" | "planned_end"> & {
    wbs?: number | null;
    code?: string;
    responsible?: number | null;
    depends_on?: number | null;
  },
): Promise<Activity> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/`,
    payload,
  );
  return data;
}

export async function updateActivityProgress(
  projectId: number,
  activityId: number,
  payload: ProgressUpdatePayload,
): Promise<Activity> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/progress/`,
    payload,
  );
  return data;
}

export async function listActivityProgress(
  projectId: number,
  activityId: number,
): Promise<ProgressUpdate[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/progress/`,
  );
  return data.results ?? data;
}

export async function deleteActivity(
  projectId: number,
  activityId: number,
  force?: { force: boolean; reason: string },
) {
  await api.delete(
    `/planning/projects/${projectId}/activities/${activityId}/`,
    {
      data: force,
    },
  );
}

export async function listActivityBin(projectId: number): Promise<Activity[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/bin/`,
  );
  return data.results ?? data;
}

export async function restoreActivity(
  projectId: number,
  activityId: number,
): Promise<Activity> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/restore/`,
  );
  return data;
}

export async function listMilestones(projectId: number): Promise<Milestone[]> {
  const { data } = await api.get(`/planning/projects/${projectId}/milestones/`);
  return data.results ?? data;
}

export async function createMilestone(
  projectId: number,
  payload: Pick<Milestone, "name" | "target_date">,
): Promise<Milestone> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/milestones/`,
    payload,
  );
  return data;
}

export async function listWBS(projectId: number): Promise<WBSNode[]> {
  const { data } = await api.get(`/planning/projects/${projectId}/wbs/`);
  return data.results ?? data;
}

export async function createWBSNode(
  projectId: number,
  payload: { code: string; name: string; parent?: number | null },
): Promise<WBSNode> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/wbs/`,
    payload,
  );
  return data;
}

export async function deleteWBSNode(projectId: number, nodeId: number) {
  await api.delete(`/planning/projects/${projectId}/wbs/${nodeId}/`);
}

export async function listWBSBin(projectId: number): Promise<WBSNode[]> {
  const { data } = await api.get(`/planning/projects/${projectId}/wbs/bin/`);
  return data.results ?? data;
}

export async function restoreWBSNode(
  projectId: number,
  nodeId: number,
): Promise<WBSNode> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/wbs/${nodeId}/restore/`,
  );
  return data;
}

export async function listBaselines(
  projectId: number,
): Promise<ProjectBaseline[]> {
  const { data } = await api.get(`/planning/projects/${projectId}/baselines/`);
  return data.results ?? data;
}

export async function createBaseline(
  projectId: number,
  payload: { name: string; remarks?: string },
): Promise<ProjectBaseline> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/baselines/`,
    payload,
  );
  return data;
}

export async function deleteBaseline(projectId: number, baselineId: number) {
  await api.delete(`/planning/projects/${projectId}/baselines/${baselineId}/`);
}

export async function getBaselineVariance(
  projectId: number,
  baselineId: number,
): Promise<VarianceRow[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/baselines/${baselineId}/variance/`,
  );
  return data;
}

// --- Materials ---

export async function listActivityMaterials(
  projectId: number,
  activityId: number,
): Promise<ActivityMaterial[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/materials/`,
  );
  return data.results ?? data;
}

export async function addActivityMaterial(
  projectId: number,
  activityId: number,
  payload: ActivityMaterialPayload,
): Promise<ActivityMaterial> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/materials/`,
    payload,
  );
  return data;
}

export async function removeActivityMaterial(
  projectId: number,
  activityId: number,
  materialId: number,
) {
  await api.delete(
    `/planning/projects/${projectId}/activities/${activityId}/materials/${materialId}/`,
  );
}

export async function submitActivityMaterial(
  projectId: number,
  activityId: number,
  materialId: number,
): Promise<ActivityMaterial> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/materials/${materialId}/submit/`,
  );
  return data;
}

export async function approveActivityMaterial(
  projectId: number,
  activityId: number,
  materialId: number,
): Promise<ActivityMaterial> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/materials/${materialId}/approve/`,
  );
  return data;
}

export async function requestActivityMaterialChanges(
  projectId: number,
  activityId: number,
  materialId: number,
  note: string,
): Promise<ActivityMaterial> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/materials/${materialId}/request-changes/`,
    { note },
  );
  return data;
}

export async function generateRestockRequestFromActivity(
  projectId: number,
  activityId: number,
): Promise<Activity> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/generate-restock-request/`,
  );
  return data;
}

// --- Labour ---

export async function listActivityLabour(
  projectId: number,
  activityId: number,
): Promise<ActivityLabourRequirement[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/labour/`,
  );
  return data.results ?? data;
}

export async function addActivityLabour(
  projectId: number,
  activityId: number,
  payload: ActivityLabourPayload,
): Promise<ActivityLabourRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/labour/`,
    payload,
  );
  return data;
}

export async function removeActivityLabour(
  projectId: number,
  activityId: number,
  labourId: number,
) {
  await api.delete(
    `/planning/projects/${projectId}/activities/${activityId}/labour/${labourId}/`,
  );
}

export async function submitActivityLabour(
  projectId: number,
  activityId: number,
  labourId: number,
): Promise<ActivityLabourRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/labour/${labourId}/submit/`,
  );
  return data;
}

export async function approveActivityLabour(
  projectId: number,
  activityId: number,
  labourId: number,
): Promise<ActivityLabourRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/labour/${labourId}/approve/`,
  );
  return data;
}

export async function requestActivityLabourChanges(
  projectId: number,
  activityId: number,
  labourId: number,
  note: string,
): Promise<ActivityLabourRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/labour/${labourId}/request-changes/`,
    { note },
  );
  return data;
}

// --- Equipment ---

export async function listActivityEquipment(
  projectId: number,
  activityId: number,
): Promise<ActivityEquipmentRequirement[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/equipment/`,
  );
  return data.results ?? data;
}

export async function addActivityEquipment(
  projectId: number,
  activityId: number,
  payload: ActivityEquipmentPayload,
): Promise<ActivityEquipmentRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/equipment/`,
    payload,
  );
  return data;
}

export async function removeActivityEquipment(
  projectId: number,
  activityId: number,
  equipmentId: number,
) {
  await api.delete(
    `/planning/projects/${projectId}/activities/${activityId}/equipment/${equipmentId}/`,
  );
}

export async function submitActivityEquipment(
  projectId: number,
  activityId: number,
  equipmentId: number,
): Promise<ActivityEquipmentRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/equipment/${equipmentId}/submit/`,
  );
  return data;
}

export async function approveActivityEquipment(
  projectId: number,
  activityId: number,
  equipmentId: number,
): Promise<ActivityEquipmentRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/equipment/${equipmentId}/approve/`,
  );
  return data;
}

export async function requestActivityEquipmentChanges(
  projectId: number,
  activityId: number,
  equipmentId: number,
  note: string,
): Promise<ActivityEquipmentRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/equipment/${equipmentId}/request-changes/`,
    { note },
  );
  return data;
}

// --- Tools ---

export async function listActivityTools(
  projectId: number,
  activityId: number,
): Promise<ActivityToolRequirement[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/tools/`,
  );
  return data.results ?? data;
}

export async function addActivityTool(
  projectId: number,
  activityId: number,
  payload: ActivityToolPayload,
): Promise<ActivityToolRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/tools/`,
    payload,
  );
  return data;
}

export async function removeActivityTool(
  projectId: number,
  activityId: number,
  toolId: number,
) {
  await api.delete(
    `/planning/projects/${projectId}/activities/${activityId}/tools/${toolId}/`,
  );
}

export async function submitActivityTool(
  projectId: number,
  activityId: number,
  toolId: number,
): Promise<ActivityToolRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/tools/${toolId}/submit/`,
  );
  return data;
}

export async function approveActivityTool(
  projectId: number,
  activityId: number,
  toolId: number,
): Promise<ActivityToolRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/tools/${toolId}/approve/`,
  );
  return data;
}

export async function requestActivityToolChanges(
  projectId: number,
  activityId: number,
  toolId: number,
  note: string,
): Promise<ActivityToolRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/tools/${toolId}/request-changes/`,
    { note },
  );
  return data;
}

// --- PPE & Safety ---

export async function listActivityPPE(
  projectId: number,
  activityId: number,
): Promise<ActivityPPERequirement[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/ppe/`,
  );
  return data.results ?? data;
}

export async function addActivityPPE(
  projectId: number,
  activityId: number,
  payload: ActivityPPEPayload,
): Promise<ActivityPPERequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/ppe/`,
    payload,
  );
  return data;
}

export async function removeActivityPPE(
  projectId: number,
  activityId: number,
  ppeId: number,
) {
  await api.delete(
    `/planning/projects/${projectId}/activities/${activityId}/ppe/${ppeId}/`,
  );
}

export async function submitActivityPPE(
  projectId: number,
  activityId: number,
  ppeId: number,
): Promise<ActivityPPERequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/ppe/${ppeId}/submit/`,
  );
  return data;
}

export async function approveActivityPPE(
  projectId: number,
  activityId: number,
  ppeId: number,
): Promise<ActivityPPERequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/ppe/${ppeId}/approve/`,
  );
  return data;
}

export async function requestActivityPPEChanges(
  projectId: number,
  activityId: number,
  ppeId: number,
  note: string,
): Promise<ActivityPPERequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/ppe/${ppeId}/request-changes/`,
    { note },
  );
  return data;
}

// --- Services / Subcontracting ---

export async function listActivityServices(
  projectId: number,
  activityId: number,
): Promise<ActivityServiceRequirement[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/services/`,
  );
  return data.results ?? data;
}

export async function addActivityService(
  projectId: number,
  activityId: number,
  payload: ActivityServicePayload,
): Promise<ActivityServiceRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/services/`,
    payload,
  );
  return data;
}

export async function removeActivityService(
  projectId: number,
  activityId: number,
  serviceId: number,
) {
  await api.delete(
    `/planning/projects/${projectId}/activities/${activityId}/services/${serviceId}/`,
  );
}

export async function submitActivityService(
  projectId: number,
  activityId: number,
  serviceId: number,
): Promise<ActivityServiceRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/services/${serviceId}/submit/`,
  );
  return data;
}

export async function approveActivityService(
  projectId: number,
  activityId: number,
  serviceId: number,
): Promise<ActivityServiceRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/services/${serviceId}/approve/`,
  );
  return data;
}

export async function requestActivityServiceChanges(
  projectId: number,
  activityId: number,
  serviceId: number,
  note: string,
): Promise<ActivityServiceRequirement> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/services/${serviceId}/request-changes/`,
    { note },
  );
  return data;
}

// --- Requirement Groups ---

export async function listRequirementGroups(
  projectId: number,
  activityId: number,
): Promise<RequirementGroup[]> {
  const { data } = await api.get(
    `/planning/projects/${projectId}/activities/${activityId}/requirement-groups/`,
  );
  return data.results ?? data;
}

export async function updateRequirementGroup(
  projectId: number,
  activityId: number,
  groupId: number,
  payload: Partial<
    Pick<
      RequirementGroup,
      | "responsible"
      | "required_on_site"
      | "procurement_deadline"
      | "alert_days_before"
    >
  >,
): Promise<RequirementGroup> {
  const { data } = await api.patch(
    `/planning/projects/${projectId}/activities/${activityId}/requirement-groups/${groupId}/`,
    payload,
  );
  return data;
}

export async function markRequirementGroupNotRequired(
  projectId: number,
  activityId: number,
  groupId: number,
): Promise<RequirementGroup> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/requirement-groups/${groupId}/mark-not-required/`,
  );
  return data;
}

export async function reopenRequirementGroup(
  projectId: number,
  activityId: number,
  groupId: number,
): Promise<RequirementGroup> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/requirement-groups/${groupId}/reopen/`,
  );
  return data;
}

export async function approveRequirementGroup(
  projectId: number,
  activityId: number,
  groupId: number,
): Promise<RequirementGroup> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/requirement-groups/${groupId}/approve/`,
  );
  return data;
}

export async function requestRequirementGroupChanges(
  projectId: number,
  activityId: number,
  groupId: number,
  note: string,
): Promise<RequirementGroup> {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/requirement-groups/${groupId}/request-changes/`,
    { note },
  );
  return data;
}

export async function assignPlanner(
  projectId: number,
  activityId: number,
  userId: number,
) {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/assign-planner/`,
    { user: userId },
  );
  return data as Activity;
}

export async function submitPlanning(projectId: number, activityId: number) {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/submit-planning/`,
  );
  return data as Activity;
}

export async function approvePlanning(
  projectId: number,
  activityId: number,
  tier: "pm" | "qs",
  budgetAmount?: number,
) {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/approve-planning/`,
    { tier, budget_amount: budgetAmount },
  );
  return data as Activity;
}

export async function requestPlanningChanges(
  projectId: number,
  activityId: number,
  note: string,
) {
  const { data } = await api.post(
    `/planning/projects/${projectId}/activities/${activityId}/request-changes/`,
    { note },
  );
  return data as Activity;
}
