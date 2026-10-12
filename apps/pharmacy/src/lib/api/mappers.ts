import type { Prescription } from '@/types';

export { mapFhirAllergy, mapFhirPatient, type FhirAllergy, type FhirPatient } from '@curo/web/fhir';
import type { DispenseRecord } from './pharmacy';

// ─── FHIR raw shapes (subset of what the backend returns) ───────────────────

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  statusReason?: { text?: string };
  authoredOn?: string;
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
    performer?: { reference?: string };
    quantity?: { value?: number; unit?: string };
    expectedSupplyDuration?: { value?: number };
    validityPeriod?: { end?: string };
  };
  note?: Array<{ text?: string }>;
  extension?: Array<{ url: string; valueString?: string; valueInteger?: number }>;
}

export interface FhirMedicationDispense {
  resourceType: 'MedicationDispense';
  id?: string;
  meta?: { lastUpdated?: string };
  status?: string;
  medicationCodeableConcept?: {
    text?: string;
    coding?: Array<{ code?: string; display?: string }>;
  };
  subject?: { reference?: string };
  authorizingPrescription?: Array<{ reference?: string }>;
  performer?: Array<{ actor?: { reference?: string; display?: string } }>;
  quantity?: { value?: number | string; unit?: string };
  whenHandedOver?: string;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueInteger?: number;
    valueDecimal?: number | string;
  }>;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapFhirMedicationRequest(fhir: FhirMedicationRequest): Prescription {
  const patientId = fhir.subject?.reference?.replace('Patient/', '') ?? '';
  const encounterId = fhir.encounter?.reference?.replace('Encounter/', '') ?? '';
  const doctorId = fhir.requester?.reference?.replace('Practitioner/', '') ?? '';
  const statusMap: Record<string, Prescription['status']> = {
    draft: 'draft', active: 'sent_to_pharmacy', 'on-hold': 'on_hold', completed: 'completed',
    cancelled: 'cancelled', stopped: 'cancelled',
  };

  const dosage = fhir.dosageInstruction?.[0];
  const supply = fhir.dispenseRequest;
  const createdAt = fhir.authoredOn ?? fhir.meta?.lastUpdated ?? '';

  return {
    id: fhir.id,
    patientId,
    encounterId,
    doctorId,
    status: statusMap[fhir.status] ?? 'draft',
    createdAt,
    sentAt: fhir.status === 'active' ? createdAt : null,
    items: [{
      id: fhir.id,
      medicationId: fhir.medicationCodeableConcept?.coding?.[0]?.code ?? '',
      displayName: fhir.medicationCodeableConcept?.text ?? fhir.medicationCodeableConcept?.coding?.[0]?.display ?? '',
      route: dosage?.route?.text ?? '',
      frequency: dosage?.timing?.code?.text ?? '',
      durationDays: supply?.expectedSupplyDuration?.value ?? null,
      quantity: supply?.quantity?.value ?? 1,
      quantityUnit: supply?.quantity?.unit ?? '',
      instructions: dosage?.text ?? '',
    }],
    notesToPharmacy: fhir.note?.[0]?.text ?? '',
    holdReason: fhir.statusReason?.text ?? '',
    pharmacyId: supply?.performer?.reference?.replace('Organization/', '') ?? null,
  };
}

function referenceId(reference?: string): string {
  return reference?.split('/').pop() ?? '';
}

function extensionValue(
  extensions: FhirMedicationDispense['extension'],
  url: string,
): string | number | undefined {
  const ext = extensions?.find(e => e.url === url);
  return ext?.valueString ?? ext?.valueDecimal ?? ext?.valueInteger ?? ext?.valueCode;
}

function numericValue(value: unknown): number {
  return Number(value) || 0;
}

export function mapFhirMedicationDispense(fhir: FhirMedicationDispense | DispenseRecord): DispenseRecord {
  if ('items' in fhir && Array.isArray(fhir.items)) {
    return {
      id: fhir.id ?? '',
      prescriptionId: fhir.prescriptionId ?? '',
      patientId: fhir.patientId ?? '',
      dispensedBy: fhir.dispensedBy ?? '',
      dispensedAt: fhir.dispensedAt ?? '',
      receiptNumber: fhir.receiptNumber ?? '',
      totalAmount: numericValue(fhir.totalAmount),
      items: fhir.items.map(item => ({
        medicationName: item.medicationName ?? '',
        quantity: numericValue(item.quantity),
        unitPrice: numericValue(item.unitPrice),
        subtotal: numericValue(item.subtotal),
      })),
    };
  }

  const dispense = fhir as FhirMedicationDispense;
  const ext = dispense.extension ?? [];
  const quantity = numericValue(dispense.quantity?.value);
  const unitPrice = numericValue(extensionValue(ext, 'urn:curo:unitPrice'));
  const totalAmount = numericValue(
    extensionValue(ext, 'urn:curo:totalAmount') ?? extensionValue(ext, 'urn:curo:totalPrice'),
  );
  const subtotal = totalAmount || unitPrice * quantity;
  const medicationName = dispense.medicationCodeableConcept?.text
    ?? dispense.medicationCodeableConcept?.coding?.[0]?.display
    ?? '';

  return {
    id: dispense.id ?? '',
    prescriptionId: referenceId(dispense.authorizingPrescription?.[0]?.reference),
    patientId: referenceId(dispense.subject?.reference),
    dispensedBy: String(
      extensionValue(ext, 'urn:curo:dispenserName')
        ?? dispense.performer?.[0]?.actor?.display
        ?? referenceId(dispense.performer?.[0]?.actor?.reference),
    ),
    dispensedAt: dispense.whenHandedOver ?? dispense.meta?.lastUpdated ?? '',
    receiptNumber: String(extensionValue(ext, 'urn:curo:receiptNumber') ?? ''),
    totalAmount: subtotal,
    items: [{
      medicationName,
      quantity,
      unitPrice,
      subtotal,
    }],
  };
}
