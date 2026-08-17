// /frontend/src/components/Notifications/NotificationDropdown.tsx
import { useEffect, useState } from "react";
import { Bell, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  listNotifications,
  markAsRead,
  getUnreadCount,
} from "@/services/notifications";
import type { AppNotification } from "@/types/notification";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const LEVEL_DOT: Record<string, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function refreshUnreadCount() {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // silently ignore — bell just won't show a badge
    }
  }

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  async function handleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setLoading(true);
      try {
        setNotifications(await listNotifications());
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleClick(notification: AppNotification) {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n,
        ),
      );
      refreshUnreadCount();
    }
    setIsOpen(false);
    if (notification.link) navigate(notification.link);
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-steel-100/80 transition-colors"
      >
        <Bell size={20} className="text-steel-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-steel-200/50 z-50 max-h-96 overflow-y-auto">
            <div className="px-4 py-3 border-b border-steel-200/50">
              <p className="text-sm font-semibold text-steel-900">
                Notifications
              </p>
            </div>

            {loading && (
              <p className="p-4 text-sm text-steel-500">Loading...</p>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-6 text-center">
                <CheckCircle
                  size={24}
                  className="text-steel-300 mx-auto mb-2"
                />
                <p className="text-sm text-steel-500">You're all caught up.</p>
              </div>
            )}

            {!loading &&
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-steel-100 last:border-0 hover:bg-steel-50 transition-colors ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${LEVEL_DOT[n.level] ?? "bg-steel-400"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-steel-900">
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-steel-500 mt-0.5">
                          {n.message}
                        </p>
                      )}
                      <p className="text-xs text-steel-400 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
