import { BadRequestException } from '@nestjs/common';
import { IsNull, type DeepPartial, type EntityManager } from 'typeorm';
import * as QRCode from 'qrcode';
import {
  Condition,
  MedicationRequest,
  Observation,
  QrCode,
  ServiceRequest,
  assertPatientOnFile,
} from '@curo/shared/database';
import {
  ConditionClinicalStatus,
  MedicationRequestStatus,
  ObservationStatus,
  ServiceRequestStatus,
} from '@curo/shared/enums';
import { assertActiveOrganization } from '@curo/shared/auth';
import { assertActiveLab, labSampleUrl } from '@curo/shared/lab';
import { clinicDate } from '@curo/shared/config';
import type { Encounter } from '../entities/encounter.entity';
import { EncounterStatus } from '../enums';
import type { CreateEncounterDto } from './dto/create-encounter.dto';
import type { CreateLabOrderDto } from './dto/create-lab-order.dto';
import type { CreatePrescriptionDto } from './dto/create-prescription.dto';
import type { CreateVitalsDto } from './dto/create-vitals.dto';
import type { VisitDiagnosisDto } from './dto/complete-visit.dto';

// How each clinical record is built, shared by the single-record endpoints and
// the signed-visit transaction, so a record's defaults live in one place.
// Helpers that write take the EntityManager of the caller's transaction.

export function newEncounter(
  dto: CreateEncounterDto,
  practitionerId: string,
): DeepPartial<Encounter> {
  return {
    ...dto,
    practitionerId,
    status: EncounterStatus.IN_PROGRESS,
    periodStart: dto.periodStart ? new Date(dto.periodStart) : new Date(),
  };
}

export function newVital(
  dto: CreateVitalsDto,
  practitionerId: string,
  performerRole: string,
): DeepPartial<Observation> {
  return {
    ...dto,
    practitionerId,
    performerRole,
    category: 'vital-signs',
    status: ObservationStatus.FINAL,
    effectiveDateTime: dto.effectiveDateTime
      ? new Date(dto.effectiveDateTime)
      : new Date(),
  };
}

/**
 * Saves prescriptions for a patient on file. One sent to a pharmacy is of a
 * drug in the medication catalog, named as the catalog names it, so the
 * pharmacy can stock and dispense what was prescribed. One bought outside is
 * sent to no pharmacy, and may be of a drug the catalog doesn't list, named as
 * the doctor wrote it.
 */
export async function savePrescriptions(
  em: EntityManager,
  dtos: CreatePrescriptionDto[],
  practitionerId: string,
): Promise<MedicationRequest[]> {
  if (!dtos.length) return [];
  for (const pharmacy of new Set(dtos.map(sentTo)))
    if (pharmacy) await assertActiveOrganization(em, pharmacy, 'pharmacy');
  for (const patientId of new Set(dtos.map((d) => d.patientId)))
    await assertPatientOnFile(em, patientId);
  const names = await catalogNames(
    em,
    dtos.flatMap((d) => d.medicationCode ?? []),
  );
  return em.save(
    MedicationRequest,
    dtos.map((dto) => ({
      ...dto,
      boughtOutside: !!dto.boughtOutside,
      performerOrganizationId: sentTo(dto),
      medicationCode: dto.medicationCode ?? null,
      medicationDisplay: dto.medicationCode
        ? names.get(dto.medicationCode)
        : dto.medicationDisplay,
      practitionerId,
      status: MedicationRequestStatus.ACTIVE,
      intent: 'order',
      authoredOn: new Date(),
    })),
  );
}

/** The pharmacy a prescription goes to; none when it is bought outside. */
const sentTo = (dto: CreatePrescriptionDto): string | null =>
  dto.boughtOutside ? null : (dto.performerOrganizationId ?? null);

/** The catalog's name for each of `codes`; one it doesn't list (or no longer does) is a 400. */
async function catalogNames(
  em: EntityManager,
  codes: string[],
): Promise<Map<string, string>> {
  // medication_catalog is owned by the pharmacy service, so it is read with raw SQL.
  const rows = await em.query<{ id: string; name: string }[]>(
    'SELECT id, name FROM medication_catalog WHERE id = ANY($1) AND active',
    [codes],
  );
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const unknown = codes.find((code) => !names.has(code));
  if (unknown)
    throw new BadRequestException(
      `${unknown} is not in the medication catalog. Prescribe a medicine from the catalog.`,
    );
  return names;
}

// Read back by the doctor portal: a visit's diagnoses are encounter-diagnosis
// conditions, and the primary one carries this note.
export const ENCOUNTER_DIAGNOSIS = 'encounter-diagnosis';
export const PRIMARY_DIAGNOSIS_NOTE = 'Primary diagnosis';

export function newDiagnosis(
  diagnosis: VisitDiagnosisDto,
  ref: { patientId: string; encounterId: string },
  practitionerId: string,
): DeepPartial<Condition> {
  return {
    ...ref,
    practitionerId,
    code: diagnosis.code,
    display: diagnosis.display,
    clinicalStatus: ConditionClinicalStatus.ACTIVE,
    category: ENCOUNTER_DIAGNOSIS,
    onsetDate: clinicDate(),
    note: diagnosis.isPrimary ? PRIMARY_DIAGNOSIS_NOTE : undefined,
  };
}

/** Pulls a visit's triage vitals (recorded before the encounter existed) into its encounter. */
export async function linkTriageVitals(
  em: EntityManager,
  appointmentId: string,
  encounterId: string,
): Promise<void> {
  await em.update(
    Observation,
    { appointmentId, encounterId: IsNull() },
    { encounterId },
  );
}

/** Saves a lab order, sent to the lab it names, with its order-level QR label. */
export async function saveLabOrder(
  em: EntityManager,
  dto: CreateLabOrderDto,
  requesterId: string,
): Promise<{ order: ServiceRequest; qr: QrCode }> {
  await assertActiveLab(em, dto.performerOrganizationId);
  const order = await em.save(ServiceRequest, {
    ...dto,
    requesterId,
    status: ServiceRequestStatus.ACTIVE,
    category: 'laboratory',
    authoredOn: new Date(),
  });
  const encodedUrl = labSampleUrl(order.id);
  const qr = await em.save(QrCode, {
    serviceRequestId: order.id,
    encodedUrl,
    imageBase64: await QRCode.toDataURL(encodedUrl),
  });
  await em.update(ServiceRequest, order.id, { qrCodeId: qr.id });
  order.qrCodeId = qr.id;
  return { order, qr };
}
