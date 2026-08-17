// /src/context/AuthContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, type CurrentUser } from "@/services/auth";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  reload: async () => {},
});

/**
 * Fetches /accounts/me/ exactly once per session at app startup (and
 * whenever reload() is explicitly called, e.g. right after login).
 * Every layout reads from this shared context instead of each firing
 * its own /me/ request — one network call instead of one per layout.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCurrentUser();
      setUser(data);
    } catch (err: any) {
      setUser(null);
      setError(err?.response?.data?.detail || "Failed to load current user.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AuthContext.Provider value={{ user, loading, error, reload: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
