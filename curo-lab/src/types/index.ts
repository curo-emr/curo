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
  department: string;
  specimenType: SpecimenType;
  containerType: string;
  tat: number; // turnaround time in minutes
  price: number;
  isPanel: boolean;
  components: TestComponent[];
}

// --- Lab Orders ---

export type LabOrderStatus = 'received' | 'collected' | 'processing' | 'resulted' | 'verified' | 'dispatched' | 'rejected';
export type Priority = 'routine' | 'urgent' | 'stat';
export type SpecimenType = 'whole_blood' | 'serum' | 'urine' | 'csf' | 'swab' | 'other';
export type SpecimenCondition = 'acceptable' | 'hemolyzed' | 'lipemic' | 'clotted' | 'insufficient' | 'wrong_container';
export type ResultFlag = 'normal' | 'low' | 'high' | 'critical' | 'abnormal';

export interface LabOrderTest {
  testId: string;
  resultId: string | null;
}

export interface LabOrder {
  id: string;
  accessionNumber: string;
  patientId: string;
  doctorName: string;
  priority: Priority;
  status: LabOrderStatus;
  orderedAt: string;
  receivedAt: string;
  collectedAt: string | null;
  collectedBy: string | null;
  specimenType: SpecimenType;
  specimenCondition: SpecimenCondition | null;
  department: string;
  clinicalNotes: string;
  rejectionReason: string | null;
  tests: LabOrderTest[];
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
  type: string;
  department: string;
  serialNumber: string;
  status: InstrumentStatus;
  lastCalibration: string;
  nextCalibration: string;
  location: string;
}
