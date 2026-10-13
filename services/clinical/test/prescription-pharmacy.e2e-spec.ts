import { randomUUID } from 'node:crypto';
import { MedicationRequest } from '@curo/shared/database';
import { MedicationRequestStatus, UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';

describe('Prescriptions by pharmacy', () => {
  let svc: ServiceUnderTest;
  const pharmacy = randomUUID();
  const otherPharmacy = randomUUID();

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /** A waiting prescription sent to `performerOrganizationId`; returns its id. */
  const sentTo = async (
    performerOrganizationId: string | null,
    patientId: string = randomUUID(),
    boughtOutside = false,
  ) =>
    (
      await svc.db.getRepository(MedicationRequest).save({
        patientId,
        practitionerId: randomUUID(),
        status: MedicationRequestStatus.ACTIVE,
        medicationCode: 'med_0301',
        medicationDisplay: 'Amlodipine 5mg Tablet',
        performerOrganizationId,
        boughtOutside,
      })
    ).id;

  /** A prescription the patient buys outside; returns its id. */
  const boughtOutside = (patientId: string = randomUUID()) =>
    sentTo(null, patientId, true);

  describe('GET /prescriptions/pending', () => {
    /** The ids on the waiting list, for whoever `headers` sign in as. */
    async function pendingFor(headers: Record<string, string>) {
      const res = await svc.api
        .get('/prescriptions/pending')
        .set(headers)
        .expect(200);
      return (res.body as { id: string }[]).map((r) => r.id);
    }

    it("shows a pharmacist their pharmacy's prescriptions and those that name none, not another's", async () => {
      const ours = await sentTo(pharmacy);
      const unnamed = await sentTo(null);
      const theirs = await sentTo(otherPharmacy);
      const outside = await boughtOutside();

      const listed = await pendingFor(
        (await svc.as(UserRole.PHARMACIST, { organizationId: pharmacy }))
          .headers,
      );

      expect(listed).toEqual(expect.arrayContaining([ours, unnamed]));
      expect(listed).not.toContain(theirs);
      expect(listed).not.toContain(outside);
    });

    it("shows a doctor every pharmacy's, not what is bought outside", async () => {
      const ours = await sentTo(pharmacy);
      const theirs = await sentTo(otherPharmacy);
      const outside = await boughtOutside();

      const listed = await pendingFor((await svc.as(UserRole.DOCTOR)).headers);
      expect(listed).toEqual(expect.arrayContaining([ours, theirs]));
      expect(listed).not.toContain(outside);
    });

    it('turns away a pharmacist not yet assigned to a pharmacy', async () => {
      await svc.api
        .get('/prescriptions/pending')
        .set(
          (await svc.as(UserRole.PHARMACIST, { organizationId: null })).headers,
        )
        .expect(403);
    });
  });

  describe('GET /prescriptions/summary', () => {
    /** One patient's waiting count, for whoever `headers` sign in as. */
    async function pendingCountFor(
      patientId: string,
      headers: Record<string, string>,
    ) {
      const res = await svc.api
        .get('/prescriptions/summary')
        .query({ patientIds: patientId })
        .set(headers)
        .expect(200);
      return (res.body as { pendingCount: number }[])[0]?.pendingCount;
    }

    it("counts for a pharmacist only what their pharmacy handles, and every pharmacy's for a doctor, but nothing bought outside", async () => {
      const patientId = randomUUID();
      await sentTo(pharmacy, patientId);
      await sentTo(null, patientId);
      await sentTo(otherPharmacy, patientId);
      await boughtOutside(patientId);

      const pharmacist = await svc.as(UserRole.PHARMACIST, {
        organizationId: pharmacy,
      });
      expect(await pendingCountFor(patientId, pharmacist.headers)).toBe(2);
      expect(
        await pendingCountFor(
          patientId,
          (await svc.as(UserRole.DOCTOR)).headers,
        ),
      ).toBe(3);
    });
  });
});
