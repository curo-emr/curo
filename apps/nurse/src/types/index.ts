// Where a checked-in patient is in the day's flow (nurse triage → doctor).
import type { QueueStage } from "@curo/web/flow";

export type { QueueStage };
export type { Appointment } from "@curo/web/appointments";
export type { Vitals } from "@curo/web/clinical";

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
  phn: string;
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
