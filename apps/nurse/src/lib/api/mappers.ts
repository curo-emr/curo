import type { Patient, Allergy, Problem, Appointment, QueueStage } from '@/types';

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

export interface FhirAllergy {
  resourceType: 'AllergyIntolerance';
  id: string;
  meta?: { lastUpdated?: string };
  patient?: { reference?: string };
  code?: { text?: string; coding?: Array<{ display?: string }> };
  reaction?: Array<{ manifestation?: Array<{ text?: string }> }>;
  criticality?: string;
  note?: Array<{ text?: string }>;
  recordedDate?: string;
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

export interface FhirAppointment {
  resourceType: 'Appointment';
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  start?: string;
  end?: string;
  serviceType?: Array<{ coding?: Array<{ code?: string }> }>;
  reasonCode?: Array<{ text?: string }>;
  description?: string;
  comment?: string;
  participant?: Array<{
    actor?: { reference?: string };
    status?: string;
  }>;
  extension?: Array<{
    url: string;
    valueInteger?: number;
    valueBoolean?: boolean;
    valueString?: string;
  }>;
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

export function mapFhirAllergy(fhir: FhirAllergy): Allergy {
  const patientRef = fhir.patient?.reference?.split('/')?.[1] ?? '';
  const substance = fhir.code?.text ?? fhir.code?.coding?.[0]?.display ?? '';
  const reaction = fhir.reaction?.[0]?.manifestation?.[0]?.text ?? '';
  const severityMap: Record<string, Allergy['severity']> = {
    low: 'mild', moderate: 'moderate', high: 'severe', unable_to_assess: 'mild',
  };
  const severity = severityMap[fhir.criticality ?? 'low'] ?? 'mild';

  return {
    id: fhir.id,
    patientId: patientRef,
    substance,
    reaction,
    severity,
    notes: fhir.note?.[0]?.text ?? '',
    recordedAt: fhir.recordedDate ?? fhir.meta?.lastUpdated ?? '',
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

const FHIR_APPT_STATUS_MAP: Record<string, Appointment['status']> = {
  booked: 'scheduled',
  pending: 'scheduled',
  arrived: 'arrived',
  fulfilled: 'completed',
  cancelled: 'cancelled',
  noshow: 'no_show',
  'entered-in-error': 'cancelled',
  waitlist: 'waiting',
  'checked-in': 'arrived',
};

export function mapFhirAppointment(fhir: FhirAppointment): Appointment {
  const start = fhir.start ? new Date(fhir.start) : new Date();
  const date = start.toISOString().slice(0, 10);
  const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

  const patientRef = fhir.participant?.find(p => p.actor?.reference?.startsWith('Patient/'));
  const practitionerRef = fhir.participant?.find(p => p.actor?.reference?.startsWith('Practitioner/'));

  const patientId = patientRef?.actor?.reference?.replace('Patient/', '') ?? '';
  const practitionerId = practitionerRef?.actor?.reference?.replace('Practitioner/', '') ?? '';

  return {
    id: fhir.id,
    date,
    time,
    doctorId: practitionerId,
    patientId,
    reason: fhir.reasonCode?.[0]?.text ?? fhir.description ?? '',
    visitType: fhir.serviceType?.[0]?.coding?.[0]?.code ?? 'consultation',
    status: FHIR_APPT_STATUS_MAP[fhir.status] ?? 'scheduled',
    room: '',
    notes: fhir.comment ?? '',
    queueStage: (fhir.extension?.find(e => e.url === 'urn:curo:queueStage')?.valueString as QueueStage | undefined) ?? null,
    stageSince: fhir.meta?.lastUpdated ?? null,
  };
}
