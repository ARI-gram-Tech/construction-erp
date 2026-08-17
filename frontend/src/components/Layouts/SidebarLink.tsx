// frontend/src/components/Layouts/SidebarLink.tsx
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface SidebarLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function SidebarLink({ to, label, icon: Icon }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-0.5 before:rounded-full before:transition-all before:duration-200",
          isActive
            ? "bg-orange-50 text-orange-700 before:bg-orange-500"
            : "text-steel-600 hover:bg-steel-100/80 hover:text-steel-900 hover:before:h-4 hover:before:bg-steel-400",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={2} className="shrink-0" />
          <span>{label}</span>
          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />
          )}
        </>
      )}
    </NavLink>
  );
}
