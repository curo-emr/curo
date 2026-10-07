import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { MedicationDispense } from '../src/entities/medication-dispense.entity';
import { MedicationDispenseStatus } from '../src/enums';

describe('Dispense history', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  const pharmacist = () =>
    svc.as(UserRole.PHARMACIST, { organizationId: randomUUID() });

  /** A completed dispense, with `fields` over a single box of a drug of its own. */
  const saveDispense = (fields: Partial<MedicationDispense> = {}) =>
    svc.db.getRepository(MedicationDispense).save({
      medicationRequestId: randomUUID(),
      patientId: randomUUID(),
      pharmacistId: randomUUID(),
      status: MedicationDispenseStatus.COMPLETED,
      medicationCode: `TEST-${randomUUID()}`,
      medicationDisplay: `Test drug ${randomUUID()}`,
      quantityValue: 1,
      totalPrice: 100,
      ...fields,
    });

  describe('GET /dispense', () => {
    it('finds dispenses by the start of the prescription id, part of the medication name, or the patients a name search matched', async () => {
      const tag = randomUUID().slice(0, 8);
      const byPrescription = await saveDispense();
      const byName = await saveDispense({
        medicationDisplay: `Paracetamol ${tag} 500mg`,
      });
      const byPatient = await saveDispense();
      await saveDispense();

      const ids = async (query: object) => {
        const res = await svc.api
          .get('/dispense')
          .query(query)
          .set(pharmacist().headers)
          .expect(200);
        return (
          res.body as { entry: { resource: { id: string } }[] }
        ).entry.map((e) => e.resource.id);
      };

      expect(
        await ids({
          search: byPrescription.medicationRequestId.slice(0, 8),
        }),
      ).toEqual([byPrescription.id]);
      expect(await ids({ search: tag.toUpperCase() })).toEqual([byName.id]);
      expect(
        await ids({
          search: 'no such drug',
          searchPatientIds: byPatient.patientId,
        }),
      ).toEqual([byPatient.id]);
    });
  });

  describe('GET /dispense/summary', () => {
    const summary = async () =>
      (
        await svc.api
          .get('/dispense/summary')
          .set(pharmacist().headers)
          .expect(200)
      ).body as {
        count: number;
        revenue: number;
        topMedications: { name: string; quantity: number }[];
      };

    it('counts the dispenses, what they took in, and the medications dispensed most', async () => {
      const before = await summary();
      const name = `Most dispensed ${randomUUID()}`;
      await saveDispense({
        medicationDisplay: name,
        quantityValue: 1_000_000,
        totalPrice: 250.5,
      });
      await saveDispense({
        medicationDisplay: name,
        quantityValue: 1_000_000,
        totalPrice: 49.5,
      });

      const after = await summary();
      expect(after.count).toBe(before.count + 2);
      expect(after.revenue).toBeCloseTo(before.revenue + 300);
      expect(after.topMedications[0]).toEqual({ name, quantity: 2_000_000 });
    });

    it('is refused to doctors', async () => {
      await svc.api
        .get('/dispense/summary')
        .set(svc.as(UserRole.DOCTOR).headers)
        .expect(403);
    });
  });
});
