import { ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager, EntityTarget } from 'typeorm';
import {
  Condition,
  MedicationRequest,
  Observation,
  QrCode,
  ServiceRequest,
} from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import type { AuthUser } from '@curo/shared/auth';
import { Encounter } from '../entities/encounter.entity';
import { ClinicalNote } from '../entities/clinical-note.entity';
import { EncounterStatus } from '../enums';
import { CompleteVisitDto } from './dto/complete-visit.dto';
import { PRIMARY_DIAGNOSIS_NOTE } from './clinical-records';
import { VisitService } from './visit.service';

const ENCOUNTER_ID = '0b9a4c1e-2f0d-4a7e-9c55-3d1f6a8e2b10';
const PATIENT_ID = 'patient-1';

const doctor: AuthUser = {
  userId: 'user-1',
  email: 'doc@curo.test',
  role: UserRole.DOCTOR,
  practitionerId: 'doctor-1',
  patientId: null,
  name: 'Dr Test',
  organizationId: null,
};

const visit = (overrides: Partial<CompleteVisitDto> = {}): CompleteVisitDto =>
  Object.assign(new CompleteVisitDto(), {
    id: ENCOUNTER_ID,
    patientId: PATIENT_ID,
    appointmentId: 'appointment-1',
    reasonCode: 'Cough',
    note: { subjective: 'Cough for 3 days', additionalNotes: 'Cough' },
    vitals: [
      { code: '8310-5', display: 'Body temperature', valueQuantity: 38.2 },
    ],
    diagnoses: [
      { code: 'J20.9', display: 'Acute bronchitis', isPrimary: true },
      { code: 'R05', display: 'Cough' },
    ],
    prescriptions: [
      { medicationCode: 'AMOX500', medicationDisplay: 'Amoxicillin 500mg' },
    ],
    labOrders: [{ code: '58410-2', display: 'Full blood count' }],
    ...overrides,
  });

/** A VisitService whose transaction runs on an in-memory EntityManager. */
function setup(existing: Encounter | null = null) {
  const saved = new Map<EntityTarget<object>, object[]>();
  let nextId = 0;
  const em = {
    findOneBy: jest.fn().mockResolvedValue(existing),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    save: jest.fn((target: EntityTarget<object>, value: object | object[]) => {
      const rows = ([] as object[])
        .concat(value)
        .map((row) => ({ id: `generated-${++nextId}`, ...row }));
      saved.set(target, [...(saved.get(target) ?? []), ...rows]);
      return Promise.resolve(value instanceof Array ? rows : rows[0]);
    }),
  };
  const dataSource = {
    transaction: <T>(work: (em: EntityManager) => Promise<T>) =>
      work(em as unknown as EntityManager),
  } as unknown as DataSource;
  const rowsOf = <T>(target: EntityTarget<T>) =>
    (saved.get(target as EntityTarget<object>) ?? []) as Partial<T>[];
  return { em, rowsOf, service: new VisitService(dataSource) };
}

describe('VisitService.complete', () => {
  it('records the encounter as completed under the id the client sent', async () => {
    const { rowsOf, service } = setup();

    const result = await service.complete(visit(), doctor);

    expect(result).toMatchObject({ id: ENCOUNTER_ID, status: 'completed' });
    const [encounter] = rowsOf(Encounter);
    expect(encounter).toMatchObject({
      id: ENCOUNTER_ID,
      patientId: PATIENT_ID,
      practitionerId: 'doctor-1',
      status: EncounterStatus.COMPLETED,
    });
    expect(encounter.periodEnd).toBeInstanceOf(Date);
    // The nested records belong on their own tables, not on the encounter.
    expect(encounter).not.toHaveProperty('prescriptions');
  });

  it('saves every record of the visit against the encounter', async () => {
    const { rowsOf, service } = setup();

    await service.complete(visit(), doctor);

    const ref = { patientId: PATIENT_ID, encounterId: ENCOUNTER_ID };
    for (const target of [
      ClinicalNote,
      Observation,
      Condition,
      MedicationRequest,
      ServiceRequest,
    ]) {
      const rows = rowsOf(target);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row).toMatchObject(ref);
    }
    expect(rowsOf(Observation)[0]).toMatchObject({ performerRole: 'DOCTOR' });
    expect(rowsOf(QrCode)).toHaveLength(1);
  });

  it('marks the primary diagnosis', async () => {
    const { rowsOf, service } = setup();

    await service.complete(visit(), doctor);

    expect(rowsOf(Condition).map((c) => [c.code, c.note])).toEqual([
      ['J20.9', PRIMARY_DIAGNOSIS_NOTE],
      ['R05', undefined],
    ]);
  });

  it("links the appointment's triage vitals to the encounter", async () => {
    const { em, service } = setup();

    await service.complete(visit(), doctor);

    expect(em.update).toHaveBeenCalledWith(
      Observation,
      expect.objectContaining({ appointmentId: 'appointment-1' }),
      { encounterId: ENCOUNTER_ID },
    );
  });

  it('returns the recorded visit without writing when it is signed again', async () => {
    const recorded = Object.assign(new Encounter(), {
      id: ENCOUNTER_ID,
      patientId: PATIENT_ID,
      status: EncounterStatus.COMPLETED,
    });
    const { em, service } = setup(recorded);

    const result = await service.complete(visit(), doctor);

    expect(result).toMatchObject({ id: ENCOUNTER_ID, status: 'completed' });
    expect(em.save).not.toHaveBeenCalled();
    expect(em.update).not.toHaveBeenCalled();
  });

  it("refuses an id that is already another patient's encounter", async () => {
    const other = Object.assign(new Encounter(), {
      id: ENCOUNTER_ID,
      patientId: 'patient-2',
    });
    const { em, service } = setup(other);

    await expect(service.complete(visit(), doctor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(em.save).not.toHaveBeenCalled();
  });
});
