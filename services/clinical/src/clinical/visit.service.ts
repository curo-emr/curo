import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { Condition, Observation } from '@curo/shared/database';
import { actorId, type AuthUser } from '@curo/shared/auth';
import { AuditTrail, auditTarget } from '@curo/shared/audit';
import { Encounter } from '../entities/encounter.entity';
import { ClinicalNote } from '../entities/clinical-note.entity';
import { EncounterStatus } from '../enums';
import { CompleteVisitDto } from './dto/complete-visit.dto';
import { toFhirEncounter } from './fhir.mapper';
import {
  linkTriageVitals,
  newDiagnosis,
  newEncounter,
  savePrescriptions,
  newVital,
  saveLabOrder,
} from './clinical-records';

@Injectable()
export class VisitService {
  constructor(
    private dataSource: DataSource,
    private auditTrail: AuditTrail,
  ) {}

  /**
   * Records a signed visit (the encounter with its note, vitals, diagnoses,
   * prescriptions and lab orders) in one transaction, so it is saved whole or
   * not at all. Signing the same visit again returns the visit already
   * recorded and writes nothing. The visit is audited as one entry on the
   * encounter, listing the records signed with it.
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
    const savedNote =
      note &&
      (await em.save(ClinicalNote, { ...note, ...ref, practitionerId }));
    const savedVitals = await em.save(
      Observation,
      vitals.map((v) => newVital({ ...v, ...ref }, practitionerId, user.role)),
    );
    const savedDiagnoses = await em.save(
      Condition,
      diagnoses.map((d) => newDiagnosis(d, ref, practitionerId)),
    );
    const savedPrescriptions = await savePrescriptions(
      em,
      prescriptions.map((p) => ({ ...p, ...ref })),
      practitionerId,
    );
    const savedLabOrders: string[] = [];
    for (const order of labOrders) {
      const saved = await saveLabOrder(
        em,
        { ...order, ...ref },
        practitionerId,
      );
      savedLabOrders.push(saved.order.id);
    }

    const ids = (records: { id: string }[]) => records.map((r) => r.id);
    await this.auditTrail.record(
      user,
      {
        action: 'CREATE',
        ...auditTarget('Encounter', encounter),
        changes: {
          after: {
            note: savedNote?.id,
            vitals: ids(savedVitals),
            diagnoses: ids(savedDiagnoses),
            prescriptions: ids(savedPrescriptions),
            labOrders: savedLabOrders,
          },
        },
        outcomeDescription: 'Doctor signed the visit',
      },
      em,
    );
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
