import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getTotal } from "@curo/web/api";
import { POLL_QUEUE_MS } from "@curo/web/query";
import { getAllergies, getPatientById, getPatientsByIds, searchPatients } from "@/lib/api/patients";
import { getAppointments, getSchedule } from "@/lib/api/appointments";
import { getDoctors } from "@/lib/api/practitioners";
import { getIncomeSummary } from "@/lib/api/payments";
import { QUEUE_STAGES } from "@/lib/queue";
import type { Appointment } from "@/types";

// Every query the portal makes, keyed so that one invalidation refreshes everything
// a write changes: ["patients", id] covers all of that patient's record, and
// ["appointments"] every queue, schedule and report.

const byTime = (appts: Appointment[]) => [...appts].sort((a, b) => a.time.localeCompare(b.time));

export const patientQueries = {
  all: ["patients"] as const,
  record: (patientId: string) => [...patientQueries.all, patientId] as const,

  /** Patients by id, as a lookup for lists that name them. Keeps the last lookup while one more name loads. */
  byIds: (ids: string[]) => queryOptions({
    queryKey: [...patientQueries.all, "by-ids", [...new Set(ids)].sort()],
    queryFn: () => getPatientsByIds(ids),
    placeholderData: keepPreviousData,
  }),
  /** The first `limit` patients matching a name, MRN, PHN, NIC or phone. */
  search: (text: string, limit: number) => queryOptions({
    queryKey: [...patientQueries.all, "search", text, limit],
    queryFn: () => searchPatients(text, limit),
  }),
  /** How many patients registered between two dates. */
  registeredCount: (from: string, to: string) => queryOptions({
    queryKey: [...patientQueries.all, "registered", from, to],
    queryFn: () => getTotal("/patients", { registeredFrom: from, registeredTo: to }),
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
};

export const appointmentQueries = {
  all: ["appointments"] as const,

  /** One day's appointments in time order, refreshed while the desk works through them. */
  day: (date: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "day", date],
    queryFn: () => getAppointments({ date }),
    select: byTime,
    refetchInterval: POLL_QUEUE_MS,
  }),
  /** The day's checked-in patients, refreshed while the queue board is open. */
  queue: (date: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "queue", date],
    queryFn: () => getAppointments({ date, queueStage: QUEUE_STAGES.join(",") }),
    refetchInterval: POLL_QUEUE_MS,
  }),
  /** Appointments in a date range, such as a calendar month. Keeps the last range while the next loads. */
  range: (from: string, to: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "range", from, to],
    queryFn: () => getAppointments({ from, to }),
    placeholderData: keepPreviousData,
  }),
  forPatient: (patientId: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "patient", patientId],
    queryFn: () => getAppointments({ patientId }),
  }),
  /** A doctor's appointments on a day, to show which slots are taken. */
  schedule: (doctorId: string, date: string) => queryOptions({
    queryKey: [...appointmentQueries.all, "schedule", doctorId, date],
    queryFn: () => getSchedule(doctorId, date),
  }),
};

/** Reference lists that change rarely, so they are kept for a few minutes. */
const DIRECTORY_STALE_MS = 5 * 60_000;

export const doctorQueries = {
  all: () => queryOptions({
    queryKey: ["doctors"],
    queryFn: getDoctors,
    staleTime: DIRECTORY_STALE_MS,
  }),
};

export const paymentQueries = {
  all: ["payments"] as const,
  income: (period: Parameters<typeof getIncomeSummary>[0]) => queryOptions({
    queryKey: [...paymentQueries.all, "income", period],
    queryFn: () => getIncomeSummary(period),
  }),
};

/** After a check-in, booking or status change: every queue, schedule and report. */
export const invalidateAppointments = (client: QueryClient) =>
  client.invalidateQueries({ queryKey: appointmentQueries.all });
