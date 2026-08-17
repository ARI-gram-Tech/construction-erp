// /frontend/src/services/notifications.ts
import { api } from "./api";
import type { AppNotification } from "../types/notification";

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get("/notifications/");
  return data.results ?? data;
}

// Used by the project header bell — relies on the `?project=` filter
// added to MyNotificationsView.get_queryset().
export async function listProjectNotifications(
  projectId: number,
): Promise<AppNotification[]> {
  const { data } = await api.get("/notifications/", {
    params: { project: projectId },
  });
  return data.results ?? data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get("/notifications/unread-count/");
  return data.count;
}

export async function markAsRead(id: number) {
  const { data } = await api.post(`/notifications/${id}/read/`);
  return data;
}
