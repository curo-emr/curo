import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { signedIn } from './signed-in';

interface Tokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: UserRole; practitionerId: string; name: string };
}

const PASSWORD = 'Correct-Horse-9';

describe('Sign-in', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  const newStaff = () => ({
    email: `priya.${randomUUID()}@curo.test`,
    password: PASSWORD,
    role: UserRole.DOCTOR,
    firstName: 'Priya',
    lastName: 'Fernando',
  });

  /** Onboards a doctor the way the admin portal does, and returns their details. */
  async function onboard() {
    const staff = newStaff();
    await svc.api
      .post('/auth/staff')
      .set((await signedIn(svc, UserRole.SUPER_ADMIN)).headers)
      .send(staff)
      .expect(201);
    return staff;
  }

  const login = (email: string, password: string) =>
    svc.api.post('/auth/login').send({ email, password });

  const profile = (accessToken: string) =>
    svc.api.get('/auth/profile').set('Authorization', `Bearer ${accessToken}`);

  it('signs onboarded staff in with tokens that carry who they are', async () => {
    const staff = await onboard();

    const res = await login(staff.email, PASSWORD).expect(200);

    const { accessToken, user } = res.body as Tokens;
    expect(user).toMatchObject({
      role: UserRole.DOCTOR,
      practitionerId: expect.any(String) as unknown,
      name: 'Priya Fernando',
    });
    const me = await profile(accessToken).expect(200);
    expect(me.body).toMatchObject({ id: user.id, email: staff.email });
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const staff = await onboard();

    const wrong = await login(staff.email, 'not-the-password').expect(401);
    const unknown = await login(`nobody.${randomUUID()}@curo.test`, PASSWORD);

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('refuses a deactivated account', async () => {
    const staff = await onboard();
    await svc.db
      .getRepository(User)
      .update({ email: staff.email }, { isActive: false });

    await login(staff.email, PASSWORD).expect(401);
  });

  it('renews a session with the refresh token, but not with the access token', async () => {
    const staff = await onboard();
    const { accessToken, refreshToken } = (
      await login(staff.email, PASSWORD).expect(200)
    ).body as Tokens;

    const renewed = await svc.api
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    await profile((renewed.body as Tokens).accessToken).expect(200);

    await svc.api
      .post('/auth/refresh')
      .send({ refreshToken: accessToken })
      .expect(401);
  });

  it('has no self-registration: accounts are created by the super admin', async () => {
    const email = `intruder.${randomUUID()}@curo.test`;

    await svc.api
      .post('/auth/register')
      .send({ email, password: PASSWORD, role: UserRole.SUPER_ADMIN })
      .expect(404);

    await expect(svc.db.getRepository(User).countBy({ email })).resolves.toBe(
      0,
    );
  });

  describe('POST /auth/staff', () => {
    it('refuses an email that already has an account', async () => {
      const staff = await onboard();

      await svc.api
        .post('/auth/staff')
        .set((await signedIn(svc, UserRole.SUPER_ADMIN)).headers)
        .send({ ...staff, firstName: 'Someone', lastName: 'Else' })
        .expect(409);
    });

    it('is refused to everyone but the super admin', async () => {
      const staff = newStaff();

      await svc.api
        .post('/auth/staff')
        .set((await signedIn(svc, UserRole.DOCTOR)).headers)
        .send(staff)
        .expect(403);

      await expect(
        svc.db.getRepository(User).countBy({ email: staff.email }),
      ).resolves.toBe(0);
    });
  });
});
