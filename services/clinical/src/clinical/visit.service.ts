import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import {
  Condition,
  MedicationRequest,
  Observation,
} from '@curo/shared/database';
import { actorId, type AuthUser } from '@curo/shared/auth';
import { Encounter } from '../entities/encounter.entity';
import { ClinicalNote } from '../entities/clinical-note.entity';
import { EncounterStatus } from '../enums';
import { CompleteVisitDto } from './dto/complete-visit.dto';
import { toFhirEncounter } from './fhir.mapper';
import {
  linkTriageVitals,
  newDiagnosis,
  newEncounter,
  newPrescription,
  newVital,
  saveLabOrder,
} from './clinical-records';

@Injectable()
export class VisitService {
  constructor(private dataSource: DataSource) {}

  /**
   * Records a signed visit (the encounter with its note, vitals, diagnoses,
   * prescriptions and lab orders) in one transaction, so it is saved whole or
   * not at all. Signing the same visit again returns the visit already
   * recorded and writes nothing.
   */
  async complete(dto: CompleteVisitDto, user: AuthUser) {
    const encounter = await this.dataSource.transaction(async (em) => {
      const existing = await em.findOneBy(Encounter, { id: dto.id });
      return existing ? sameVisit(existing, dto) : this.record(em, dto, user);
    });
    return toFhirEncounter(encounter);
  }

  private async record(
    em: EntityManager,
    dto: CompleteVisitDto,
    user: AuthUser,
  ): Promise<Encounter> {
    const { id, note, vitals, diagnoses, prescriptions, labOrders, ...visit } =
      dto;
    const practitionerId = actorId(user);

    const encounter = await em.save(Encounter, {
      ...newEncounter(visit, practitionerId),
      id,
      status: EncounterStatus.COMPLETED,
      periodEnd: new Date(),
    });
    if (visit.appointmentId)
      await linkTriageVitals(em, visit.appointmentId, id);

    const ref = { patientId: visit.patientId, encounterId: id };
    if (note) await em.save(ClinicalNote, { ...note, ...ref, practitionerId });
    await em.save(
      Observation,
      vitals.map((v) => newVital({ ...v, ...ref }, practitionerId, user.role)),
    );
    await em.save(
      Condition,
      diagnoses.map((d) => newDiagnosis(d, ref, practitionerId)),
    );
    await em.save(
      MedicationRequest,
      prescriptions.map((p) =>
        newPrescription({ ...p, ...ref }, practitionerId),
      ),
    );
    for (const order of labOrders)
      await saveLabOrder(em, { ...order, ...ref }, practitionerId);

    return encounter;
  }
}

/** A replayed sign must be for the same patient; a reused id for another is refused. */
function sameVisit(existing: Encounter, dto: CompleteVisitDto): Encounter {
  if (existing.patientId !== dto.patientId)
    throw new ConflictException(
      `Encounter ${dto.id} already exists for another patient`,
    );
  return existing;
}
