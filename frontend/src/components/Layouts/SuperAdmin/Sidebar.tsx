// frontend/src/components/layouts/SuperAdmin/Sidebar.tsx
import { SidebarLink } from "../SidebarLink";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  LifeBuoy,
  FileText,
  Settings,
  HelpCircle,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/super-admin/dashboard", icon: LayoutDashboard },
  { label: "Users", path: "/super-admin/users", icon: Users },
  {
    label: "Subscriptions",
    path: "/super-admin/subscriptions",
    icon: CreditCard,
  },
  { label: "Billing", path: "/super-admin/billing", icon: Receipt },
  { label: "Support", path: "/super-admin/support", icon: LifeBuoy },
  { label: "Audit Logs", path: "/super-admin/audit-logs", icon: FileText },
];

const bottomNavItems = [
  { label: "Settings", path: "/super-admin/settings", icon: Settings },
  { label: "Help", path: "/super-admin/help", icon: HelpCircle },
];

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-steel-200/70 flex flex-col shadow-sm">
      {/* Brand Section */}
      <div className="px-6 py-6 border-b border-steel-200/50">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl  bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-orange-500/20">
            A
          </div>
          <div>
            <p className="font-semibold text-lg tracking-tight text-steel-900">
              ARIGram
            </p>
            <p className="text-xs text-steel-500 font-medium tracking-wide uppercase">
              Platform Admin
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarLink
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <nav className="px-3 py-4 border-t border-steel-200/50 space-y-1">
        {bottomNavItems.map((item) => (
          <SidebarLink
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-steel-200/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stele-400">v2.0.0</span>
          <span className="text-steel-400">© 2026</span>
        </div>
      </div>
    </aside>
  );
}
