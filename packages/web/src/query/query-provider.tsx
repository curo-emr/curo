"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiErrorStatus } from "../api/errors";
import { readStoredUser, subscribeToSession } from "../session";

// A 4xx answer won't change on a retry (a 404 stays not found), so only a network
// error or a 5xx gets one more try before the screen says it couldn't load.
function retryOnce(failureCount: number, error: unknown) {
  const status = apiErrorStatus(error);
  return failureCount < 1 && (status === undefined || status >= 500);
}

/**
 * Cached data shows at once when a screen opens again and is refreshed in the
 * background (staleTime stays 0), so a screen never trusts a stale copy of a
 * patient's record.
 */
export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: retryOnce } } });
}

const signedInUserId = () => (readStoredUser() as { id?: string } | null)?.id ?? null;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  // The cache belongs to whoever is signed in. When that changes (signing out, or
  // another account signing in from another tab), drop it, so the next user never
  // sees the last one's patients.
  useEffect(() => {
    let userId = signedInUserId();
    return subscribeToSession(() => {
      const next = signedInUserId();
      if (next === userId) return;
      userId = next;
      client.clear();
    });
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
