import type { Insurance, MaritalStatus } from '@curo/web/fhir';
import type { DoctorSession } from '@curo/web/schedule';
import type { QueueStage } from '@curo/web/flow';

export type { Allergy, Insurance } from '@curo/web/fhir';
// Where a checked-in patient is in the day's flow (nurse triage → doctor).
export type { QueueStage };

export interface Name {
  first: string;
  last: string;
  full: string;
}

export interface Address {
  line1: string;
  line2: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Patient {
  id: string;
  mrn: string;
  phn: string;
  nic: string;
  name: Name;
  dob: string;
  sex: 'male' | 'female' | 'other';
  bloodType: string;
  nationality: string;
  maritalStatus?: MaritalStatus;
  occupation: string;
  phone: string;
  email: string;
  address: Address;
  emergencyContact: EmergencyContact;
  insurance: Insurance | null;
  allergies: string[];
  problemList: string[];
  currentMedications: string[];
  tags: string[];
  registeredBy: string;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Problem {
  id: string;
  patientId: string;
  icdCode: string;
  name: string;
  status: 'active' | 'resolved' | 'inactive';
  onsetDate: string;
  notes: string;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctorId: string;
  patientId: string;
  reason: string;
  visitType: string;
  status: 'scheduled' | 'not_arrived' | 'arrived' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  room: string;
  notes: string;
  queueStage: QueueStage | null;
  stageSince: string | null; // last change to the appointment ≈ when it entered its current stage
}

export interface SOAP {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
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
  substitutes: unknown[];
}

export interface Prescription {
  id: string;
  patientId: string;
  encounterId: string;
  doctorId: string;
  status: 'draft' | 'sent_to_pharmacy' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  sentAt: string | null;
  items: PrescriptionItem[];
  notesToPharmacy: string;
}

export interface LabOrderTest {
  testId: string;
  status: 'ordered' | 'collected' | 'completed' | 'results_available';
  result: string | null;
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
  notesToLab: string;
  tests: LabOrderTest[];
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

export interface Doctor {
  id: string;
  name: Name;
  specialty: string;
  phone: string;
  email: string;
  /** When the doctor sees patients; none until an administrator sets them. */
  sessions: DoctorSession[];
}
