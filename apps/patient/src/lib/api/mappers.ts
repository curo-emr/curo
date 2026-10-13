import { isBoughtOutside, mapFhirPatientDetails, type FhirPatientDetails } from '@curo/web/fhir';
import type {
  Appointment, AppointmentStatus, Condition, LabTest, LabTestStatus, Medicine, MedicineStatus, Patient, Visit,
} from '@/types';

export { mapFhirAllergy, mapFhirReport, type FhirAllergy, type FhirDiagnosticReport } from '@curo/web/fhir';

// ─── FHIR shapes: the fields the services send that this portal reads ─────────

type Reference = { reference?: string };
type Coding = { code?: string; display?: string };

export interface FhirPatient extends FhirPatientDetails {
  id: string;
  identifier?: Array<{ system: string; value: string }>;
  name?: Array<{ family?: string; given?: string[] }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system: string; value: string }>;
  address?: Array<{ line?: string[]; city?: string | null; state?: string | null; postalCode?: string | null; country?: string | null }>;
  contact?: Array<{
    name?: { text?: string };
    telecom?: Array<{ value: string }>;
    relationship?: Array<{ text?: string }>;
  }>;
}

export interface FhirCondition {
  id: string;
  code?: { text?: string; coding?: Coding[] };
  clinicalStatus?: { coding?: Coding[] };
  onsetDateTime?: string | null;
  recordedDate?: string | null;
}

export interface FhirAppointment {
  id: string;
  status: string;
  start?: string;
  serviceType?: Array<{ coding?: Coding[] }>;
  reasonCode?: Array<{ text?: string }>;
  participant?: Array<{ actor?: Reference }>;
}

export interface FhirEncounter {
  id: string;
  status: string;
  participant?: Array<{ individual?: Reference }>;
  period?: { start?: string | null };
  reasonCode?: Array<{ text?: string }>;
}

export interface FhirMedicationRequest {
  id: string;
  status: string;
  statusReason?: { text?: string };
  medicationCodeableConcept?: { text?: string; coding?: Coding[] };
  requester?: Reference;
  encounter?: Reference;
  authoredOn?: string;
  dosageInstruction?: Array<{ text?: string; route?: { text?: string }; timing?: { code?: { text?: string } } }>;
  dispenseRequest?: {
    performer?: Reference;
    quantity?: { value?: number; unit?: string };
    expectedSupplyDuration?: { value?: number };
  };
  note?: Array<{ text?: string }>;
  extension?: Array<{ url: string; valueBoolean?: boolean }>;
}

