import type { Patient, Problem } from '@/types';

export { mapFhirAllergy, type FhirAllergy } from '@curo/web/fhir';
export { mapFhirAppointment, type FhirAppointment } from '@curo/web/appointments';

// ─── FHIR raw shapes (subset of what the backend returns) ───────────────────

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta?: { lastUpdated?: string };
  identifier?: Array<{ system: string; value: string }>;
  active?: boolean;
  name?: Array<{ family?: string; given?: string[] }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system: string; value: string; use?: string }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  contact?: Array<{
    name?: { text?: string };
    telecom?: Array<{ system: string; value: string }>;
    relationship?: Array<{ text?: string }>;
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
  }>;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id: string;
  meta?: { lastUpdated?: string };
  subject?: { reference?: string };
  code?: { text?: string; coding?: Array<{ code?: string; display?: string }> };
  clinicalStatus?: { coding?: Array<{ code?: string }> };
  onsetDateTime?: string;
  note?: Array<{ text?: string }>;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapFhirPatient(fhir: FhirPatient): Patient {
  const givenNames = fhir.name?.[0]?.given ?? [];
  const familyName = fhir.name?.[0]?.family ?? '';
  const firstName = givenNames[0] ?? '';
  const middleName = givenNames[1] ?? '';
  const lastName = familyName;

  const patientCode = fhir.identifier?.find(i => i.system === 'urn:curo:patient-code')?.value ?? '';
  const phn = fhir.identifier?.find(i => i.system === 'urn:curo:phn')?.value ?? '';
  const nic = fhir.identifier?.find(i => i.system === 'urn:curo:nic')?.value ?? '';

  const phone = fhir.telecom?.find(t => t.system === 'phone')?.value ?? '';
  const email = fhir.telecom?.find(t => t.system === 'email')?.value ?? '';

  const addr = fhir.address?.[0];
  const ext = fhir.extension ?? [];
  const bloodType = ext.find(e => e.url === 'urn:curo:bloodType')?.valueString ?? '';
  const nationality = ext.find(e => e.url === 'urn:curo:nationality')?.valueString ?? '';
  const occupation = ext.find(e => e.url === 'urn:curo:occupation')?.valueString ?? '';
  const maritalStatus = (ext.find(e => e.url === 'urn:curo:maritalStatus')?.valueString ?? 'single') as Patient['maritalStatus'];

  const emergencyContact = fhir.contact?.[0];
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  return {
    id: fhir.id,
    mrn: patientCode,
    phn,
    nic,
    name: {
      first: firstName,
      last: lastName,
      full: fullName,
    },
    dob: fhir.birthDate ?? '',
    sex: (fhir.gender as Patient['sex']) ?? 'other',
    bloodType,
    nationality,
    maritalStatus: maritalStatus ?? 'single',
    occupation,
    phone,
    email,
    address: {
      line1: addr?.line?.[0] ?? '',
      line2: addr?.line?.[1] ?? '',
      city: addr?.city ?? '',
      district: addr?.state ?? '',
      postalCode: addr?.postalCode ?? '',
      country: addr?.country ?? '',
    },
    emergencyContact: {
      name: emergencyContact?.name?.text ?? '',
      relationship: emergencyContact?.relationship?.[0]?.text ?? '',
      phone: emergencyContact?.telecom?.[0]?.value ?? '',
    },
    insurance: null,
    allergies: [],
    problemList: [],
    currentMedications: [],
    tags: [],
    registeredBy: '',
    registeredAt: fhir.meta?.lastUpdated ?? '',
    createdAt: fhir.meta?.lastUpdated ?? '',
    updatedAt: fhir.meta?.lastUpdated ?? '',
  };
}

export function mapFhirCondition(fhir: FhirCondition): Problem {
  const patientRef = fhir.subject?.reference?.split('/')?.[1] ?? '';
  const icdCode = fhir.code?.coding?.[0]?.code ?? '';
  const name = fhir.code?.text ?? fhir.code?.coding?.[0]?.display ?? '';
  const statusCode = fhir.clinicalStatus?.coding?.[0]?.code ?? 'active';
  const statusMap: Record<string, Problem['status']> = {
    active: 'active', resolved: 'resolved', inactive: 'inactive', remission: 'resolved',
  };

  return {
    id: fhir.id,
    patientId: patientRef,
    icdCode,
    name,
    status: statusMap[statusCode] ?? 'active',
    onsetDate: fhir.onsetDateTime?.slice(0, 10) ?? '',
    notes: fhir.note?.[0]?.text ?? '',
  };
}
