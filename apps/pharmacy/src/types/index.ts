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
  nationality?: string;
  maritalStatus?: string;
  occupation?: string;
  phone: string;
  email: string;
  address: Address;
  emergencyContact: EmergencyContact;
  insurance?: { provider: string; policyNumber: string } | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type { Allergy } from '@curo/web/fhir';

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

// --- Pharmacy Staff ---

export type PharmacyStaffRole = 'chief_pharmacist' | 'pharmacist' | 'pharmacy_technician';

export interface PharmacyStaff {
  id: string;
  name: Name;
  role: PharmacyStaffRole;
  employeeId: string;
  email: string;
  phone: string;
  qualifications: string[];
  registrationNumber: string;
  activeShift: 'morning' | 'evening' | 'night';
  joinedAt: string;
}

// --- Medication Catalog ---

export type MedicationCategory =
  | 'analgesic'
  | 'antibiotic'
  | 'antihypertensive'
  | 'antidiabetic'
  | 'antihistamine'
  | 'vitamin'
  | 'cardiovascular'
  | 'gastrointestinal'
  | 'respiratory'
  | 'other';

export type DrugForm =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'injection'
  | 'cream'
  | 'ointment'
  | 'drops'
  | 'inhaler'
  | 'suppository'
  | 'patch';

export interface Medication {
  id: string;
  genericName: string;
  brandName: string;
  code: string;
  category: MedicationCategory;
  form: DrugForm;
  strength: string;
  manufacturer: string;
  unitPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  expiryDate: string;
  batchNumber: string;
  storageCondition: string;
  controlledSubstance: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
}

// --- Prescriptions (FHIR-mapped) ---

export type PrescriptionStatus = 'draft' | 'sent_to_pharmacy' | 'active' | 'completed' | 'cancelled';

export type Priority = 'routine' | 'urgent' | 'stat';

export interface PrescriptionItem {
  id: string;
  medicationId: string;
  displayName: string;
  route: string;
  frequency: string;
  durationDays: number | null;
  quantity: number;
  quantityUnit: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  encounterId: string;
  doctorId: string;
  status: PrescriptionStatus;
  createdAt: string;
  sentAt: string | null;
  items: PrescriptionItem[];
  notesToPharmacy: string;
  /** The pharmacy it was sent to; null for those written before prescriptions named one, which any pharmacy dispenses. */
  pharmacyId: string | null;
}

// --- Dispensing Records ---

export interface DispensingItem {
  prescriptionItemId: string;
  medicationId: string;
  drugNameDispensed: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  batchNumber: string | null;
  expiryDate: string | null;
  substitution: string | null;
  notes: string;
}

export interface DispensingRecord {
  id: string;
  prescriptionId: string;
  patientId: string;
  dispensedBy: string;
  verifiedBy: string;
  dispensedAt: string;
  items: DispensingItem[];
  counsellingNotes: string;
  printedInstructions: boolean;
  totalAmount: number;
}

// --- Stock Transactions ---

export type StockTransactionType = 'purchase' | 'dispensed' | 'return' | 'adjustment' | 'expired' | 'damaged';

export interface StockTransaction {
  id: string;
  medicationId: string;
  type: StockTransactionType;
  quantity: number;
  batchNumber: string;
  referenceNumber: string;
  performedBy: string;
  performedAt: string;
  notes: string;
}
