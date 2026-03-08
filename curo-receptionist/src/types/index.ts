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
  relationship: 'self' | 'spouse' | 'child' | 'other';
}

export interface Patient {
  id: string;
  mrn: string;
  nic: string;
  name: Name;
  dob: string;
  sex: 'male' | 'female' | 'other';
  bloodType: string;
  nationality: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'other';
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
  checkInTime: string | null;
  checkedInBy: string | null;
  visitId: string | null;
}

export interface Doctor {
  id: string;
  name: Name;
  specialty: string;
  phone: string;
  email: string;
  roomNumber: string;
  availableDays: string[];
  slotDurationMinutes: number;
  workingHours: { start: string; end: string };
}

export interface Visit {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'checked_in' | 'with_doctor' | 'completed' | 'cancelled';
  notes: string;
  createdBy: string;
}
