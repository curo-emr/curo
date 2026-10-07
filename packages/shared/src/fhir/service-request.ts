import type { ServiceRequest } from '../database';

/**
 * A lab order as a FHIR ServiceRequest, the one shape every service returns
 * it in. `performer` is the lab it was sent to.
 */
export function toFhirServiceRequest(s: ServiceRequest) {
  return {
    resourceType: 'ServiceRequest',
    id: s.id,
    status: s.status,
    intent: s.intent || 'order',
    category: s.category ? [{ coding: [{ code: s.category }] }] : undefined,
    code: { coding: [{ code: s.code, display: s.display }] },
    subject: { reference: `Patient/${s.patientId}` },
    requester: { reference: `Practitioner/${s.requesterId}` },
    encounter: s.encounterId
      ? { reference: `Encounter/${s.encounterId}` }
      : undefined,
    performer: s.performerOrganizationId
      ? [{ reference: `Organization/${s.performerOrganizationId}` }]
      : undefined,
    authoredOn: s.authoredOn,
    priority: s.priority,
    note: s.note ? [{ text: s.note }] : undefined,
    extension: [
      s.qrCodeId && { url: 'urn:curo:qrCodeId', valueString: s.qrCodeId },
    ].filter(Boolean),
    testPanel: s.testPanel,
    receivedAt: s.receivedAt,
    completedAt: s.completedAt,
  };
}
