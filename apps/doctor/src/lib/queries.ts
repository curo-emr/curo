import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getAllergies, getConditions, getPatientById, getPatientsByIds, getPatientsPaginated } from "@/lib/api/patients";
import { getAppointments } from "@/lib/api/appointments";
import { getNotificationCount, getNotifications } from "@/lib/api/notifications";
import { getOpenTasks } from "@/lib/api/tasks";
import { getEncountersByPatient } from "@/lib/api/encounters";
import { getLabOrdersByPatient, getLatestVitals, getPrescriptionsByPatient, getRecentLabResults } from "@/lib/api/clinical";
import { getLabTestCatalog } from "@/lib/api/catalog";
import { getLabs } from "@/lib/api/labs";
import { searchMedications } from "@/lib/api/medications";
import { findTodaysAppointment } from "@/lib/visit";
import type { Appointment } from "@/types";

// Every query the portal makes, keyed so that one invalidation refreshes everything
// a write changes: ["patients", id] covers all of that patient's record, and
// ["appointments"] every queue and schedule.

// How often live lists refresh while the tab is visible (Doc 03 C3): queues
// move fast; the inbox and what needs attention less so.
const POLL_QUEUE_MS = 15_000;
const POLL_INBOX_MS = 30_000;

const byDate = <T,>(key: (item: T) => string) => (items: T[]) => [...items].sort((a, b) => key(b).localeCompare(key(a)));

export const patientQueries = {
  all: ["patients"] as const,
  record: (patientId: string) => [...patientQueries.all, patientId] as const,

  /** Patients by id, as a lookup for lists that name them. Keeps the last lookup while one more name loads. */
  byIds: (ids: string[]) => queryOptions({
    queryKey: [...patientQueries.all, "by-ids", [...new Set(ids)].sort()],
    queryFn: () => getPatientsByIds(ids),
    placeholderData: keepPreviousData,
  }),

  /** A page of the register. Keeps the last page on screen while the next loads; never for one patient's data. */
  page: (params: Parameters<typeof getPatientsPaginated>[0]) => queryOptions({
    queryKey: [...patientQueries.all, "page", params],
    queryFn: () => getPatientsPaginated(params),
    placeholderData: keepPreviousData,
  }),

  detail: (patientId: string) => queryOptions({
    queryKey: patientQueries.record(patientId),
    queryFn: () => getPatientById(patientId),
  }),
  allergies: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "allergies"],
    queryFn: () => getAllergies(patientId),
  }),
  conditions: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "conditions"],
    queryFn: () => getConditions(patientId),
  }),
  encounters: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "encounters"],
    queryFn: () => getEncountersByPatient(patientId),
    select: byDate(e => e.startedAt),
  }),
  labOrders: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "lab-orders"],
    queryFn: () => getLabOrdersByPatient(patientId),
    select: byDate(o => o.createdAt),
  }),
  prescriptions: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "prescriptions"],
    queryFn: () => getPrescriptionsByPatient(patientId),
  }),
  latestVitals: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "latest-vitals"],
    queryFn: () => getLatestVitals(patientId),
  }),
};

export const appointmentQueries = {
  all: ["appointments"] as const,

  /** One day's appointments in time order, refreshed while the queue moves. */
  day: (date: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "day", date],
    queryFn: () => getAppointments({ date }),
    select: (appts: Appointment[]) => appts.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    refetchInterval: POLL_QUEUE_MS,
  }),

  /** The patient's open appointment today, which a visit started from the chart attaches to. */
  todaysFor: (patientId: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "today", patientId],
    queryFn: () => findTodaysAppointment(patientId),
  }),
};

export const taskQueries = {
  all: ["tasks"] as const,
  open: () => queryOptions({
    queryKey: [...taskQueries.all, "open"],
    queryFn: getOpenTasks,
    refetchInterval: POLL_INBOX_MS,
  }),
};

export const labResultQueries = {
  /** Results returned to this doctor in the last week; none for an account with no practitioner record. */
  recent: (practitionerId: string | null | undefined) => queryOptions({
    queryKey: ["lab-results", practitionerId ?? null],
    queryFn: () => (practitionerId ? getRecentLabResults(practitionerId) : []),
    refetchInterval: POLL_INBOX_MS,
  }),
};

export const notificationQueries = {
  all: ["notifications"] as const,
  unreadCount: () => queryOptions({
    queryKey: [...notificationQueries.all, "count"],
    queryFn: getNotificationCount,
    refetchInterval: POLL_INBOX_MS,
  }),
  latest: () => queryOptions({
    queryKey: [...notificationQueries.all, "latest"],
    queryFn: () => getNotifications(),
  }),
};

/** Reference lists that change rarely, so they are kept for a few minutes. */
const CATALOG_STALE_MS = 5 * 60_000;

export const catalogQueries = {
  /** Offered in the prescription search before the doctor types. */
  medicationSuggestions: () => queryOptions({
    queryKey: ["medications", "suggestions"],
    queryFn: () => searchMedications("", 6),
    staleTime: CATALOG_STALE_MS,
  }),
  labTests: () => queryOptions({
    queryKey: ["catalog", "lab-tests"],
    queryFn: () => getLabTestCatalog(),
    staleTime: CATALOG_STALE_MS,
  }),
  /** With `includeInactive`, closed labs too, to name the labs of past orders. */
  labs: (includeInactive = false) => queryOptions({
    queryKey: ["labs", { includeInactive }],
    queryFn: () => getLabs({ includeInactive }),
    staleTime: CATALOG_STALE_MS,
  }),
};

/** After a visit is signed: the patient's record changed, and so did the queue. */
export function invalidateAfterVisit(client: QueryClient, patientId: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: patientQueries.record(patientId) }),
    client.invalidateQueries({ queryKey: appointmentQueries.all }),
  ]);
}