export interface FhirServiceRequest {
  id: string;
  status: string;
  code?: { text?: string; coding?: Coding[] };
  testPanel?: Coding[] | null;
  requester?: Reference;
  encounter?: Reference;
  authoredOn?: string;
  receivedAt?: string | null;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/** The id in a reference such as "Practitioner/abc". */
const idOf = (ref?: Reference) => ref?.reference?.split('/')[1] ?? '';

export function mapFhirPatient(fhir: FhirPatient): Patient {
  const identifier = (system: string) => fhir.identifier?.find(i => i.system === `urn:curo:${system}`)?.value ?? '';
  const telecom = (system: string) => fhir.telecom?.find(t => t.system === system)?.value ?? '';
  const [first = '', ...middle] = fhir.name?.[0]?.given ?? [];
  const last = fhir.name?.[0]?.family ?? '';
  const addr = fhir.address?.[0];
  const contact = fhir.contact?.[0];

  return {
    id: fhir.id,
    mrn: identifier('patient-code'),
    phn: identifier('phn'),
    nic: identifier('nic'),
    name: { first, last, full: [first, ...middle, last].filter(Boolean).join(' ') },
    dob: fhir.birthDate ?? '',
    sex: fhir.gender ?? '',
    bloodType: mapFhirPatientDetails(fhir).bloodType,
    phone: telecom('phone'),
    email: telecom('email'),
    address: [...(addr?.line ?? []), addr?.city, addr?.state, addr?.postalCode, addr?.country].filter(Boolean).join(', '),
    emergencyContact: {
      name: contact?.name?.text ?? '',
      relationship: contact?.relationship?.[0]?.text ?? '',
      phone: contact?.telecom?.[0]?.value ?? '',
    },
  };
}

const CONDITION_STATUS: Record<string, Condition['status']> = {
  active: 'active', recurrence: 'active', relapse: 'active',
  resolved: 'resolved', remission: 'resolved', inactive: 'inactive',
};

export function mapFhirCondition(fhir: FhirCondition): Condition {
  const coding = fhir.code?.coding?.[0];
  return {
    id: fhir.id,
    name: fhir.code?.text ?? coding?.display ?? '',
    icdCode: coding?.code ?? '',
    status: CONDITION_STATUS[fhir.clinicalStatus?.coding?.[0]?.code ?? 'active'] ?? 'active',
    since: (fhir.onsetDateTime ?? fhir.recordedDate ?? '').slice(0, 10),
  };
}

const APPOINTMENT_STATUS: Record<string, AppointmentStatus> = {
  booked: 'scheduled', pending: 'scheduled', proposed: 'scheduled', waitlist: 'scheduled',
  arrived: 'arrived', 'checked-in': 'arrived',
  fulfilled: 'completed',
  cancelled: 'cancelled', 'entered-in-error': 'cancelled',
  noshow: 'no_show',
};

export function mapFhirAppointment(fhir: FhirAppointment): Appointment {
  const doctor = fhir.participant?.find(p => p.actor?.reference?.startsWith('Practitioner/'));
  return {
    id: fhir.id,
    start: fhir.start ?? '',
    doctorId: idOf(doctor?.actor),
    visitType: fhir.serviceType?.[0]?.coding?.[0]?.code ?? '',
    reason: fhir.reasonCode?.[0]?.text ?? '',
    status: APPOINTMENT_STATUS[fhir.status] ?? 'scheduled',
  };
}

const VISIT_STATUS: Record<string, Visit['status']> = {
  planned: 'scheduled', arrived: 'scheduled', triaged: 'scheduled',
  'in-progress': 'in_progress', onleave: 'in_progress',
  finished: 'completed', completed: 'completed',
  cancelled: 'cancelled', 'entered-in-error': 'cancelled',
};

export function mapFhirEncounter(fhir: FhirEncounter): Visit {
  return {
    id: fhir.id,
    doctorId: idOf(fhir.participant?.[0]?.individual),
    start: fhir.period?.start ?? '',
    reason: fhir.reasonCode?.[0]?.text ?? '',
    status: VISIT_STATUS[fhir.status] ?? 'scheduled',
  };
}

const MEDICINE_STATUS: Record<string, MedicineStatus> = {
  active: 'to_collect', 'on-hold': 'on_hold', completed: 'collected',
  cancelled: 'stopped', stopped: 'stopped', 'entered-in-error': 'stopped',
};

/** A prescribed medicine; undefined for a draft the doctor hasn't sent. */
export function mapFhirMedicationRequest(fhir: FhirMedicationRequest): Medicine | undefined {
  const status = isBoughtOutside(fhir) ? 'buy_outside' : MEDICINE_STATUS[fhir.status];
  if (!status) return undefined;
  const dosage = fhir.dosageInstruction?.[0];
  const quantity = fhir.dispenseRequest?.quantity;
  return {
    id: fhir.id,
    visitId: idOf(fhir.encounter),
    doctorId: idOf(fhir.requester),
    pharmacyId: idOf(fhir.dispenseRequest?.performer),
    name: fhir.medicationCodeableConcept?.text ?? fhir.medicationCodeableConcept?.coding?.[0]?.display ?? '',
    dose: dosage?.text ?? '',
    frequency: dosage?.timing?.code?.text ?? '',
    route: dosage?.route?.text ?? '',
    durationDays: fhir.dispenseRequest?.expectedSupplyDuration?.value ?? null,
    quantity: quantity?.value ? [quantity.value, quantity.unit].filter(Boolean).join(' ') : '',
    note: fhir.note?.[0]?.text ?? '',
    prescribedAt: fhir.authoredOn ?? '',
    status,
    holdReason: fhir.statusReason?.text ?? '',
  };
}

/** A lab order; undefined for a draft the doctor hasn't sent. */
export function mapFhirServiceRequest(fhir: FhirServiceRequest): LabTest | undefined {
  const status: LabTestStatus | undefined =
    fhir.status === 'active' ? (fhir.receivedAt ? 'in_lab' : 'ordered')
    : fhir.status === 'completed' ? 'done'
    : fhir.status === 'revoked' ? 'cancelled'
    : undefined;
  if (!status) return undefined;
  const tests = fhir.testPanel?.length ? fhir.testPanel : fhir.code?.coding ?? [];
  return {
    id: fhir.id,
    visitId: idOf(fhir.encounter),
    doctorId: idOf(fhir.requester),
    name: fhir.code?.text ?? tests.map(t => t.display || t.code).join(', '),
    orderedAt: fhir.authoredOn ?? '',
    status,
  };
}
