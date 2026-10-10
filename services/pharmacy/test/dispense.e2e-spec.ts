import { randomUUID } from 'node:crypto';
import { MedicationRequest, Notification } from '@curo/shared/database';
import {
  MedicationRequestStatus,
  NotificationEventType,
  UserRole,
} from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { MedicationDispense } from '../src/entities/medication-dispense.entity';
import { Stock } from '../src/entities/stock.entity';

/** An ISO date `days` from today (negative for the past). */
const daysFromToday = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe('POST /dispense', () => {
  let svc: ServiceUnderTest;
  /** The pharmacy the tests dispense at; another is a branch elsewhere. */
  const pharmacy = randomUUID();
  const otherPharmacy = randomUUID();

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /**
   * An active prescription for a drug of its own, stocked with `batches` (at
   * the tests' pharmacy unless a batch says otherwise).
   */
  async function prescribe(quantityValue: number, batches: Partial<Stock>[]) {
    const drug = { medicationCode: `TEST-${randomUUID()}` };
    await svc.db.getRepository(Stock).save(
      batches.map((b) => ({
        ...drug,
        medicationName: 'Amoxicillin 500mg',
        organizationId: pharmacy,
        ...b,
      })),
    );
    return svc.db.getRepository(MedicationRequest).save({
      ...drug,
      medicationDisplay: 'Amoxicillin 500mg',
      patientId: randomUUID(),
      practitionerId: randomUUID(),
      status: MedicationRequestStatus.ACTIVE,
      quantityValue,
    });
  }

  /** Another active prescription for the same drug as `rx`. */
  const prescribeAgain = (rx: MedicationRequest) =>
    svc.db.getRepository(MedicationRequest).save({
      ...rx,
      id: undefined,
      status: MedicationRequestStatus.ACTIVE,
    });

  /** Units left in each of the prescribed drug's batches, by batch number. */
  async function stockLeft(rx: MedicationRequest) {
    const batches = await svc.db
      .getRepository(Stock)
      .findBy({ medicationCode: rx.medicationCode });
    return Object.fromEntries(batches.map((b) => [b.batchNumber, b.quantity]));
  }

  const statusOf = async (rx: MedicationRequest) =>
    (
      await svc.db
        .getRepository(MedicationRequest)
        .findOneByOrFail({ id: rx.id })
    ).status;

  const dispensesOf = (rx: MedicationRequest) =>
    svc.db
      .getRepository(MedicationDispense)
      .countBy({ medicationRequestId: rx.id });

  const dispense = (rx: MedicationRequest, at: string | null = pharmacy) =>
    svc.api
      .post('/dispense')
      .set(svc.as(UserRole.PHARMACIST, { organizationId: at }).headers)
      .send({ medicationRequestId: rx.id });

  it('draws the earliest-expiring stock first, skips expired batches and prices from the batches used', async () => {
    const rx = await prescribe(10, [
      {
        batchNumber: 'EXPIRED',
        quantity: 100,
        expiryDate: daysFromToday(-1),
        unitPrice: 1,
      },
      {
        batchNumber: 'SOON',
        quantity: 4,
        expiryDate: daysFromToday(30),
        unitPrice: 2.5,
      },
      {
        batchNumber: 'LATER',
        quantity: 100,
        expiryDate: daysFromToday(200),
        unitPrice: 3,
      },
      { batchNumber: 'UNDATED', quantity: 100, unitPrice: 9 },
    ]);

    const res = await dispense(rx).expect(201);

    expect(res.body).toMatchObject({
      resourceType: 'MedicationDispense',
      status: 'completed',
      quantity: { value: 10 },
      extension: expect.arrayContaining([
        { url: 'urn:curo:batchNumber', valueString: 'SOON×4, LATER×6' },
        { url: 'urn:curo:totalPrice', valueDecimal: 28 }, // 4 × 2.50 + 6 × 3.00
        { url: 'urn:curo:unitPrice', valueDecimal: 2.8 },
      ]) as unknown,
    });
    expect(await stockLeft(rx)).toEqual({
      EXPIRED: 100,
      SOON: 0,
      LATER: 94,
      UNDATED: 100,
    });
    expect(await statusOf(rx)).toBe(MedicationRequestStatus.COMPLETED);
  });

  it('refuses a dispense the usable stock cannot cover, and changes nothing', async () => {
    const rx = await prescribe(10, [
      { batchNumber: 'GOOD', quantity: 3, expiryDate: daysFromToday(30) },
      { batchNumber: 'EXPIRED', quantity: 50, expiryDate: daysFromToday(-1) },
    ]);

    const res = await dispense(rx).expect(409);

    expect(res.body).toMatchObject({
      message: expect.stringContaining('3 available, 10 needed') as unknown,
    });
    expect(await stockLeft(rx)).toEqual({ GOOD: 3, EXPIRED: 50 });
    expect(await statusOf(rx)).toBe(MedicationRequestStatus.ACTIVE);
    expect(await dispensesOf(rx)).toBe(0);
  });

  it('dispenses a prescription once when two pharmacists submit it at the same time', async () => {
    const rx = await prescribe(10, [{ batchNumber: 'B1', quantity: 100 }]);

    const results = await Promise.all([dispense(rx), dispense(rx)]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockLeft(rx)).toEqual({ B1: 90 });
    expect(await dispensesOf(rx)).toBe(1);
  });

  it('draws only from stock at the dispensing pharmacy', async () => {
    const rx = await prescribe(10, [
      {
        batchNumber: 'ELSEWHERE',
        quantity: 100,
        organizationId: otherPharmacy,
      },
      { batchNumber: 'HERE', quantity: 4 },
    ]);

    const res = await dispense(rx).expect(409);

    expect(res.body).toMatchObject({
      message: expect.stringContaining('4 available, 10 needed') as unknown,
    });
    expect(await stockLeft(rx)).toEqual({ ELSEWHERE: 100, HERE: 4 });
  });

  it('records the pharmacy it was dispensed at', async () => {
    const rx = await prescribe(1, [{ batchNumber: 'B1', quantity: 5 }]);

    await dispense(rx).expect(201);

    await expect(
      svc.db
        .getRepository(MedicationDispense)
        .findOneByOrFail({ medicationRequestId: rx.id }),
    ).resolves.toMatchObject({ organizationId: pharmacy });
  });

  it('dispenses only a prescription sent to this pharmacy, or to none', async () => {
    const sendTo = async (at: string | null) => {
      const rx = await prescribe(1, [{ batchNumber: 'B1', quantity: 5 }]);
      return svc.db
        .getRepository(MedicationRequest)
        .save({ ...rx, performerOrganizationId: at });
    };
    const elsewhere = await sendTo(otherPharmacy);

    const res = await dispense(elsewhere).expect(403);

    expect(res.body).toMatchObject({
      message: 'This prescription was sent to another pharmacy',
    });
    expect(await statusOf(elsewhere)).toBe(MedicationRequestStatus.ACTIVE);
    expect(await stockLeft(elsewhere)).toEqual({ B1: 5 });
    await dispense(await sendTo(pharmacy)).expect(201);
    await dispense(await sendTo(null)).expect(201);
  });

  it('is refused to a pharmacist not yet assigned to a pharmacy', async () => {
    const rx = await prescribe(1, [{ batchNumber: 'B1', quantity: 5 }]);

    await dispense(rx, null).expect(403);

    expect(await statusOf(rx)).toBe(MedicationRequestStatus.ACTIVE);
  });

  it('is refused to roles other than pharmacist', async () => {
    const rx = await prescribe(1, [{ batchNumber: 'B1', quantity: 5 }]);

    for (const role of [UserRole.DOCTOR, UserRole.SUPER_ADMIN])
      await svc.api
        .post('/dispense')
        .set(svc.as(role).headers)
        .send({ medicationRequestId: rx.id })
        .expect(403);
    await svc.api
      .post('/dispense')
      .send({ medicationRequestId: rx.id })
      .expect(401);
    expect(await stockLeft(rx)).toEqual({ B1: 5 });
  });

  describe('low stock', () => {
    /**
     * Staff working at `organizationId`, as the auth service stores them (a
     * practitioner and its login); returns the login's user id.
     */
    async function account(
      role: UserRole,
      { isActive = true, organizationId = pharmacy } = {},
    ) {
      const [practitioner] = await svc.db.query<{ id: string }[]>(
        `INSERT INTO practitioners ("firstName", "lastName", role, "organizationId")
         VALUES ('Test', 'Staff', $1, $2) RETURNING id`,
        [role, organizationId],
      );
      const [user] = await svc.db.query<{ id: string }[]>(
        `INSERT INTO users (email, "passwordHash", role, "isActive", "practitionerId")
         VALUES ($1, 'x', $2, $3, $4) RETURNING id`,
        [`${randomUUID()}@curo.test`, role, isActive, practitioner.id],
      );
      return user.id;
    }

    /** Low-stock alerts about the prescribed drug in `userId`'s inbox. */
    const alertsFor = (userId: string, rx: MedicationRequest) =>
      svc.db.getRepository(Notification).findBy({
        recipientId: userId,
        eventType: NotificationEventType.LOW_STOCK_ALERT,
        relatedResourceId: rx.medicationCode,
      });

    it('alerts every active pharmacist at the pharmacy when a dispense takes the drug to its reorder level', async () => {
      const pharmacists = [
        await account(UserRole.PHARMACIST),
        await account(UserRole.PHARMACIST),
      ];
      const inactive = await account(UserRole.PHARMACIST, { isActive: false });
      const elsewhere = await account(UserRole.PHARMACIST, {
        organizationId: otherPharmacy,
      });
      const doctor = await account(UserRole.DOCTOR);
      const rx = await prescribe(6, [
        {
          batchNumber: 'B1',
          quantity: 15,
          reorderThreshold: 10,
          unit: 'tablets',
        },
      ]);

      await dispense(rx).expect(201);

      for (const pharmacist of pharmacists)
        await expect(alertsFor(pharmacist, rx)).resolves.toEqual([
          expect.objectContaining({
            recipientRole: UserRole.PHARMACIST,
            message:
              'Amoxicillin 500mg is low: 9 tablets left (reorder at 10).',
            relatedResourceType: 'Medication',
            isRead: false,
          }),
        ]);
      await expect(alertsFor(inactive, rx)).resolves.toEqual([]);
      await expect(alertsFor(elsewhere, rx)).resolves.toEqual([]);
      await expect(alertsFor(doctor, rx)).resolves.toEqual([]);
    });

    it('stays quiet while the drug is above its level, and once it is already low', async () => {
      const pharmacist = await account(UserRole.PHARMACIST);
      const rx = await prescribe(5, [
        { batchNumber: 'B1', quantity: 20, reorderThreshold: 10 },
      ]);

      await dispense(rx).expect(201); // 20 → 15: above the level
      await expect(alertsFor(pharmacist, rx)).resolves.toEqual([]);

      await dispense(await prescribeAgain(rx)).expect(201); // 15 → 10: crosses
      await dispense(await prescribeAgain(rx)).expect(201); // 10 → 5: already low
      await expect(alertsFor(pharmacist, rx)).resolves.toHaveLength(1);
    });

    it('alerts once when two dispenses that would each cross run at the same time', async () => {
      const pharmacist = await account(UserRole.PHARMACIST);
      const rx = await prescribe(3, [
        { batchNumber: 'B1', quantity: 12, reorderThreshold: 10 },
      ]);

      const results = await Promise.all([
        dispense(rx),
        dispense(await prescribeAgain(rx)),
      ]);

      expect(results.map((r) => r.status)).toEqual([201, 201]);
      expect(await stockLeft(rx)).toEqual({ B1: 6 });
      await expect(alertsFor(pharmacist, rx)).resolves.toHaveLength(1);
    });

    it('sends nothing when the dispense is refused for want of stock', async () => {
      const pharmacist = await account(UserRole.PHARMACIST);
      const rx = await prescribe(20, [
        { batchNumber: 'B1', quantity: 15, reorderThreshold: 10 },
      ]);

      await dispense(rx).expect(409);

      await expect(alertsFor(pharmacist, rx)).resolves.toEqual([]);
    });
  });
});
