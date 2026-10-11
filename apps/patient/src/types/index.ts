// The signed-in patient's own record, as the patient portal shows it.

export type { Allergy, LabReport, LabResultValue } from '@curo/web/fhir';

export interface Patient {
  id: string;
  /** The clinic's patient number. */
  mrn: string;
  phn: string;
  nic: string;
  name: { first: string; last: string; full: string };
  dob: string;
  sex: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: { name: string; relationship: string; phone: string };
}

export interface Condition {
  id: string;
  name: string;
  icdCode: string;
  status: 'active' | 'resolved' | 'inactive';
  /** When it began, or else when the doctor recorded it (YYYY-MM-DD). */
  since: string;
}

export type AppointmentStatus = 'scheduled' | 'arrived' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  /** ISO instant. */
  start: string;
  doctorId: string;
  visitType: string;
  reason: string;
  status: AppointmentStatus;
}

export interface Visit {
  id: string;
  doctorId: string;
  /** ISO instant. */
  start: string;
  reason: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export type MedicineStatus = 'to_collect' | 'on_hold' | 'collected' | 'stopped';

/** One medicine on a prescription. */
export interface Medicine {
  id: string;
  visitId: string;
  doctorId: string;
  /** The pharmacy the doctor sent it to. */
  pharmacyId: string;
  name: string;
  /** How much to take, as the doctor wrote it, e.g. "1 tablet". */
  dose: string;
  /** Prescription shorthand, e.g. "BID"; read it with `frequencyLabel`. */
  frequency: string;
  route: string;
  durationDays: number | null;
  /** How much the pharmacy hands over, e.g. "60 tablets". */
  quantity: string;
  note: string;
  prescribedAt: string;
  status: MedicineStatus;
  /** Why the pharmacy is holding it. */
  holdReason: string;
}

export type LabTestStatus = 'ordered' | 'in_lab' | 'done' | 'cancelled';

/** A lab order: one or more tests sent to a lab together. */
export interface LabTest {
  id: string;
  visitId: string;
  doctorId: string;
  name: string;
  orderedAt: string;
  status: LabTestStatus;
}

/** A doctor or pharmacy, to name it. */
export interface Named {
  id: string;
  name: { full: string };
  phone?: string;
}
