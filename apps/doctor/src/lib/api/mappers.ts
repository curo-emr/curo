import type {
  Encounter, Prescription, LabOrder,
  Task,
} from '@/types';

export {
  mapFhirAllergy, mapFhirCondition, mapFhirPatient, type FhirAllergy, type FhirCondition, type FhirPatient,
} from '@curo/web/fhir';
export { mapFhirAppointment, type FhirAppointment } from '@curo/web/appointments';

// ─── FHIR raw shapes (subset of what the backend returns) ───────────────────

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
  authoredOn?: string;
  status: string;
  /** Why the pharmacy is holding it, while it's on hold. */
  statusReason?: { text?: string };
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
    expectedSupplyDuration?: { value?: number };
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
  performer?: Array<{ reference?: string }>;
  authoredOn?: string;
  receivedAt?: string | null;
  code?: { text?: string; coding?: Array<{ code?: string; display?: string }> };
  note?: Array<{ text?: string }>;
  extension?: Array<{ url: string; valueString?: string }>;
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

const ENCOUNTER_STATUS_MAP: Record<string, Encounter['status']> = {
  planned: 'scheduled',
  arrived: 'scheduled',
  triaged: 'scheduled',
  'in-progress': 'in_progress',
  onleave: 'in_progress',
  finished: 'completed',
  completed: 'completed', // what clinical-service actually stores (EncounterStatus.COMPLETED)
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
    // NOTE: GET /encounters/:id returns a bare FHIR Encounter — it carries no SOAP
    // extensions or vitals. SOAP/vitals live in /notes and /vitals and are backfilled
    // by the encounter detail page (see getEncounterSoap/getEncounterVitals). These
    // extension reads are kept as a forward-compat fallback but are normally empty;
    // don't wire up a second source here.
    soap: {
      subjective: ext.find(e => e.url === 'urn:curo:soap:subjective')?.valueString ?? '',
      objective: ext.find(e => e.url === 'urn:curo:soap:objective')?.valueString ?? '',
      assessment: ext.find(e => e.url === 'urn:curo:soap:assessment')?.valueString ?? '',
      plan: ext.find(e => e.url === 'urn:curo:soap:plan')?.valueString ?? '',
    },
    vitals: {},
    diagnoses: [],
    prescriptionIds: [],
    labOrderIds: [],
    auditTrailIds: [],
  };
}

export function mapFhirMedicationRequest(fhir: FhirMedicationRequest): Prescription {
  const patientId = fhir.subject?.reference?.replace('Patient/', '') ?? '';
  const encounterId = fhir.encounter?.reference?.replace('Encounter/', '') ?? '';
  const doctorId = fhir.requester?.reference?.replace('Practitioner/', '') ?? '';
  const ext = fhir.extension ?? [];
  const statusMap: Record<string, Prescription['status']> = {
    draft: 'draft', active: 'sent_to_pharmacy', 'on-hold': 'on_hold', completed: 'dispensed',
    cancelled: 'cancelled', stopped: 'cancelled', 'entered-in-error': 'cancelled',
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
    holdReason: fhir.statusReason?.text ?? '',
    createdAt: fhir.authoredOn ?? fhir.meta?.lastUpdated ?? '',
    sentAt: fhir.status === 'active' ? (fhir.meta?.lastUpdated ?? null) : null,
    items: [{
      id: fhir.id,
      medicationId: fhir.medicationCodeableConcept?.coding?.[0]?.code ?? '',
      displayName: fhir.medicationCodeableConcept?.text ?? fhir.medicationCodeableConcept?.coding?.[0]?.display ?? '',
      // dosageInstruction.text holds the dose as written ("500mg"); doseQuantity is the dispense count.
      dose: dosage?.text || (dose?.unit ? `${dose.value} ${dose.unit}` : ''),
      route: dosage?.route?.text ?? 'oral',
      frequency: dosage?.timing?.code?.text ?? '',
      durationDays: Number(ext.find(e => e.url === 'urn:curo:durationDays')?.valueString ?? fhir.dispenseRequest?.expectedSupplyDuration?.value ?? 0),
      quantity: qty,
      instructions: fhir.note?.[0]?.text ?? '',
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
    createdAt: fhir.authoredOn ?? fhir.meta?.lastUpdated ?? '',
    sentToLabAt: fhir.status !== 'draft' ? (fhir.authoredOn ?? fhir.meta?.lastUpdated ?? null) : null,
    receivedAt: fhir.receivedAt ?? null,
    notesToLab: fhir.note?.[0]?.text ?? '',
    labId: fhir.performer?.[0]?.reference?.replace('Organization/', '') ?? null,
    tests: (fhir.code?.coding ?? []).map(c => ({
      testId: c.code ?? '',
      display: c.display ?? fhir.code?.text ?? c.code ?? '',
      status: 'ordered' as const,
      result: null,
    })),
    review: { isReviewed: false, reviewedAt: null, reviewedBy: null },
    showResultsToPatient: false,
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
