// /hooks/useFetch.ts
import { useCallback, useEffect, useState } from "react";

/**
 * Generic data-fetching hook. Handles loading/error state and exposes
 * a `reload()` function so components can refresh after an action
 * (approve, suspend, delete, etc.) without duplicating fetch logic.
 *
 * Usage:
 *   const { data, loading, error, reload } = useFetch(() => listCompanies())
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Failed to load data. You may not have permission to view this.",
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}
