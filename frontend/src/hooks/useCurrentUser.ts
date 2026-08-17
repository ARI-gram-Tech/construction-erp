// /src/hooks/useCurrentUser.ts
import { useAuth } from "@/context/AuthContext";

/**
 * Thin wrapper over the shared AuthContext, kept so any existing code
 * calling useCurrentUser() doesn't need to change — it now reads the
 * one session-wide /me/ fetch instead of firing its own.
 */
export function useCurrentUser() {
  const { user, loading, error, reload } = useAuth();
  return { data: user, loading, error, reload };
}
