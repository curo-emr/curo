import { randomUUID } from 'node:crypto';
import { MedicationRequest } from '@curo/shared/database';
import { MedicationRequestStatus, UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { MedicationDispense } from '../src/entities/medication-dispense.entity';
import { Stock } from '../src/entities/stock.entity';

/** An ISO date `days` from today (negative for the past). */
const daysFromToday = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe('POST /dispense', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /** An active prescription for a drug of its own, stocked with `batches`. */
  async function prescribe(quantityValue: number, batches: Partial<Stock>[]) {
    const drug = { medicationCode: `TEST-${randomUUID()}` };
    await svc.db.getRepository(Stock).save(
      batches.map((b) => ({
        ...drug,
        medicationName: 'Amoxicillin 500mg',
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

  const dispense = (rx: MedicationRequest) =>
    svc.api
      .post('/dispense')
      .set(svc.as(UserRole.PHARMACIST).headers)
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

  it('is refused to roles other than pharmacist and admin', async () => {
    const rx = await prescribe(1, [{ batchNumber: 'B1', quantity: 5 }]);

    await svc.api
      .post('/dispense')
      .set(svc.as(UserRole.DOCTOR).headers)
      .send({ medicationRequestId: rx.id })
      .expect(403);
    await svc.api
      .post('/dispense')
      .send({ medicationRequestId: rx.id })
      .expect(401);
    expect(await stockLeft(rx)).toEqual({ B1: 5 });
  });
});
