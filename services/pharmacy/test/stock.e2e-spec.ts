import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { MedicationCatalog } from '../src/entities/medication-catalog.entity';
import { Stock } from '../src/entities/stock.entity';
import type { StockGroup } from '../src/pharmacy/pharmacy.service';

/** An ISO date `days` from today (negative for the past). */
const daysFromToday = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe('stock', () => {
  let svc: ServiceUnderTest;
  const pharmacy = randomUUID();
  const otherPharmacy = randomUUID();
  const pharmacist = (organizationId: string | null = pharmacy) =>
    svc.as(UserRole.PHARMACIST, { organizationId });

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /**
   * A drug of its own, stocked with `batches` (at the tests' pharmacy unless a
   * batch says otherwise); returns its code.
   */
  async function stock(batches: Partial<Stock>[]) {
    const medicationCode = `TEST-${randomUUID()}`;
    await svc.db.getRepository(Stock).save(
      batches.map((b) => ({
        medicationCode,
        medicationName: 'Amoxicillin 500mg',
        reorderThreshold: 10,
        organizationId: pharmacy,
        ...b,
      })),
    );
    return medicationCode;
  }

  /** The entries `path` returns for `codes`, keyed by drug, as the pharmacist. */
  async function entriesFor(path: string, ...codes: string[]) {
    const res = await svc.api.get(path).set(pharmacist().headers).expect(200);
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

  describe("a pharmacy's own stock", () => {
    it('shows a pharmacist only their pharmacy, whatever they ask for', async () => {
      const drug = await stock([
        { batchNumber: 'HERE', quantity: 3 },
        {
          batchNumber: 'ELSEWHERE',
          quantity: 500,
          organizationId: otherPharmacy,
        },
      ]);

      const res = await svc.api
        .get('/stock/grouped')
        .query({ organizationId: otherPharmacy })
        .set(pharmacist().headers)
        .expect(200);

      const groups = (res.body as StockGroup[]).filter(
        (g) => g.medicationCode === drug,
      );
      expect(groups).toEqual([
        expect.objectContaining({
          organizationId: pharmacy,
          usableQuantity: 3,
          low: true,
        }),
      ]);
    });

    it('shows a doctor the pharmacy they pick, or each pharmacy apart', async () => {
      const drug = await stock([
        { quantity: 3 },
        { quantity: 500, organizationId: otherPharmacy },
      ]);
      const grouped = async (query: object) => {
        const res = await svc.api
          .get('/stock/grouped')
          .query(query)
          .set(svc.as(UserRole.DOCTOR).headers)
          .expect(200);
        return (res.body as StockGroup[])
          .filter((g) => g.medicationCode === drug)
          .map((g) => [g.organizationId, g.usableQuantity]);
      };

      expect(await grouped({ organizationId: otherPharmacy })).toEqual([
        [otherPharmacy, 500],
      ]);
      expect(await grouped({})).toEqual(
        expect.arrayContaining([
          [pharmacy, 3],
          [otherPharmacy, 500],
        ]),
      );
    });

    /** A drug of its own in the prescribing catalog; returns its code. */
    async function catalogDrug() {
      const drug = await svc.db.getRepository(MedicationCatalog).save({
        id: `TEST-${randomUUID()}`,
        name: 'Amoxicillin 500mg Capsule',
        genericName: 'Amoxicillin',
        form: 'capsule',
        strength: '500mg',
      });
      return drug.id;
    }

    it("receives stock into the pharmacist's pharmacy, not the one the body names", async () => {
      const res = await svc.api
        .post('/stock')
        .set(pharmacist().headers)
        .send({
          medicationCode: await catalogDrug(),
          quantity: 50,
          organizationId: otherPharmacy,
        })
        .expect(201);

      await expect(
        svc.db
          .getRepository(Stock)
          .findOneByOrFail({ id: (res.body as Stock).id }),
      ).resolves.toMatchObject({ organizationId: pharmacy, quantity: 50 });
    });

    it('names received stock as the catalog does, whatever the body says', async () => {
      const res = await svc.api
        .post('/stock')
        .set(pharmacist().headers)
        .send({
          medicationCode: await catalogDrug(),
          medicationName: 'Something else',
          quantity: 10,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        medicationName: 'Amoxicillin 500mg Capsule',
        genericName: 'Amoxicillin',
        form: 'capsule',
        strength: '500mg',
      });
    });

    it('turns away a drug that is not in the catalog', async () => {
      await svc.api
        .post('/stock')
        .set(pharmacist().headers)
        .send({ medicationCode: `TEST-${randomUUID()}`, quantity: 10 })
        .expect(400);
    });

    it("can't correct another pharmacy's batch", async () => {
      const drug = await stock([
        { quantity: 40, organizationId: otherPharmacy },
      ]);
      const batch = await svc.db
        .getRepository(Stock)
        .findOneByOrFail({ medicationCode: drug });

      await svc.api
        .put(`/stock/${batch.id}`)
        .set(pharmacist().headers)
        .send({ quantity: 0 })
        .expect(404);

      await expect(
        svc.db.getRepository(Stock).findOneByOrFail({ id: batch.id }),
      ).resolves.toMatchObject({ quantity: 40 });
    });

    it('turns away a pharmacist not yet assigned to a pharmacy', async () => {
      await svc.api
        .get('/stock/grouped')
        .set(pharmacist(null).headers)
        .expect(403);
      await svc.api
        .post('/stock')
        .set(pharmacist(null).headers)
        .send({ medicationCode: 'X', quantity: 1 })
        .expect(403);
    });

    it('leaves receiving stock to pharmacists', async () => {
      await svc.api
        .post('/stock')
        .set(svc.as(UserRole.SUPER_ADMIN).headers)
        .send({ medicationCode: 'X', quantity: 1 })
        .expect(403);
    });
  });
});
