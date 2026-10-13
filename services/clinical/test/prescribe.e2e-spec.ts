import { randomUUID } from 'node:crypto';
import { MedicationRequest } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import {
  addCatalogDrug,
  addOrganization,
  registerPatient,
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';

describe('POST /prescriptions', () => {
  let svc: ServiceUnderTest;
  let doctor: TestActor;
  let pharmacy: string;
  let patientId: string;
  let drug: string;

  beforeAll(async () => {
    svc = await startService(AppModule);
    doctor = await svc.as(UserRole.DOCTOR);
    pharmacy = await addOrganization(svc.db, 'pharmacy');
    patientId = await registerPatient(svc.db);
    drug = await addCatalogDrug(svc.db, { name: 'Azithromycin 500mg Tablet' });
  });

  afterAll(() => svc.close());

  const prescribe = (overrides: object = {}) =>
    svc.api
      .post('/prescriptions')
      .set(doctor.headers)
      .send({
        patientId,
        performerOrganizationId: pharmacy,
        medicationCode: drug,
        quantityValue: 10,
        durationDays: 5,
        ...overrides,
      });

  /** How many prescriptions `patientId` has. */
  const prescriptionsOf = (patientId: string) =>
    svc.db.getRepository(MedicationRequest).countBy({ patientId });

  it('names the drug as the catalog does, whatever the body says', async () => {
    const res = await prescribe({ medicationDisplay: 'QA Fefo' }).expect(201);

    const saved = await svc.db
      .getRepository(MedicationRequest)
      .findOneByOrFail({ id: (res.body as { id: string }).id });
    expect(saved).toMatchObject({
      medicationCode: drug,
      medicationDisplay: 'Azithromycin 500mg Tablet',
    });
  });

  describe('bought outside', () => {
    const outside = (overrides: object) =>
      prescribe({
        boughtOutside: true,
        performerOrganizationId: undefined,
        ...overrides,
      });

    const saved = async (res: { body: unknown }) =>
      svc.db
        .getRepository(MedicationRequest)
        .findOneByOrFail({ id: (res.body as { id: string }).id });

    it('names a drug the catalog does not list as the doctor wrote it, sent to no pharmacy', async () => {
      const res = await outside({
        medicationCode: undefined,
        medicationDisplay: '  Rosuvastatin 10mg Tablet ',
      }).expect(201);

      expect(await saved(res)).toMatchObject({
        boughtOutside: true,
        performerOrganizationId: null,
        medicationCode: null,
        medicationDisplay: 'Rosuvastatin 10mg Tablet',
      });
    });

    it('names a catalog drug as the catalog does, and sends it to no pharmacy even when one is given', async () => {
      const res = await outside({ performerOrganizationId: pharmacy }).expect(
        201,
      );

      expect(await saved(res)).toMatchObject({
        boughtOutside: true,
        performerOrganizationId: null,
        medicationCode: drug,
        medicationDisplay: 'Azithromycin 500mg Tablet',
      });
    });

    it('turns away one with neither a catalog drug nor a name', async () => {
      const before = await prescriptionsOf(patientId);

      await outside({ medicationCode: undefined }).expect(400);
      await outside({
        medicationCode: undefined,
        medicationDisplay: '   ',
      }).expect(400);

      expect(await prescriptionsOf(patientId)).toBe(before);
    });
  });

  it('turns away a prescription for the pharmacy that names none, or a drug only by name', async () => {
    const before = await prescriptionsOf(patientId);

    await prescribe({ performerOrganizationId: undefined }).expect(400);
    await prescribe({
      medicationCode: undefined,
      medicationDisplay: 'Rosuvastatin 10mg Tablet',
    }).expect(400);

    expect(await prescriptionsOf(patientId)).toBe(before);
  });

  it("turns away a patient who isn't on file", async () => {
    const stranger = randomUUID();

    await prescribe({ patientId: stranger }).expect(400);
    await prescribe({ patientId: 'not-a-uuid' }).expect(400);

    expect(await prescriptionsOf(stranger)).toBe(0);
  });

  it('turns away a drug the catalog does not list, or no longer does', async () => {
    const before = await prescriptionsOf(patientId);
    const withdrawn = await addCatalogDrug(svc.db, { active: false });

    await prescribe({ medicationCode: 'NOT-IN-CATALOG' }).expect(400);
    await prescribe({ medicationCode: withdrawn }).expect(400);

    expect(await prescriptionsOf(patientId)).toBe(before);
  });

  it('turns away a quantity or a duration that is not a whole number above zero', async () => {
    const before = await prescriptionsOf(patientId);

    for (const value of [0, -5, 2.5]) {
      await prescribe({ quantityValue: value }).expect(400);
      await prescribe({ durationDays: value }).expect(400);
    }

    expect(await prescriptionsOf(patientId)).toBe(before);
  });
});
