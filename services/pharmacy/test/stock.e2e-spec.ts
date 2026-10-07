import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { Stock } from '../src/entities/stock.entity';
import type { StockGroup } from '../src/pharmacy/pharmacy.service';

/** An ISO date `days` from today (negative for the past). */
const daysFromToday = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe('stock views', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /** A drug of its own, stocked with `batches`; returns its code. */
  async function stock(batches: Partial<Stock>[]) {
    const medicationCode = `TEST-${randomUUID()}`;
    await svc.db.getRepository(Stock).save(
      batches.map((b) => ({
        medicationCode,
        medicationName: 'Amoxicillin 500mg',
        reorderThreshold: 10,
        ...b,
      })),
    );
    return medicationCode;
  }

  /** The entries `path` returns for `codes`, keyed by drug. */
  async function entriesFor(path: string, ...codes: string[]) {
    const res = await svc.api
      .get(path)
      .set(svc.as(UserRole.PHARMACIST).headers)
      .expect(200);
    const groups = res.body as StockGroup[];
    return Object.fromEntries(
      groups
        .filter((g) => codes.includes(g.medicationCode))
        .map((g) => [g.medicationCode, g]),
    );
  }

  describe('GET /stock/alerts', () => {
    it('lists a low drug once, however many batches it has', async () => {
      const low = await stock([{ quantity: 4 }, { quantity: 5 }]);

      expect(await entriesFor('/stock/alerts', low)).toEqual({
        [low]: expect.objectContaining({
          usableQuantity: 9,
          reorderLevel: 10,
          low: true,
          batches: [expect.anything(), expect.anything()] as unknown,
        }) as unknown,
      });
    });

    it('leaves out a drug whose batches are each small but together above the level', async () => {
      const fine = await stock([{ quantity: 6 }, { quantity: 6 }]);

      expect(await entriesFor('/stock/alerts', fine)).toEqual({});
    });

    it('does not count expired batches, and uses the highest reorder level', async () => {
      const expiredBulk = await stock([
        { quantity: 8 },
        { quantity: 500, expiryDate: daysFromToday(-1) },
      ]);
      const raisedLevel = await stock([
        { quantity: 20 },
        { quantity: 5, reorderThreshold: 30 },
      ]);

      const alerts = await entriesFor(
        '/stock/alerts',
        expiredBulk,
        raisedLevel,
      );

      expect(alerts[expiredBulk]).toMatchObject({
        usableQuantity: 8,
        reorderLevel: 10,
      });
      expect(alerts[raisedLevel]).toMatchObject({
        usableQuantity: 25,
        reorderLevel: 30,
      });
    });

    it('is refused to doctors', async () => {
      await svc.api
        .get('/stock/alerts')
        .set(svc.as(UserRole.DOCTOR).headers)
        .expect(403);
    });
  });

  it('GET /stock/grouped marks each drug low or not by the same rule, batches in FEFO order', async () => {
    const low = await stock([{ quantity: 3 }]);
    const fine = await stock([
      { batchNumber: 'LATER', quantity: 50, expiryDate: daysFromToday(200) },
      { batchNumber: 'SOON', quantity: 50, expiryDate: daysFromToday(30) },
    ]);

    const groups = await entriesFor('/stock/grouped', low, fine);

    expect(groups[low]).toMatchObject({ usableQuantity: 3, low: true });
    expect(groups[fine]).toMatchObject({ usableQuantity: 100, low: false });
    expect(groups[fine].batches.map((b) => b.batchNumber)).toEqual([
      'SOON',
      'LATER',
    ]);
  });
});
