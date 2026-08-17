import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Wraps any protected layout. If the logged-in user still has a
 * temporary password (must_change_password), they're bounced to
 * /change-password no matter what URL they try to load directly —
 * closes the gap where someone could skip the login-time redirect
 * by just typing /company/dashboard straight into the address bar.
 *
 * Reads from the shared AuthContext (one /me/ fetch per session)
 * rather than firing its own request per layout mount.
 */
export function PasswordGateway({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // parent layout already shows its own spinner on first paint

  if (user?.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" state={{ forced: true }} replace />;
  }

  return <>{children}</>;
}
