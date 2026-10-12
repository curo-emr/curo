export type { Allergy, Patient } from '@curo/web/fhir';

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

export type PrescriptionStatus = 'draft' | 'sent_to_pharmacy' | 'on_hold' | 'active' | 'completed' | 'cancelled';

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
  /** Why a pharmacy put it on hold; empty unless it is on hold. */
  holdReason: string;
  /** The pharmacy it was sent to; null for those written before prescriptions named one, which any pharmacy dispenses. */
  pharmacyId: string | null;
}
