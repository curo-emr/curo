import type {
  Patient, Allergy, Problem, Appointment, Encounter, Prescription,
  LabOrder, Task,
} from '@/types';
import type { LabResult, LabResultItem } from './lab';

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

export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  subject?: { reference?: string };
  participant?: Array<{ individual?: { reference?: string } }>;
  appointment?: Array<{ reference?: string }>;
  period?: { start?: string; end?: string };
  reasonCode?: Array<{ text?: string }>;
  extension?: Array<{
    url: string;
    valueString?: string;
  }>;
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  subject?: { reference?: string };
  requester?: { reference?: string };
  encounter?: { reference?: string };
  medicationCodeableConcept?: {
    text?: string;
    coding?: Array<{ code?: string; display?: string }>;
  };
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      code?: { text?: string };
      repeat?: { frequency?: number; period?: number; periodUnit?: string };
    };
    route?: { text?: string };
    doseAndRate?: Array<{
      doseQuantity?: { value?: number; unit?: string };
    }>;
  }>;
  dispenseRequest?: {
    quantity?: { value?: number };
    validityPeriod?: { end?: string };
  };
  note?: Array<{ text?: string }>;
  extension?: Array<{ url: string; valueString?: string; valueInteger?: number }>;
}

export interface FhirServiceRequest {
  resourceType: 'ServiceRequest';
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  priority?: string;
  subject?: { reference?: string };
  requester?: { reference?: string };
  encounter?: { reference?: string };
  code?: { text?: string; coding?: Array<{ code?: string; display?: string }> };
  note?: Array<{ text?: string }>;
  extension?: Array<{ url: string; valueString?: string }>;
  tests?: Array<{ testCode: string; display: string; qrBase64: string | null }>;
}

export interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  status?: string;
  code?: { text?: string; coding?: Array<{ code?: string; display?: string }> };
  subject?: { reference?: string };
  basedOn?: Array<{ reference?: string }>;
  effectiveDateTime?: string;
  issued?: string;
  conclusion?: string;
  result?: Array<{
    testCode?: string;
    testName?: string;
    code?: string;
    display?: string;
    value?: string | number | null;
    valueString?: string | null;
    unit?: string;
    referenceRange?: string;
    referenceRangeText?: string;
    referenceRangeLow?: string;
    referenceRangeHigh?: string;
    flag?: LabResultItem['flag'];
    interpretation?: string;
  }>;
}

export interface FhirTask {
  resourceType: 'Task';
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  priority?: string;
  for?: { reference?: string };
  description?: string;
  note?: Array<{ text?: string }>;
  restriction?: { period?: { end?: string } };
  extension?: Array<{ url: string; valueString?: string }>;
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
    allergies: [],
    problemList: [],
    currentMedications: [],
    tags: [],
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
  };
}

const ENCOUNTER_STATUS_MAP: Record<string, Encounter['status']> = {
  planned: 'scheduled',
  arrived: 'scheduled',
  triaged: 'scheduled',
  'in-progress': 'in_progress',
  onleave: 'in_progress',
  finished: 'completed',
  cancelled: 'cancelled',
};

export function mapFhirEncounter(fhir: FhirEncounter): Encounter {
  const patientId = fhir.subject?.reference?.replace('Patient/', '') ?? '';
  const practitionerId = fhir.participant?.[0]?.individual?.reference?.replace('Practitioner/', '') ?? '';
  const appointmentId = fhir.appointment?.[0]?.reference?.replace('Appointment/', '') ?? '';
  const ext = fhir.extension ?? [];

  return {
    id: fhir.id,
    patientId,
    doctorId: practitionerId,
    appointmentId,
    status: ENCOUNTER_STATUS_MAP[fhir.status] ?? 'scheduled',
    startedAt: fhir.period?.start ?? '',
    endedAt: fhir.period?.end ?? null,
    chiefComplaint: ext.find(e => e.url === 'urn:curo:chiefComplaint')?.valueString ?? fhir.reasonCode?.[0]?.text ?? '',
    soap: {
      subjective: ext.find(e => e.url === 'urn:curo:soap:subjective')?.valueString ?? '',
      objective: ext.find(e => e.url === 'urn:curo:soap:objective')?.valueString ?? '',
      assessment: ext.find(e => e.url === 'urn:curo:soap:assessment')?.valueString ?? '',
      plan: ext.find(e => e.url === 'urn:curo:soap:plan')?.valueString ?? '',
    },
  };
}

export function mapFhirMedicationRequest(fhir: FhirMedicationRequest): Prescription {
  const patientId = fhir.subject?.reference?.replace('Patient/', '') ?? '';
  const encounterId = fhir.encounter?.reference?.replace('Encounter/', '') ?? '';
  const doctorId = fhir.requester?.reference?.replace('Practitioner/', '') ?? '';
  const ext = fhir.extension ?? [];
  const statusMap: Record<string, Prescription['status']> = {
    draft: 'draft', active: 'sent_to_pharmacy', completed: 'sent_to_pharmacy',
    cancelled: 'draft', stopped: 'draft',
  };

  const dosage = fhir.dosageInstruction?.[0];
  const dose = dosage?.doseAndRate?.[0]?.doseQuantity;
  const qty = fhir.dispenseRequest?.quantity?.value ?? 1;

  return {
    id: fhir.id,
    patientId,
    encounterId,
    doctorId,
    status: statusMap[fhir.status] ?? 'draft',
    createdAt: fhir.meta?.lastUpdated ?? '',
    sentAt: fhir.status === 'active' ? (fhir.meta?.lastUpdated ?? null) : null,
    items: [{
      id: fhir.id,
      medicationId: fhir.medicationCodeableConcept?.coding?.[0]?.code ?? '',
      displayName: fhir.medicationCodeableConcept?.text ?? fhir.medicationCodeableConcept?.coding?.[0]?.display ?? '',
      dose: dose ? `${dose.value} ${dose.unit}` : (dosage?.text ?? ''),
      route: dosage?.route?.text ?? 'oral',
      frequency: dosage?.timing?.code?.text ?? '',
      durationDays: parseInt(ext.find(e => e.url === 'urn:curo:durationDays')?.valueString ?? '7'),
      quantity: qty,
      instructions: dosage?.text ?? '',
      substitutes: [],
    }],
    notesToPharmacy: fhir.note?.[0]?.text ?? '',
  };
}

