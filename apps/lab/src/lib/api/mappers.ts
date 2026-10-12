import type { Problem, LabOrder } from '@/types';

export { mapFhirAllergy, mapFhirPatient, type FhirAllergy, type FhirPatient } from '@curo/web/fhir';
import { mapLabResult, type FhirLabResult } from '@curo/web/fhir';
import type { LabResult } from './lab';

// ─── FHIR raw shapes (subset of what the backend returns) ───────────────────

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

export interface FhirServiceRequest {
  resourceType: 'ServiceRequest';
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  priority?: string;
  subject?: { reference?: string };
  requester?: { reference?: string };
  encounter?: { reference?: string };
  authoredOn?: string;
  receivedAt?: string | null;
  completedAt?: string | null;
  code?: { text?: string; coding?: Array<{ code?: string; display?: string }> };
  note?: Array<{ text?: string }>;
  extension?: Array<{ url: string; valueString?: string }>;
  /** The individual tests ordered; empty on older single-test orders. */
  testPanel?: Array<{ code: string; display: string }> | null;
  tests?: Array<{ testCode: string; display: string; qrBase64: string | null }>;
}

export interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  status?: string;
  subject?: { reference?: string };
  basedOn?: Array<{ reference?: string }>;
  effectiveDateTime?: string;
  issued?: string;
  conclusion?: string;
  result?: FhirLabResult[];
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

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

/** The order's tests: its panel, or the order's own code when it has none. */
function orderedTests(fhir: FhirServiceRequest): Array<{ code: string; display: string }> {
  if (fhir.testPanel?.length) return fhir.testPanel;
  return (fhir.code?.coding ?? []).map(c => ({ code: c.code ?? '', display: c.display ?? c.code ?? '' }));
}

// FHIR ServiceRequest status → what the lab sees. Any other status (on-hold) reads as draft.
const ORDER_STATUSES: Record<string, LabOrder['status']> = {
  draft: 'draft', active: 'sent_to_lab', completed: 'completed',
  revoked: 'draft', 'entered-in-error': 'draft', unknown: 'draft',
};
const FHIR_ORDER_STATUSES = ['draft', 'active', 'on-hold', 'revoked', 'completed', 'entered-in-error', 'unknown'];

// FHIR request priority → the lab's three. An order given none is routine.
const ORDER_PRIORITIES: Record<string, LabOrder['priority']> = {
  routine: 'routine', urgent: 'urgent', stat: 'stat', asap: 'stat',
};

export const labOrderStatusOf = (fhirStatus: string): LabOrder['status'] => ORDER_STATUSES[fhirStatus] ?? 'draft';

export const labOrderPriorityOf = (fhirPriority?: string | null): LabOrder['priority'] =>
  ORDER_PRIORITIES[fhirPriority ?? 'routine'] ?? 'routine';

/** The FHIR statuses that read as `status`, for asking the API for them. */
export const fhirStatusesOf = (status: LabOrder['status']) =>
  FHIR_ORDER_STATUSES.filter(fhirStatus => labOrderStatusOf(fhirStatus) === status);

/** The FHIR priorities that read as `priority`, for asking the API for them. */
export const fhirPrioritiesOf = (priority: LabOrder['priority']) =>
  Object.keys(ORDER_PRIORITIES).filter(fhirPriority => labOrderPriorityOf(fhirPriority) === priority);

export function mapFhirServiceRequest(fhir: FhirServiceRequest): LabOrder {
  const patientId = fhir.subject?.reference?.replace('Patient/', '') ?? '';
  const encounterId = fhir.encounter?.reference?.replace('Encounter/', '') ?? '';
  const doctorId = fhir.requester?.reference?.replace('Practitioner/', '') ?? '';

  return {
    id: fhir.id,
    patientId,
    encounterId,
    doctorId,
    priority: labOrderPriorityOf(fhir.priority),
    status: labOrderStatusOf(fhir.status),
    createdAt: fhir.authoredOn ?? fhir.meta?.lastUpdated ?? '',
    sentToLabAt: fhir.status !== 'draft' ? (fhir.authoredOn ?? fhir.meta?.lastUpdated ?? null) : null,
    receivedAt: fhir.receivedAt ?? null,
    completedAt: fhir.completedAt ?? null,
    notesToLab: fhir.note?.[0]?.text ?? '',
    tests: orderedTests(fhir).map(t => ({
      testId: t.code,
      name: t.display,
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

export function mapFhirDiagnosticReport(fhir: FhirDiagnosticReport): LabResult {
  return {
    id: fhir.id,
    orderId: referenceId(fhir.basedOn?.[0]?.reference),
    patientId: referenceId(fhir.subject?.reference),
    performedAt: fhir.effectiveDateTime ?? fhir.issued ?? '',
    reportedAt: fhir.issued,
    results: (fhir.result ?? []).map(mapLabResult),
    conclusion: fhir.conclusion,
    status: fhir.status ?? '',
  };
}
