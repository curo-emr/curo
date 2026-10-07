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
  phn?: string;
  nic?: string;
  name: Name;
  dob: string;
  sex: 'male' | 'female' | 'other';
  bloodType: string;
  nationality?: string;
  maritalStatus?: string;
  phone: string;
  email: string;
  address: Address;
  emergencyContact: EmergencyContact;
  allergies: string[];
  problemList: string[];
  currentMedications: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes: string;
  recordedAt: string;
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

// --- Lab Staff ---

export type LabStaffRole = 'senior_technician' | 'technician' | 'pathologist' | 'phlebotomist';

export interface LabStaff {
  id: string;
  name: Name;
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

export interface ReferenceRange {
  low: number;
  high: number;
}

export interface TestComponent {
  id: string;
  name: string;
  unit: string;
  referenceRange: ReferenceRange;
}

export interface LabTestCatalogItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  department?: string;
  specimenType?: SpecimenType;
  containerType?: string;
  tat?: number;
  price?: number;
  isPanel?: boolean;
  components?: TestComponent[];
}

// --- Lab Orders (FHIR-mapped) ---

export type LabOrderStatus = 'draft' | 'sent_to_lab' | 'results_pending' | 'completed';
export type Priority = 'routine' | 'urgent' | 'stat';
export type SpecimenType = 'whole_blood' | 'serum' | 'urine' | 'csf' | 'swab' | 'other';
export type ResultFlag = 'normal' | 'low' | 'high' | 'critical' | 'abnormal';

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
  notesToLab: string;
  tests: LabOrderTest[];
  // Per-test QR labels (populated on order detail) for printing & sticking on samples.
  testQrs?: { testCode: string; display: string; qrBase64: string | null }[];
  review: LabOrderReview;
  showResultsToPatient: boolean;
}

// --- Lab Results ---

export interface ResultValue {
  componentId: string;
  value: number | string;
  flag: ResultFlag;
  notes: string;
}

export interface LabResult {
  id: string;
  orderId: string;
  testId: string;
  patientId: string;
  performedBy: string;
  verifiedBy: string | null;
  instrumentId: string;
  performedAt: string;
  verifiedAt: string | null;
  values: ResultValue[];
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
