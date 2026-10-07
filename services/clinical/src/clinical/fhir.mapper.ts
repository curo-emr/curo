import type {
  MedicationRequest,
  Observation,
  ServiceRequest,
} from '@curo/shared/database';
import type { Encounter } from '../entities/encounter.entity';

export function toFhirEncounter(e: Encounter) {
  return {
    resourceType: 'Encounter',
    id: e.id,
    status: e.status,
    class: {
      code: e.classCode || 'AMB',
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    },
    subject: { reference: `Patient/${e.patientId}` },
    participant: [
      { individual: { reference: `Practitioner/${e.practitionerId}` } },
    ],
    appointment: e.appointmentId
      ? [{ reference: `Appointment/${e.appointmentId}` }]
      : undefined,
    period: { start: e.periodStart, end: e.periodEnd },
    reasonCode: e.reasonCode ? [{ text: e.reasonCode }] : undefined,
    meta: { lastUpdated: e.updatedAt },
  };
}

export function toFhirMedRequest(m: MedicationRequest) {
  return {
    resourceType: 'MedicationRequest',
    id: m.id,
    status: m.status,
    intent: m.intent || 'order',
    medicationCodeableConcept: {
      coding: [{ code: m.medicationCode, display: m.medicationDisplay }],
    },
    subject: { reference: `Patient/${m.patientId}` },
    requester: { reference: `Practitioner/${m.practitionerId}` },
    encounter: m.encounterId
      ? { reference: `Encounter/${m.encounterId}` }
      : undefined,
    authoredOn: m.authoredOn,
    dosageInstruction: [
      {
        text: m.dosageText,
        route: m.route ? { text: m.route } : undefined,
        timing: m.frequency ? { code: { text: m.frequency } } : undefined,
        doseAndRate: m.quantityValue
          ? [{ doseQuantity: { value: m.quantityValue, unit: m.quantityUnit } }]
          : undefined,
      },
    ],
    dispenseRequest: {
      quantity: { value: m.quantityValue, unit: m.quantityUnit },
      expectedSupplyDuration: m.durationDays
        ? { value: m.durationDays, unit: 'days' }
        : undefined,
    },
    note: m.note ? [{ text: m.note }] : undefined,
  };
}

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
    authoredOn: s.authoredOn,
    priority: s.priority,
    note: s.note ? [{ text: s.note }] : undefined,
    extension: [
      s.qrCodeId && { url: 'urn:curo:qrCodeId', valueString: s.qrCodeId },
    ].filter(Boolean),
    testPanel: s.testPanel,
  };
}

export function toFhirObservation(o: Observation) {
  return {
    resourceType: 'Observation',
    id: o.id,
    status: o.status,
    category: o.category ? [{ coding: [{ code: o.category }] }] : undefined,
    code: { coding: [{ code: o.code, display: o.display }] },
    subject: { reference: `Patient/${o.patientId}` },
    performer: [{ reference: `Practitioner/${o.practitionerId}` }],
    encounter: o.encounterId
      ? { reference: `Encounter/${o.encounterId}` }
      : undefined,
    effectiveDateTime: o.effectiveDateTime,
    valueQuantity:
      o.valueQuantity != null
        ? { value: Number(o.valueQuantity), unit: o.valueUnit }
        : undefined,
    valueString: o.valueString,
    component: o.components,
    extension: [
      o.appointmentId && {
        url: 'urn:curo:appointmentId',
        valueString: o.appointmentId,
      },
      o.performerRole && {
        url: 'urn:curo:performerRole',
        valueString: o.performerRole,
      },
    ].filter(Boolean),
  };
}
