import type { Vitals } from '@curo/web/clinical';
import type { QueueStage } from '@curo/web/flow';

export type { Allergy, Insurance, Patient, Problem } from '@curo/web/fhir';
export type { Vitals };
// Where a checked-in patient is in the day's flow (nurse triage → doctor).
export type { QueueStage };
export type { Appointment } from '@curo/web/appointments';

export interface SOAP {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Diagnosis {
  /** ICD-10, or "" when the diagnosis is recorded in words alone. */
  icdCode: string;
  name: string;
  isPrimary: boolean;
  /** Written by the doctor rather than picked from the ICD-10 list, so its code is theirs to give. */
  typed?: boolean;
}

export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt: string | null;
  chiefComplaint: string;
  soap: SOAP;
  vitals: Partial<Vitals>;
  diagnoses: Diagnosis[];
  prescriptionIds: string[];
  labOrderIds: string[];
  auditTrailIds: string[];
}

export interface ICD10 {
  code: string;
  name: string;
}

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  form: string;
  strength: string;
  atc: string;
  commonSubstitutes: string[];
}

export interface PrescriptionItemSubstitute {
  medicationId: string;
  displayName: string;
  notes: string;
}

export interface PrescriptionItem {
  id: string;
  medicationId: string;
  displayName: string;
  dose: string;
  route: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  instructions: string;
  substitutes: PrescriptionItemSubstitute[];
  /** The patient buys it at a pharmacy of their choice, so no pharmacy here is sent it. One the catalog doesn't list has no medicationId. */
  boughtOutside?: boolean;
}

export interface Prescription {
  id: string;
  patientId: string;
  encounterId: string;
  doctorId: string;
  /** Where it is: written, with the pharmacy, held there, dispensed, cancelled, or for the patient to buy elsewhere. */
  status: 'draft' | 'sent_to_pharmacy' | 'on_hold' | 'dispensed' | 'cancelled' | 'outside_pharmacy';
  /** Why the pharmacy is holding it; empty unless it's on hold. */
  holdReason: string;
  createdAt: string;
  sentAt: string | null;
  items: PrescriptionItem[];
  notesToPharmacy: string;
}

export interface LabTestCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  /** The values it reports, by name, so a search for one finds the test. */
  analytes: { display: string }[];
  /** The lab that offers it; the catalog lists a test once per lab. */
  labId: string | null;
}

/** A laboratory a test can be sent to. */
export interface Lab {
  id: string;
  name: string;
  city: string | null;
}

/** One test result in a lab report. */
export type { LabReport } from '@curo/web/fhir';

export interface LabOrderTest {
  testId: string;
  display: string;
  status: 'ordered' | 'collected' | 'completed' | 'results_available';
  result: string | null;
}

export interface LabOrderReview {
  isReviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface LabOrder {
  id: string;
  patientId: string;
  encounterId: string;
  doctorId: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'draft' | 'sent_to_lab' | 'results_pending' | 'completed';
  createdAt: string;
  sentToLabAt: string | null;
  /** When the lab received the sample. */
  receivedAt: string | null;
  notesToLab: string;
  /** The lab the test was sent to. */
  labId: string | null;
  tests: LabOrderTest[];
  review: LabOrderReview;
  showResultsToPatient: boolean;
}

export interface Task {
  id: string;
  doctorId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'completed';
  relatedPatientId?: string;
  createdAt: string;
}
