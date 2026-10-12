import type { LabAnalyte } from '@curo/web/clinical';
import type { PersonName } from '@curo/web/fhir';

export type { Allergy, Patient } from '@curo/web/fhir';

export interface Problem {
  id: string;
  patientId: string;
  icdCode: string;
  name: string;
  status: 'active' | 'resolved' | 'inactive';
  onsetDate: string;
  notes: string;
}

// --- Lab Staff ---

export type LabStaffRole = 'senior_technician' | 'technician' | 'pathologist' | 'phlebotomist';

export interface LabStaff {
  id: string;
  name: PersonName;
  role: LabStaffRole;
  department: string;
  employeeId: string;
  email: string;
  phone: string;
  qualifications: string[];
  activeShift: 'morning' | 'evening' | 'night';
  joinedAt: string;
}

// --- Lab Test Catalog ---

export interface LabTestCatalogItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  /** As the lab names it, e.g. "Whole Blood". */
  specimen?: string;
  price?: number;
  /** What the test reports, each with its unit and reference range. */
  analytes: LabAnalyte[];
}

// --- Lab Orders (FHIR-mapped) ---

export type LabOrderStatus = 'draft' | 'sent_to_lab' | 'results_pending' | 'completed';
export type Priority = 'routine' | 'urgent' | 'stat';

export interface LabOrderTest {
  /** The test's code (LOINC). */
  testId: string;
  name: string;
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
  priority: Priority;
  status: LabOrderStatus;
  createdAt: string;
  sentToLabAt: string | null;
  /** When the lab received the sample. */
  receivedAt: string | null;
  /** When the lab filed the results. */
  completedAt: string | null;
  notesToLab: string;
  tests: LabOrderTest[];
  // Per-test QR labels (populated on order detail) for printing & sticking on samples.
  testQrs?: { testCode: string; display: string; qrBase64: string | null }[];
  review: LabOrderReview;
  showResultsToPatient: boolean;
}

// --- QC ---

export type QCStatus = 'pass' | 'fail' | 'warning';

export interface QCLog {
  id: string;
  instrumentId: string;
  testCode: string;
  controlLevel: string;
  expectedValue: number;
  observedValue: number;
  unit: string;
  status: QCStatus;
  performedBy: string;
  performedAt: string;
  notes: string;
}

// --- Instruments ---

export type InstrumentStatus = 'operational' | 'maintenance' | 'offline';

export interface LabInstrument {
  id: string;
  name: string;
  model?: string;
  serialNumber: string;
  status: string;
  lastCalibrated?: string;
  nextCalibrationDue?: string;
  location?: string;
  type?: string;
  department?: string;
  lastCalibration?: string;
  nextCalibration?: string;
}
