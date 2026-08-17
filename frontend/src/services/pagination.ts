// /src/services/pagination.ts
import { api } from "./api";

// DRF paginates at 25/page by default. Any list endpoint can silently
// return only the first 25 rows if you don't follow `next` — this bit
// inventory.ts already (80 stock items going missing). Centralizing it
// here so every new service gets the fix for free instead of each one
// needing to rediscover it independently.
interface PaginatedResponse<T> {
  results: T[];
  next: string | null;
}

export async function fetchAllPages<T>(url: string): Promise<T[]> {
  let results: T[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res = await api.get(nextUrl);
    const data = res.data as PaginatedResponse<T> | T[];

    if (Array.isArray(data)) {
      results = results.concat(data);
      nextUrl = null;
    } else {
      results = results.concat(data.results ?? []);
      nextUrl = data.next;
    }
  }

  return results;
}
