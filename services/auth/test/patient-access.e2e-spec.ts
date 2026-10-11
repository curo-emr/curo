import { randomUUID } from 'node:crypto';
import type { JwtPayload } from '@curo/shared/auth';
import { Patient } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { signedIn } from './signed-in';
import { nextSecond } from './sessions';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const PASSWORD = 'k7mp-x3qa-9tnd';
const NEW_PASSWORD = 'w4hc-8rbe-2ufy';

describe('Patient portal access', () => {
  let svc: ServiceUnderTest;
  let reception: Record<string, string>;

  beforeAll(async () => {
    svc = await startService(AppModule);
    reception = (await signedIn(svc, UserRole.RECEPTIONIST)).headers;
  });

  afterAll(() => svc.close());

  /** A registered patient, with an email unless told otherwise. */
  async function register(fields: Partial<Patient> = {}) {
    return svc.db.getRepository(Patient).save({
      patientCode: `MRN-${randomUUID()}`,
      firstName: 'Nimali',
      lastName: 'Perera',
      email: `nimali.${randomUUID()}@curo.test`,
      ...fields,
    });
  }

  const access = (patientId: string) =>
    `/auth/patients/${patientId}/portal-access`;

  const give = (patientId: string, password = PASSWORD) =>
    svc.api.post(access(patientId)).set(reception).send({ password });

  const reset = (patientId: string) =>
    svc.api
      .post(`${access(patientId)}/reset-password`)
      .set(reception)
      .send({ password: NEW_PASSWORD });

  const login = (email: string, password: string) =>
    svc.api.post('/auth/login').send({ email, password });

  it('gives a login that signs in with the email on the record, linked both ways', async () => {
    const patient = await register();

    const res = await give(patient.id).expect(201);
    expect(res.body).toEqual({ email: patient.email });

    const user = await svc.db
      .getRepository(User)
      .findOneByOrFail({ email: patient.email });
    expect(user).toMatchObject({
      role: UserRole.PATIENT,
      patientId: patient.id,
    });
    await expect(
      svc.db.getRepository(Patient).findOneByOrFail({ id: patient.id }),
    ).resolves.toMatchObject({ userId: user.id });

    const { accessToken } = (await login(patient.email, PASSWORD).expect(200))
      .body as Tokens;
    const claims = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString(),
    ) as JwtPayload;
    expect(claims).toMatchObject({
      role: UserRole.PATIENT,
      patientId: patient.id,
    });
  });

  it('says whether the patient has a login, and which email it uses', async () => {
    const patient = await register();
    const read = async () =>
      (await svc.api.get(access(patient.id)).set(reception).expect(200))
        .body as unknown;

    await expect(read()).resolves.toEqual({ login: null });
    await give(patient.id).expect(201);
    await expect(read()).resolves.toEqual({
      login: { email: patient.email, isActive: true },
    });
  });

  describe('refuses to give access', () => {
    it('to a patient with no email on their record', async () => {
      const patient = await register({ email: undefined });

      await give(patient.id).expect(400);
    });

    it('twice', async () => {
      const patient = await register();
      await give(patient.id).expect(201);

      await give(patient.id).expect(409);
    });

    it('with an email that already signs someone else in', async () => {
      const first = await register();
      await give(first.id).expect(201);
      const sharing = await register({ email: first.email });

      await give(sharing.id).expect(409);
    });

    it('to a patient who is not registered', async () => {
      await give(randomUUID()).expect(404);
      await give((await register({ active: false })).id).expect(404);
    });

    it('with a short password', async () => {
      await give((await register()).id, 'short').expect(400);
    });
  });

  describe('reset-password', () => {
    it('ends the sessions signed in before it, and the new password works', async () => {
      const patient = await register();
      await give(patient.id).expect(201);
      const before = (await login(patient.email, PASSWORD).expect(200))
        .body as Tokens;
      await nextSecond();

      await reset(patient.id).expect(201);

      await svc.api
        .post('/auth/refresh')
        .send({ refreshToken: before.refreshToken })
        .expect(401);
      await login(patient.email, NEW_PASSWORD).expect(200);
    });

    it('is a 404 for a patient with no login', async () => {
      await reset((await register()).id).expect(404);
    });
  });

  it('is for reception only', async () => {
    const patient = await register();

    for (const role of [
      UserRole.DOCTOR,
      UserRole.NURSE,
      UserRole.SUPER_ADMIN,
      UserRole.PATIENT,
    ]) {
      const { headers } = await signedIn(svc, role);
      await svc.api.get(access(patient.id)).set(headers).expect(403);
      await svc.api
        .post(access(patient.id))
        .set(headers)
        .send({ password: PASSWORD })
        .expect(403);
      await svc.api
        .post(`${access(patient.id)}/reset-password`)
        .set(headers)
        .send({ password: NEW_PASSWORD })
        .expect(403);
    }
    await expect(
      svc.db.getRepository(User).countBy({ email: patient.email }),
    ).resolves.toBe(0);
  });
});
