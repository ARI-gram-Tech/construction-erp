// frontend/src/components/Layouts/Projects/ProjectNotificationBell.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { listProjectNotifications, markAsRead } from "@/services/notifications";
import type { AppNotification } from "@/types/notification";

interface ProjectNotificationBellProps {
  projectId: string;
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function levelDot(level: AppNotification["level"]) {
  switch (level) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-blue-500";
  }
}

export function ProjectNotificationBell({
  projectId,
}: ProjectNotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.is_read).length;

  async function refresh() {
    setLoading(true);
    try {
      const all = await listProjectNotifications(Number(projectId));
      // Falls back to link-matching if the backend doesn't support the
      // `project` filter yet (Option A) — harmless once Option B lands,
      // since the API will have already done the filtering.
      const scoped = all.filter(
        (n) => n.link?.includes(`/projects/${projectId}`) || all !== null,
      );
      setItems(scoped);
    } catch {
      // fail quietly — a broken bell shouldn't break the whole header
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleItemClick(n: AppNotification) {
    if (!n.is_read) {
      try {
        await markAsRead(n.id);
        setItems((prev) =>
          prev.map((item) =>
            item.id === n.id ? { ...item, is_read: true } : item,
          ),
        );
      } catch {
        // ignore — non-critical
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-steel-100/80 transition-colors text-steel-500 hover:text-steel-700"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-steel-200/50 py-1.5 z-50">
          <div className="px-4 py-2 border-b border-steel-200/50">
            <p className="text-sm font-semibold text-steel-900">
              Project notifications
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-steel-400">
                Loading…
              </p>
            )}

            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-steel-400">
                Nothing needs attention on this project.
              </p>
            )}

            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left text-sm hover:bg-steel-50 transition-colors ${
                  n.is_read ? "" : "bg-primary-50/40"
                }`}
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${levelDot(n.level)}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-steel-800">
                    {n.title}
                  </span>
                  {n.message && (
                    <span className="block text-steel-600">{n.message}</span>
                  )}
                  <span className="block text-xs text-steel-400 mt-0.5">
                    {timeAgo(n.created_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
