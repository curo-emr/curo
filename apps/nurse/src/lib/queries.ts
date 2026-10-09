import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { POLL_QUEUE_MS } from "@curo/web/query";
import { getQueue } from "@/lib/api/appointments";
import { getPatientsByIds } from "@/lib/api/patients";
import { getPractitioners } from "@/lib/api/practitioners";
import type { QueueStage } from "@/types";

export const queueQueries = {
  all: ["queue"] as const,
  /** A day's appointments in the given stages, refreshed while the page is open. */
  day: (date: string, stages: readonly QueueStage[]) => queryOptions({
    queryKey: [...queueQueries.all, date, stages],
    queryFn: () => getQueue(date, stages),
    refetchInterval: POLL_QUEUE_MS,
  }),
};

export const patientQueries = {
  /** Patients by id, as a lookup for lists that name them. Keeps the last lookup while one more name loads. */
  byIds: (ids: string[]) => queryOptions({
    queryKey: ["patients", "by-ids", [...new Set(ids)].sort()],
    queryFn: () => getPatientsByIds(ids),
    placeholderData: keepPreviousData,
  }),
};

export const practitionerQueries = {
  /** Staff by role; the list changes rarely, so it is kept for a few minutes. */
  byRole: (role: string) => queryOptions({
    queryKey: ["practitioners", role],
    queryFn: () => getPractitioners(role),
    staleTime: 5 * 60_000,
  }),
};

/** After a queue action: every page's view of the queue. */
export const invalidateQueue = (client: QueryClient) => client.invalidateQueries({ queryKey: queueQueries.all });
