import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { POLL_INBOX_MS, POLL_QUEUE_MS } from "@curo/web/query";
import { getAllergies, getConditions, getPatientById, getPatients, getPatientsByIds, getPatientsPaginated } from "@/lib/api/patients";
import { getAppointments } from "@/lib/api/appointments";
import { getLabCatalog, getOrganizations, getPharmacyStock } from "@/lib/api/directory";
import { getPractitioners } from "@/lib/api/practitioners";
import { getOpenTasks } from "@/lib/api/tasks";
import { getEncounterById, getEncountersByPatient } from "@/lib/api/encounters";
import {
  getEncounterSoap, getEncounterVitals, getLabOrdersByPatient, getLatestVitals, getObservationTrends,
  getPrescriptionsByPatient, getRecentLabResults,
} from "@/lib/api/clinical";
import { getDocumentsByPatient } from "@/lib/api/documents";
import { getLabTestCatalog } from "@/lib/api/catalog";
import { getICD10Paginated } from "@/lib/api/icd";
import { getLabSlipQr, getLabs, getVisitLabReports } from "@/lib/api/labs";
import { searchMedications } from "@/lib/api/medications";
import { findTodaysAppointment } from "@/lib/visit";
import type { Appointment } from "@/types";

// Every query the portal makes, keyed so that one invalidation refreshes everything
// a write changes: ["patients", id] covers all of that patient's record, and
// ["appointments"] every queue and schedule.

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

  /** Patients matching a name, MRN, phone or NIC. Keeps the last results while the next search loads. */
  search: (text: string) => queryOptions({
    queryKey: [...patientQueries.all, "search", text],
    queryFn: () => getPatients(text),
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
  /** Every document on file; a new upload refreshes it. */
  documents: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "documents"],
    queryFn: () => getDocumentsByPatient(patientId),
  }),
  /** Readings over time for the given observation codes. */
  trends: (patientId: string, codes: string[]) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "trends", codes],
    queryFn: () => getObservationTrends(patientId, codes),
  }),
  latestVitals: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "latest-vitals"],
    queryFn: () => getLatestVitals(patientId),
  }),
};

/** One signed visit. Its keys sit under the patient's record, so signing or refreshing the patient covers them. */
export const visitQueries = {
  key: (patientId: string, encounterId: string) => [...patientQueries.record(patientId), "encounters", encounterId] as const,

  encounter: (patientId: string, encounterId: string) => queryOptions({
    queryKey: visitQueries.key(patientId, encounterId),
    queryFn: () => getEncounterById(encounterId),
  }),
  // SOAP notes and vitals are stored apart from the encounter.
  soap: (patientId: string, encounterId: string) => queryOptions({
    queryKey: [...visitQueries.key(patientId, encounterId), "soap"],
    queryFn: () => getEncounterSoap(encounterId),
  }),
  vitals: (patientId: string, encounterId: string) => queryOptions({
    queryKey: [...visitQueries.key(patientId, encounterId), "vitals"],
    queryFn: () => getEncounterVitals(patientId, encounterId),
  }),
  labReports: (patientId: string, encounterId: string) => queryOptions({
    queryKey: [...visitQueries.key(patientId, encounterId), "lab-reports"],
    queryFn: () => getVisitLabReports(encounterId),
  }),
  labSlipQr: (patientId: string, encounterId: string) => queryOptions({
    queryKey: [...visitQueries.key(patientId, encounterId), "lab-slip-qr"],
    queryFn: () => getLabSlipQr(encounterId),
    staleTime: Infinity,
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

  /** Appointments in a date range, such as a calendar month. Keeps the last month while the next loads. */
  range: (from: string, to: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "range", from, to],
    queryFn: () => getAppointments({ from, to }),
    placeholderData: keepPreviousData,
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
  /** A page of ICD-10 codes. Keeps the last page on screen while the next loads. */
  icd10: (params: Parameters<typeof getICD10Paginated>[0]) => queryOptions({
    queryKey: ["icd10", params],
    queryFn: () => getICD10Paginated(params),
    placeholderData: keepPreviousData,
    staleTime: CATALOG_STALE_MS,
  }),
  labs: (includeInactive = false) => queryOptions({
    queryKey: ["labs", { includeInactive }],
    queryFn: () => getLabs({ includeInactive }),
    staleTime: CATALOG_STALE_MS,
  }),
};

export const directoryQueries = {
  organizations: (type: "pharmacy" | "laboratory") => queryOptions({
    queryKey: ["directory", type],
    queryFn: () => getOrganizations(type),
    staleTime: CATALOG_STALE_MS,
  }),
  pharmacyStock: (organizationId: string) => queryOptions({
    queryKey: ["directory", "pharmacy", organizationId, "stock"],
    queryFn: () => getPharmacyStock(organizationId),
  }),
  labCatalog: (organizationId: string) => queryOptions({
    queryKey: ["directory", "laboratory", organizationId, "tests"],
    queryFn: () => getLabCatalog(organizationId),
    staleTime: CATALOG_STALE_MS,
  }),
};

export const practitionerQueries = {
  byRole: (role: string) => queryOptions({
    queryKey: ["practitioners", role],
    queryFn: () => getPractitioners(role),
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
