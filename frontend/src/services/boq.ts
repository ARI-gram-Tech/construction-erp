// /src/services/boq.ts
import { api } from "./api";
import { fetchAllPages } from "./pagination";
import type {
  BOQ,
  BOQPayload,
  BOQSection,
  BOQSectionPayload,
  BOQItem,
  BOQItemPayload,
  BOQRevision,
  Unit,
} from "@/types/boq";

const base = (projectId: number) => `/boq/projects/${projectId}/boqs`;

// --- BOQs ---

export async function listBOQs(projectId: number): Promise<BOQ[]> {
  return fetchAllPages<BOQ>(`${base(projectId)}/`);
}

export async function getBOQ(projectId: number, id: number): Promise<BOQ> {
  const { data } = await api.get(`${base(projectId)}/${id}/`);
  return data;
}

export async function createBOQ(
  projectId: number,
  payload: BOQPayload,
): Promise<BOQ> {
  const { data } = await api.post(`${base(projectId)}/`, payload);
  return data;
}

export async function updateBOQ(
  projectId: number,
  id: number,
  payload: Partial<BOQPayload>,
): Promise<BOQ> {
  const { data } = await api.patch(`${base(projectId)}/${id}/`, payload);
  return data;
}

export async function deleteBOQ(projectId: number, id: number): Promise<void> {
  await api.delete(`${base(projectId)}/${id}/`);
}

export async function duplicateBOQ(
  projectId: number,
  id: number,
): Promise<BOQ> {
  const { data } = await api.post(`${base(projectId)}/${id}/duplicate/`);
  return data;
}

// Reference Only — stores the file and creates a real (item-less) BOQ
// row with integration_mode='reference', so it shows up in the
// workspace like any other BOQ instead of only existing in Documents.
export async function createReferenceBOQ(
  projectId: number,
  file: File,
  title?: string,
): Promise<BOQ> {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const { data } = await api.post(`${base(projectId)}/reference/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// --- Revisions ---

export async function listRevisions(
  projectId: number,
  boqId: number,
): Promise<BOQRevision[]> {
  return fetchAllPages<BOQRevision>(`${base(projectId)}/${boqId}/revisions/`);
}

export async function createRevision(
  projectId: number,
  boqId: number,
  reason?: string,
): Promise<BOQRevision> {
  const { data } = await api.post(`${base(projectId)}/${boqId}/new-revision/`, {
    reason: reason ?? "",
  });
  return data;
}

// --- Sections ---

export async function listSections(
  projectId: number,
  boqId: number,
): Promise<BOQSection[]> {
  return fetchAllPages<BOQSection>(`${base(projectId)}/${boqId}/sections/`);
}

export async function createSection(
  projectId: number,
  boqId: number,
  payload: BOQSectionPayload,
): Promise<BOQSection> {
  const { data } = await api.post(
    `${base(projectId)}/${boqId}/sections/`,
    payload,
  );
  return data;
}

export async function updateSection(
  projectId: number,
  boqId: number,
  id: number,
  payload: Partial<BOQSectionPayload>,
): Promise<BOQSection> {
  const { data } = await api.patch(
    `${base(projectId)}/${boqId}/sections/${id}/`,
    payload,
  );
  return data;
}

export async function deleteSection(
  projectId: number,
  boqId: number,
  id: number,
): Promise<void> {
  await api.delete(`${base(projectId)}/${boqId}/sections/${id}/`);
}

// --- Items ---

export async function listItems(
  projectId: number,
  boqId: number,
): Promise<BOQItem[]> {
  return fetchAllPages<BOQItem>(`${base(projectId)}/${boqId}/items/`);
}

export async function createItem(
  projectId: number,
  boqId: number,
  payload: BOQItemPayload,
): Promise<BOQItem> {
  const { data } = await api.post(
    `${base(projectId)}/${boqId}/items/`,
    payload,
  );
  return data;
}

export async function updateItem(
  projectId: number,
  boqId: number,
  id: number,
  payload: Partial<BOQItemPayload>,
): Promise<BOQItem> {
  const { data } = await api.patch(
    `${base(projectId)}/${boqId}/items/${id}/`,
    payload,
  );
  return data;
}

export async function deleteItem(
  projectId: number,
  boqId: number,
  id: number,
): Promise<void> {
  await api.delete(`${base(projectId)}/${boqId}/items/${id}/`);
}

// --- Units (shared reference data, not project-scoped) ---

export async function listUnits(): Promise<Unit[]> {
  return fetchAllPages<Unit>("/boq/units/");
}

export async function listActivityBOQItems(
  projectId: number,
  activityId: number,
): Promise<BOQItem[]> {
  const { data } = await api.get(
    `/boq/projects/${projectId}/activities/${activityId}/boq-items/`,
  );
  return data.results ?? data;
}

export async function flagActivityBOQ(
  projectId: number,
  activityId: number,
  note: string,
  boqItemId?: number,
) {
  const { data } = await api.post(
    `/boq/projects/${projectId}/activities/${activityId}/boq-items/flag/`,
    { note, boq_item: boqItemId },
  );
  return data;
}
