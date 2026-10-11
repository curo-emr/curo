import { queryOptions } from "@tanstack/react-query";
import {
  getDoctors, getMyAllergies, getMyAppointments, getMyConditions, getMyLabReports, getMyLabTests, getMyMedicines,
  getMyProfile, getMyVisits, getPharmacies,
} from "@/lib/api/patient-portal";
import { getMyDocuments } from "@/lib/api/documents";

// The signed-in patient's own record. Parts read by patient id take it from the profile.

/** Reference lists that change rarely, so they are kept for a few minutes. */
const DIRECTORY_STALE_MS = 5 * 60_000;

export const myQueries = {
  all: ["me"] as const,
  profile: () => queryOptions({ queryKey: [...myQueries.all, "profile"], queryFn: getMyProfile }),
  appointments: () => queryOptions({ queryKey: [...myQueries.all, "appointments"], queryFn: getMyAppointments }),
  documents: () => queryOptions({ queryKey: [...myQueries.all, "documents"], queryFn: getMyDocuments }),
  allergies: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "allergies", patientId],
    queryFn: () => getMyAllergies(patientId),
  }),
  conditions: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "conditions", patientId],
    queryFn: () => getMyConditions(patientId),
  }),
  medicines: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "medicines", patientId],
    queryFn: () => getMyMedicines(patientId),
  }),
  labTests: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "lab-tests", patientId],
    queryFn: () => getMyLabTests(patientId),
  }),
  labReports: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "lab-reports", patientId],
    queryFn: () => getMyLabReports(patientId),
  }),
  visits: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "visits", patientId],
    queryFn: () => getMyVisits(patientId),
  }),
};

export const directoryQueries = {
  doctors: () => queryOptions({ queryKey: ["doctors"], queryFn: getDoctors, staleTime: DIRECTORY_STALE_MS }),
  pharmacies: () => queryOptions({ queryKey: ["pharmacies"], queryFn: getPharmacies, staleTime: DIRECTORY_STALE_MS }),
};
