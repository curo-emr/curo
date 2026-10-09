import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { POLL_INBOX_MS } from "@curo/web/query";
import { getAllergies, getPatientById, getPatientsByIds } from "@/lib/api/patients";
import {
  getDispenseSummary, getDispensingRecordsByPatient, getDispensingRecordsByPrescription, getDispensingRecordsPage,
  getGroupedStock, getLowStockAlerts, getPendingPrescriptions, getPrescription, getPrescriptionsByPatient, getStock,
} from "@/lib/api/pharmacy";
import type { Prescription } from "@/types";

// Every query the portal makes, keyed so that one invalidation refreshes everything
// a dispense changes: ["patients", id] covers all of that patient's record.

const newestFirst = (rxs: Prescription[]) => [...rxs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const patientQueries = {
  all: ["patients"] as const,
  record: (patientId: string) => [...patientQueries.all, patientId] as const,

  /** Patients by id, as a lookup for lists that name them. Keeps the last lookup while one more name loads. */
  byIds: (ids: string[]) => queryOptions({
    queryKey: [...patientQueries.all, "by-ids", [...new Set(ids)].sort()],
    queryFn: () => getPatientsByIds(ids),
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
  prescriptions: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "prescriptions"],
    queryFn: () => getPrescriptionsByPatient(patientId),
    select: newestFirst,
  }),
  /** Dispenses from every pharmacy, so the history is whole. */
  dispensing: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "dispensing"],
    queryFn: () => getDispensingRecordsByPatient(patientId),
  }),
};

export const prescriptionQueries = {
  all: ["prescriptions"] as const,

  /** Prescriptions waiting to be dispensed; new ones arrive while the list is open. */
  pending: () => queryOptions({
    queryKey: [...prescriptionQueries.all, "pending"],
    queryFn: getPendingPrescriptions,
    refetchInterval: POLL_INBOX_MS,
  }),
  detail: (prescriptionId: string) => queryOptions({
    queryKey: [...prescriptionQueries.all, prescriptionId],
    queryFn: () => getPrescription(prescriptionId),
  }),
  dispensing: (prescriptionId: string) => queryOptions({
    queryKey: [...prescriptionQueries.all, prescriptionId, "dispensing"],
    queryFn: () => getDispensingRecordsByPrescription(prescriptionId),
  }),
};

export const dispensingQueries = {
  all: ["dispensing"] as const,
  /** This pharmacy's latest dispenses. */
  recent: (limit: number) => queryOptions({
    queryKey: [...dispensingQueries.all, "recent", limit],
    queryFn: async () => (await getDispensingRecordsPage({ page: 1, pageSize: limit })).items,
  }),
  summary: () => queryOptions({
    queryKey: [...dispensingQueries.all, "summary"],
    queryFn: getDispenseSummary,
  }),
};

export const stockQueries = {
  all: ["stock"] as const,
  /** Every batch. */
  batches: () => queryOptions({
    queryKey: [...stockQueries.all, "batches"],
    queryFn: getStock,
  }),
  /** Batches grouped by drug, FEFO-first. */
  grouped: () => queryOptions({
    queryKey: [...stockQueries.all, "grouped"],
    queryFn: getGroupedStock,
  }),
  lowStock: () => queryOptions({
    queryKey: [...stockQueries.all, "low"],
    queryFn: getLowStockAlerts,
  }),
};

/** After a dispense: the prescription, the patient's record, the dispensing log and the stock all changed. */
export function invalidateAfterDispense(client: QueryClient, patientId: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: prescriptionQueries.all }),
    client.invalidateQueries({ queryKey: patientQueries.record(patientId) }),
    client.invalidateQueries({ queryKey: dispensingQueries.all }),
    client.invalidateQueries({ queryKey: stockQueries.all }),
  ]);
}
