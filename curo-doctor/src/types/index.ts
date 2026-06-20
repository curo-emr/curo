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

export interface Insurance {
  provider: string;
  policyNumber: string;
  groupNumber: string;
  expiryDate: string;
  holderName: string;
  relationship: "self" | "spouse" | "child" | "other";
}

export interface Patient {
  id: string;
  mrn: string;
  phn?: string;
  name: Name;
  dob: string;
  sex: 'male' | 'female' | 'other';
  bloodType: string;
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
  nic?: string;
  nationality?: string;
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | "other";
  occupation?: string;
  insurance?: Insurance | null;
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

export interface Vitals {
  pulseBpm: number;
  respirationRpm: number;
  bpSystolic: number;
  bpDiastolic: number;
  temperatureC: number;
  spo2Percent: number;
  heightCm: number;
  weightKg: number;
}

export interface Diagnosis {
  icdCode: string;
  name: string;
  isPrimary: boolean;
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
  keywords: string[];
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
}

export interface Prescription {
  id: string;
  patientId: string;
  encounterId: string;
  doctorId: string;
  status: 'draft' | 'sent_to_pharmacy';
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
}

export interface LabOrderTest {
  testId: string;
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
  notesToLab: string;
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
