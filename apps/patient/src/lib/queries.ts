import { queryOptions } from "@tanstack/react-query";
import {
  getDoctors, getMyAllergies, getMyAppointments, getMyConditions, getMyEncounters, getMyLabOrders,
  getMyPrescriptions, getMyProfile,
} from "@/lib/api/patient-portal";
import { getMyDocuments } from "@/lib/api/documents";
import { getLabTestCatalog } from "@/lib/api/catalog";

// The signed-in patient's own record. Parts read by patient id take it from the profile.

/** Reference lists that change rarely, so they are kept for a few minutes. */
const DIRECTORY_STALE_MS = 5 * 60_000;

export const myQueries = {
  all: ["me"] as const,
  profile: () => queryOptions({
    queryKey: [...myQueries.all, "profile"],
    queryFn: getMyProfile,
  }),
  appointments: () => queryOptions({
    queryKey: [...myQueries.all, "appointments"],
    queryFn: getMyAppointments,
  }),
  documents: () => queryOptions({
    queryKey: [...myQueries.all, "documents"],
    queryFn: getMyDocuments,
  }),
  allergies: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "allergies", patientId],
    queryFn: () => getMyAllergies(patientId),
  }),
  conditions: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "conditions", patientId],
    queryFn: () => getMyConditions(patientId),
  }),
  prescriptions: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "prescriptions", patientId],
    queryFn: () => getMyPrescriptions(patientId),
  }),
  labOrders: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "lab-orders", patientId],
    queryFn: () => getMyLabOrders(patientId),
  }),
  encounters: (patientId: string) => queryOptions({
    queryKey: [...myQueries.all, "encounters", patientId],
    queryFn: () => getMyEncounters(patientId),
  }),
};

export const directoryQueries = {
  doctors: () => queryOptions({
    queryKey: ["doctors"],
    queryFn: getDoctors,
    staleTime: DIRECTORY_STALE_MS,
  }),
  labTests: () => queryOptions({
    queryKey: ["catalog", "lab-tests"],
    queryFn: () => getLabTestCatalog(),
    staleTime: DIRECTORY_STALE_MS,
  }),
};
