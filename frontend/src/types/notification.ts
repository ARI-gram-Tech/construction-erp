export interface AppNotification {
  id: number;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  link: string;
  project: number | null;
  is_read: boolean;
  created_at: string;
}
