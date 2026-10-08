import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getAllergies, getConditions, getPatientById, getPatientsPaginated } from "@/lib/api/patients";
import { getEncountersByPatient } from "@/lib/api/encounters";
import { getLabOrdersByPatient, getLatestVitals, getPrescriptionsByPatient } from "@/lib/api/clinical";
import { getLabTestCatalog } from "@/lib/api/catalog";
import { getLabs } from "@/lib/api/labs";
import { searchMedications } from "@/lib/api/medications";
import { findTodaysAppointment } from "@/lib/visit";

// Every query the portal makes, keyed so that one invalidation refreshes everything
// a write changes: ["patients", id] covers all of that patient's record, and
// ["appointments"] every queue and schedule.

const byDate = <T,>(key: (item: T) => string) => (items: T[]) => [...items].sort((a, b) => key(b).localeCompare(key(a)));

export const patientQueries = {
  all: ["patients"] as const,
  record: (patientId: string) => [...patientQueries.all, patientId] as const,

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

  /** The patient's open appointment today, which a visit started from the chart attaches to. */
  todaysFor: (patientId: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "today", patientId],
    queryFn: () => findTodaysAppointment(patientId),
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
