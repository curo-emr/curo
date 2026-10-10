import { randomUUID } from 'node:crypto';
import { MedicationRequest, Notification } from '@curo/shared/database';
import { MedicationRequestStatus, UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';

describe('prescription holds', () => {
  let svc: ServiceUnderTest;
  /** The pharmacy the tests hold at; another is a branch elsewhere. */
  const pharmacy = randomUUID();
  const otherPharmacy = randomUUID();
  const pharmacist = () =>
    svc.as(UserRole.PHARMACIST, { organizationId: pharmacy });

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /** A doctor as the auth service stores them, linked both ways to a login; returns both ids. */
  async function doctorAccount() {
    const [practitioner] = await svc.db.query<{ id: string }[]>(
      `INSERT INTO practitioners ("firstName", "lastName", role)
       VALUES ('Test', 'Doctor', $1) RETURNING id`,
      [UserRole.DOCTOR],
    );
    const [user] = await svc.db.query<{ id: string }[]>(
      `INSERT INTO users (email, "passwordHash", role, "practitionerId")
       VALUES ($1, 'x', $2, $3) RETURNING id`,
      [`${randomUUID()}@curo.test`, UserRole.DOCTOR, practitioner.id],
    );
    await svc.db.query(`UPDATE practitioners SET "userId" = $1 WHERE id = $2`, [
      user.id,
      practitioner.id,
    ]);
    return { practitionerId: practitioner.id, userId: user.id };
  }

  /** A prescription sent to the tests' pharmacy, unless `sentTo` says otherwise. */
  const prescription = (
    status = MedicationRequestStatus.ACTIVE,
    practitionerId: string = randomUUID(),
    sentTo: string | null = pharmacy,
  ) =>
    svc.db.getRepository(MedicationRequest).save({
      patientId: randomUUID(),
      practitionerId,
      performerOrganizationId: sentTo,
      status,
      medicationCode: 'med_0301',
      medicationDisplay: 'Amlodipine 5mg Tablet',
    });

  const hold = (rx: MedicationRequest, reason = 'Out of stock until Friday') =>
    svc.api
      .put(`/prescriptions/${rx.id}/hold`)
      .set(pharmacist().headers)
      .send({ reason });

  const release = (rx: MedicationRequest) =>
    svc.api.delete(`/prescriptions/${rx.id}/hold`).set(pharmacist().headers);

  const stored = (rx: MedicationRequest) =>
    svc.db.getRepository(MedicationRequest).findOneByOrFail({ id: rx.id });

  /** Ids `path` lists, as the pharmacist. */
  async function listed(path: string) {
    const res = await svc.api.get(path).set(pharmacist().headers).expect(200);
    return (res.body as { id: string }[]).map((r) => r.id);
  }

  it('sets a waiting prescription aside, with why, and out of the waiting list', async () => {
    const rx = await prescription();

    const res = await hold(rx, '  Query sent to the doctor  ').expect(200);

    expect(res.body).toMatchObject({
      status: 'on-hold',
      statusReason: { text: 'Query sent to the doctor' },
    });
    expect(await listed('/prescriptions/on-hold')).toContain(rx.id);
    expect(await listed('/prescriptions/pending')).not.toContain(rx.id);
  });

  it('tells the doctor who wrote it', async () => {
    const doctor = await doctorAccount();
    const rx = await prescription(
      MedicationRequestStatus.ACTIVE,
      doctor.practitionerId,
    );

    await hold(rx).expect(200);

    await expect(
      svc.db.getRepository(Notification).findBy({
        recipientId: doctor.userId,
        relatedResourceId: rx.id,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        title: 'Prescription on hold',
        message:
          'The pharmacy put Amlodipine 5mg Tablet on hold: Out of stock until Friday',
      }),
    ]);
  });

  it('returns a released prescription to the waiting list', async () => {
    const rx = await prescription();
    await hold(rx).expect(200);

    const res = await release(rx).expect(200);

    expect(res.body).toMatchObject({ status: 'active' });
    expect(res.body).not.toHaveProperty('statusReason');
    expect(await listed('/prescriptions/pending')).toContain(rx.id);
  });

  it('wants a reason', async () => {
    const rx = await prescription();

    await hold(rx, '   ').expect(400);

    expect(await stored(rx)).toMatchObject({ status: 'active' });
  });

  it("can't hold what isn't waiting, or release what isn't held", async () => {
    const dispensed = await prescription(MedicationRequestStatus.COMPLETED);
    const waiting = await prescription();

    await hold(dispensed).expect(409);
    await release(waiting).expect(409);

    expect(await stored(dispensed)).toMatchObject({
      status: 'completed',
      statusReason: null,
    });
  });

  it("lists a pharmacist's own pharmacy's held prescriptions and those that name none, not another's", async () => {
    const ours = await prescription(MedicationRequestStatus.ON_HOLD);
    const unnamed = await prescription(
      MedicationRequestStatus.ON_HOLD,
      undefined,
      null,
    );
    const theirs = await prescription(
      MedicationRequestStatus.ON_HOLD,
      undefined,
      otherPharmacy,
    );

    const held = await listed('/prescriptions/on-hold');

    expect(held).toEqual(expect.arrayContaining([ours.id, unnamed.id]));
    expect(held).not.toContain(theirs.id);
  });

  it("can't hold or release another pharmacy's prescription", async () => {
    const waiting = await prescription(undefined, undefined, otherPharmacy);
    const held = await prescription(
      MedicationRequestStatus.ON_HOLD,
      undefined,
      otherPharmacy,
    );

    await hold(waiting).expect(403);
    await release(held).expect(403);

    expect(await stored(waiting)).toMatchObject({ status: 'active' });
    expect(await stored(held)).toMatchObject({ status: 'on-hold' });
  });

  it('holds a prescription that names no pharmacy', async () => {
    const rx = await prescription(undefined, undefined, null);

    await hold(rx).expect(200);
  });

  it('answers 404 for a prescription that does not exist', async () => {
    await hold({ id: randomUUID() } as MedicationRequest).expect(404);
  });

  it('leaves holds to pharmacists', async () => {
    const rx = await prescription();

    await svc.api
      .put(`/prescriptions/${rx.id}/hold`)
      .set(svc.as(UserRole.DOCTOR).headers)
      .send({ reason: 'x' })
      .expect(403);

    expect(await stored(rx)).toMatchObject({ status: 'active' });
  });
});