export function mapFhirServiceRequest(fhir: FhirServiceRequest): LabOrder {
  const patientId = fhir.subject?.reference?.replace('Patient/', '') ?? '';
  const encounterId = fhir.encounter?.reference?.replace('Encounter/', '') ?? '';
  const doctorId = fhir.requester?.reference?.replace('Practitioner/', '') ?? '';
  const statusMap: Record<string, LabOrder['status']> = {
    draft: 'draft', active: 'sent_to_lab', completed: 'completed',
    revoked: 'draft', 'entered-in-error': 'draft', unknown: 'draft',
  };
  const priorityMap: Record<string, LabOrder['priority']> = {
    routine: 'routine', urgent: 'urgent', stat: 'stat', asap: 'stat',
  };

  return {
    id: fhir.id,
    patientId,
    encounterId,
    doctorId,
    priority: priorityMap[fhir.priority ?? 'routine'] ?? 'routine',
    status: statusMap[fhir.status] ?? 'draft',
    createdAt: fhir.meta?.lastUpdated ?? '',
    sentToLabAt: fhir.status !== 'draft' ? (fhir.meta?.lastUpdated ?? null) : null,
    notesToLab: fhir.note?.[0]?.text ?? '',
    tests: (fhir.code?.coding ?? []).map(c => ({
      testId: c.code ?? '',
      status: 'ordered' as const,
      result: null,
    })),
    testQrs: fhir.tests ?? [],
    review: { isReviewed: false, reviewedAt: null, reviewedBy: null },
    showResultsToPatient: false,
  };
}

function referenceId(reference?: string): string {
  return reference?.split('/').pop() ?? '';
}

function getReferenceRange(item: NonNullable<FhirDiagnosticReport['result']>[number]): string | undefined {
  if (item.referenceRange) return item.referenceRange;
  if (item.referenceRangeText) return item.referenceRangeText;
  if (item.referenceRangeLow || item.referenceRangeHigh) {
    return [item.referenceRangeLow, item.referenceRangeHigh].filter(Boolean).join(' - ');
  }
  return undefined;
}

function getResultFlag(item: NonNullable<FhirDiagnosticReport['result']>[number]): LabResultItem['flag'] | undefined {
  if (item.flag) return item.flag;
  const interpretation = item.interpretation?.toUpperCase();
  if (interpretation === 'H' || interpretation === 'HH') return 'high';
  if (interpretation === 'L' || interpretation === 'LL') return 'low';
  if (interpretation === 'A') return 'critical';
  if (interpretation === 'N') return 'normal';
  return undefined;
}

export function mapFhirDiagnosticReport(fhir: FhirDiagnosticReport): LabResult {
  const reportCode = fhir.code?.coding?.[0]?.code ?? '';
  const reportDisplay = fhir.code?.text ?? fhir.code?.coding?.[0]?.display ?? reportCode;

  return {
    id: fhir.id,
    orderId: referenceId(fhir.basedOn?.[0]?.reference),
    patientId: referenceId(fhir.subject?.reference),
    performedAt: fhir.effectiveDateTime ?? fhir.issued ?? '',
    reportedAt: fhir.issued,
    results: (fhir.result ?? []).map(item => {
      const testCode = item.testCode ?? item.code ?? reportCode;
      const testName = item.testName ?? item.display ?? reportDisplay;
      const value = item.value != null ? String(item.value) : (item.valueString ?? '');

      return {
        testCode,
        testName,
        value,
        unit: item.unit,
        referenceRange: getReferenceRange(item),
        flag: getResultFlag(item),
      };
    }),
    conclusion: fhir.conclusion,
    status: fhir.status ?? '',
  };
}

export function mapFhirTask(fhir: FhirTask): Task {
  const patientId = fhir.for?.reference?.replace('Patient/', '') ?? undefined;
  const ext = fhir.extension ?? [];
  const statusMap: Record<string, Task['status']> = {
    requested: 'open', accepted: 'in_progress', received: 'open',
    'in-progress': 'in_progress', completed: 'completed', cancelled: 'open', failed: 'open',
  };
  const priorityMap: Record<string, Task['priority']> = {
    routine: 'low', urgent: 'medium', asap: 'high', stat: 'high',
  };

  return {
    id: fhir.id,
    doctorId: ext.find(e => e.url === 'urn:curo:ownerId')?.valueString ?? '',
    title: fhir.description ?? '',
    description: fhir.note?.[0]?.text ?? '',
    dueDate: fhir.restriction?.period?.end?.slice(0, 10) ?? '',
    priority: priorityMap[fhir.priority ?? 'routine'] ?? 'low',
    status: statusMap[fhir.status] ?? 'open',
    relatedPatientId: patientId,
    createdAt: fhir.meta?.lastUpdated ?? '',
  };
}
