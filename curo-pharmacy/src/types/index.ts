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
  nic: string;
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

// --- Prescriptions ---

export type PrescriptionStatus =
  | 'pending'
  | 'processing'
  | 'dispensed'
  | 'partially_dispensed'
  | 'on_hold'
  | 'cancelled'
  | 'expired';

export type Priority = 'routine' | 'urgent' | 'stat';

export interface PrescriptionItem {
  id: string;
  medicationId: string;
  drugName: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  genericAllowed: boolean;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  doctorName: string;
  doctorRegistration: string;
  priority: Priority;
  status: PrescriptionStatus;
  prescribedAt: string;
  receivedAt: string;
  dispensedAt: string | null;
  genericAllowed: boolean;
  clinicalNotes: string;
  diagnosis: string;
  items: PrescriptionItem[];
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
