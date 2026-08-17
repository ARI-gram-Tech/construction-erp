import { ShieldOff } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface RoleGateProps {
  roles: string[];
  sectionName: string; // shown in the not-authorized message, e.g. "Procurement"
  children: React.ReactNode;
}

/**
 * Wraps a page/section and only renders it if the current user's role
 * is in `roles`. Unlike hiding a sidebar link (which only stops
 * accidental discovery), this actually blocks the page itself —
 * someone typing the URL directly, or bookmarking it, gets a clear
 * "not authorized" message instead of the real page contents.
 *
 * Shows nothing while the user is still loading, to avoid a flash of
 * the denied message before we actually know their role.
 */
export function RoleGate({ roles, sectionName, children }: RoleGateProps) {
  const { data: user, loading } = useCurrentUser();

  if (loading) return null;

  const role = user?.role ?? "";
  if (!roles.includes(role)) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-steel-300 p-10 text-center max-w-md mx-auto mt-8">
        <ShieldOff size={28} className="text-steel-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-steel-900 mb-1">
          You don't have access to {sectionName}
        </h2>
        <p className="text-sm text-steel-500">
          This section isn't part of your role on this project. If you believe
          this is a mistake, ask your Project Manager or company admin.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
