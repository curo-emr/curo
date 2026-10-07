import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { MedicationDispense } from '../src/entities/medication-dispense.entity';
import { MedicationDispenseStatus } from '../src/enums';

describe('Dispense history', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /** The pharmacy the tests' pharmacist works at; another is a branch elsewhere. */
  const pharmacy = randomUUID();
  const otherPharmacy = randomUUID();

  const pharmacist = () =>
    svc.as(UserRole.PHARMACIST, { organizationId: pharmacy });

  /**
   * A completed dispense at the tests' pharmacy, with `fields` over a single
   * box of a drug of its own.
   */
  const saveDispense = (fields: Partial<MedicationDispense> = {}) =>
    svc.db.getRepository(MedicationDispense).save({
      organizationId: pharmacy,
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

  /** The ids of the dispenses GET /dispense lists to `actor` for `query`. */
  const listed = async (actor: TestActor, query: object = {}) => {
    const res = await svc.api
      .get('/dispense')
      .query({ pageSize: 100, ...query })
      .set(actor.headers)
      .expect(200);
    const { entry = [] } = res.body as {
      entry?: { resource: { id: string } }[];
    };
    return entry.map((e) => e.resource.id);
  };

  describe('GET /dispense', () => {
    it("lists a pharmacist only their own pharmacy's dispenses", async () => {
      const here = await saveDispense();
      const elsewhere = await saveDispense({ organizationId: otherPharmacy });

      const mine = await listed(pharmacist(), {
        search: here.medicationRequestId,
      });
      expect(mine).toEqual([here.id]);
      expect(
        await listed(pharmacist(), { search: elsewhere.medicationRequestId }),
      ).toEqual([]);
      // Even when they ask for another pharmacy's.
      expect(
        await listed(pharmacist(), {
          organizationId: otherPharmacy,
          search: elsewhere.medicationRequestId,
        }),
      ).toEqual([]);
    });

    it("lists one patient's or prescription's dispenses from every pharmacy", async () => {
      const patientId = randomUUID();
      const here = await saveDispense({ patientId });
      const elsewhere = await saveDispense({
        patientId,
        organizationId: otherPharmacy,
      });

      expect((await listed(pharmacist(), { patientId })).sort()).toEqual(
        [here.id, elsewhere.id].sort(),
      );
      expect(
        await listed(pharmacist(), {
          prescriptionId: elsewhere.medicationRequestId,
        }),
      ).toEqual([elsewhere.id]);
    });

    it("lists the super admin every pharmacy's dispenses, or one pharmacy's", async () => {
      const admin = svc.as(UserRole.SUPER_ADMIN);
      const tag = randomUUID();
      const here = await saveDispense({ medicationDisplay: tag });
      const elsewhere = await saveDispense({
        medicationDisplay: tag,
        organizationId: otherPharmacy,
      });

      expect((await listed(admin, { search: tag })).sort()).toEqual(
        [here.id, elsewhere.id].sort(),
      );
      expect(
        await listed(admin, { search: tag, organizationId: otherPharmacy }),
      ).toEqual([elsewhere.id]);
    });

    it('finds dispenses by the start of the prescription id, part of the medication name, or the patients a name search matched', async () => {
      const tag = randomUUID().slice(0, 8);
      const byPrescription = await saveDispense();
      const byName = await saveDispense({
        medicationDisplay: `Paracetamol ${tag} 500mg`,
      });
      const byPatient = await saveDispense();
      await saveDispense();

      const ids = (query: object) => listed(pharmacist(), query);

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
    const summary = async (actor = pharmacist(), query: object = {}) =>
      (
        await svc.api
          .get('/dispense/summary')
          .query(query)
          .set(actor.headers)
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

    it("counts only a pharmacist's own pharmacy's dispenses", async () => {
      const admin = svc.as(UserRole.SUPER_ADMIN);
      const elsewhere = { organizationId: otherPharmacy };
      const [mine, theirs] = [await summary(), await summary(admin, elsewhere)];

      await saveDispense({ ...elsewhere, totalPrice: 75 });

      expect(await summary()).toEqual(mine);
      await expect(summary(admin, elsewhere)).resolves.toMatchObject({
        count: theirs.count + 1,
        revenue: theirs.revenue + 75,
      });
    });

    it('is refused to doctors', async () => {
      await svc.api
        .get('/dispense/summary')
        .set(svc.as(UserRole.DOCTOR).headers)
        .expect(403);
    });
  });
});
