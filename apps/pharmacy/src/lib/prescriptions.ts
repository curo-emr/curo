import type { Prescription } from "@/types";

/** One patient's prescriptions waiting to be dispensed. A doctor's visit sends one per medicine. */
export interface WaitingPatient {
  patientId: string;
  /** Oldest first. */
  prescriptions: Prescription[];
  /** When the oldest of them was sent. */
  since: string;
}

const oldestFirst = (a: Prescription, b: Prescription) => a.createdAt.localeCompare(b.createdAt);

/** Waiting prescriptions grouped by patient, whoever has waited longest first. */
export function waitingByPatient(prescriptions: Prescription[]): WaitingPatient[] {
  const byPatient = new Map<string, Prescription[]>();
  for (const rx of [...prescriptions].sort(oldestFirst)) {
    byPatient.set(rx.patientId, [...(byPatient.get(rx.patientId) ?? []), rx]);
  }
  return [...byPatient].map(([patientId, rxs]) => ({ patientId, prescriptions: rxs, since: rxs[0].createdAt }));
}

/** What a prescription is for, e.g. "Amlodipine 5mg". */
export const medicineName = (rx: Prescription) => rx.items.map(i => i.displayName).join(", ");
