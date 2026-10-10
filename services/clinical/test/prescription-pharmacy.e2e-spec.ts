import { randomUUID } from 'node:crypto';
import { MedicationRequest } from '@curo/shared/database';
import { MedicationRequestStatus, UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';

describe('GET /prescriptions/pending', () => {
  let svc: ServiceUnderTest;
  const pharmacy = randomUUID();
  const otherPharmacy = randomUUID();

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /** A waiting prescription sent to `performerOrganizationId`; returns its id. */
  const sentTo = async (performerOrganizationId: string | null) =>
    (
      await svc.db.getRepository(MedicationRequest).save({
        patientId: randomUUID(),
        practitionerId: randomUUID(),
        status: MedicationRequestStatus.ACTIVE,
        medicationCode: 'med_0301',
        medicationDisplay: 'Amlodipine 5mg Tablet',
        performerOrganizationId,
      })
    ).id;

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

    const listed = await pendingFor(
      svc.as(UserRole.PHARMACIST, { organizationId: pharmacy }).headers,
    );

    expect(listed).toEqual(expect.arrayContaining([ours, unnamed]));
    expect(listed).not.toContain(theirs);
  });

  it("shows a doctor every pharmacy's", async () => {
    const ours = await sentTo(pharmacy);
    const theirs = await sentTo(otherPharmacy);

    expect(await pendingFor(svc.as(UserRole.DOCTOR).headers)).toEqual(
      expect.arrayContaining([ours, theirs]),
    );
  });

  it('turns away a pharmacist not yet assigned to a pharmacy', async () => {
    await svc.api
      .get('/prescriptions/pending')
      .set(svc.as(UserRole.PHARMACIST, { organizationId: null }).headers)
      .expect(403);
  });
});
