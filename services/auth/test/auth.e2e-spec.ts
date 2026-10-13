import { randomUUID } from 'node:crypto';
import type { JwtPayload } from '@curo/shared/auth';
import { AuditLog } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { Practitioner } from '../src/entities/practitioner.entity';
import { LOGIN_LIMITS } from '../src/auth/login-attempts';
import { nextSecond } from './sessions';

interface Tokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: UserRole;
    practitionerId: string;
    name: string;
    organizationId: string | null;
  };
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
  async function onboard(details: { specialization?: string } = {}) {
    const staff = { ...newStaff(), ...details };
    await svc.api
      .post('/auth/users')
      .set((await svc.as(UserRole.SUPER_ADMIN)).headers)
      .send(staff)
      .expect(201);
    return staff;
  }

  const login = (email: string, password: string) =>
    svc.api.post('/auth/login').send({ email, password });

  const profile = (accessToken: string) =>
    svc.api.get('/auth/profile').set('Authorization', `Bearer ${accessToken}`);

  const refresh = (refreshToken: string) =>
    svc.api.post('/auth/refresh').send({ refreshToken });

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

  it('refuses an account after repeated wrong passwords, even with the right one', async () => {
    const staff = await onboard();
    for (let i = 0; i < LOGIN_LIMITS.perAccount; i++) {
      await login(staff.email, 'not-the-password').expect(401);
    }

    const res = await login(staff.email, PASSWORD).expect(429);
    expect((res.body as { message: string }).message).toMatch(
      /^Too many failed sign-in attempts/,
    );
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

  it("carries the staff member's workplace, and picks up a reassignment on refresh", async () => {
    const staff = await onboard();
    const [colombo, kandy] = [randomUUID(), randomUUID()];
    const assign = (organizationId: string) =>
      svc.db
        .getRepository(Practitioner)
        .update({ email: staff.email }, { organizationId });
    const claims = (token: string) =>
      JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      ) as JwtPayload;

    await assign(colombo);
    const signIn = (await login(staff.email, PASSWORD).expect(200))
      .body as Tokens;
    await assign(kandy);
    const renewed = (
      await svc.api
        .post('/auth/refresh')
        .send({ refreshToken: signIn.refreshToken })
        .expect(200)
    ).body as Tokens;

    expect(signIn.user.organizationId).toBe(colombo);
    expect(claims(signIn.accessToken).organizationId).toBe(colombo);
    expect(claims(renewed.accessToken).organizationId).toBe(kandy);
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

  describe('POST /auth/users', () => {
    it('refuses a patient: reception gives patients portal access', async () => {
      const patient = { ...newStaff(), role: UserRole.PATIENT };

      await svc.api
        .post('/auth/users')
        .set((await svc.as(UserRole.SUPER_ADMIN)).headers)
        .send(patient)
        .expect(400);

      await expect(
        svc.db.getRepository(User).countBy({ email: patient.email }),
      ).resolves.toBe(0);
    });

    it('refuses an email that already has an account', async () => {
      const staff = await onboard();

      await svc.api
        .post('/auth/users')
        .set((await svc.as(UserRole.SUPER_ADMIN)).headers)
        .send({ ...staff, firstName: 'Someone', lastName: 'Else' })
        .expect(409);
    });

    it('is refused to everyone but the super admin', async () => {
      const staff = newStaff();

      await svc.api
        .post('/auth/users')
        .set((await svc.as(UserRole.DOCTOR)).headers)
        .send(staff)
        .expect(403);

      await expect(
        svc.db.getRepository(User).countBy({ email: staff.email }),
      ).resolves.toBe(0);
    });
  });

  describe('POST /auth/users/:id/reset-password', () => {
    const NEW_PASSWORD = 'Battery-Staple-7';

    async function reset(email: string) {
      const { id } = await svc.db
        .getRepository(User)
        .findOneByOrFail({ email });
      await svc.api
        .post(`/auth/users/${id}/reset-password`)
        .set((await svc.as(UserRole.SUPER_ADMIN)).headers)
        .send({ newPassword: NEW_PASSWORD })
        .expect(201);
    }

    it('ends the sessions signed in before it', async () => {
      const staff = await onboard();
      const before = (await login(staff.email, PASSWORD).expect(200))
        .body as Tokens;
      await nextSecond();

      await reset(staff.email);

      await refresh(before.refreshToken).expect(401);
      await profile(before.accessToken).expect(401);
    });

    it('keeps a session signed in straight after it', async () => {
      const staff = await onboard();
      await reset(staff.email);

      const after = (await login(staff.email, NEW_PASSWORD).expect(200))
        .body as Tokens;

      await refresh(after.refreshToken).expect(200);
      await profile(after.accessToken).expect(200);
    });

    it('lets someone locked out sign in with the new password straight away', async () => {
      const staff = await onboard();
      for (let i = 0; i < LOGIN_LIMITS.perAccount; i++) {
        await login(staff.email, 'not-the-password').expect(401);
      }
      await login(staff.email, PASSWORD).expect(429);

      await reset(staff.email);

      await login(staff.email, NEW_PASSWORD).expect(200);
    });
  });

  describe('PATCH /auth/users/:id', () => {
    it("refuses to suspend the super admin's own account", async () => {
      const admin = await svc.as(UserRole.SUPER_ADMIN);
      const { sub } = admin;

      await svc.api
        .patch(`/auth/users/${sub}`)
        .set(admin.headers)
        .send({ isActive: false })
        .expect(400);

      await expect(
        svc.db.getRepository(User).findOneByOrFail({ id: sub }),
      ).resolves.toMatchObject({ isActive: true });
    });

    it("ends a suspended account's sessions, for good", async () => {
      const staff = await onboard();
      const before = (await login(staff.email, PASSWORD).expect(200))
        .body as Tokens;
      await nextSecond();
      const admin = await svc.as(UserRole.SUPER_ADMIN);
      const setActive = (isActive: boolean) =>
        svc.api
          .patch(`/auth/users/${before.user.id}`)
          .set(admin.headers)
          .send({ isActive })
          .expect(200);

      await setActive(false);
      await profile(before.accessToken).expect(401);
      await refresh(before.refreshToken).expect(401);

      await setActive(true);
      await profile(before.accessToken).expect(401);
      await refresh(before.refreshToken).expect(401);
      await login(staff.email, PASSWORD).expect(200);
    });

    it('records a suspension and a reactivation, and nothing for a change to the same value', async () => {
      const admin = await svc.as(UserRole.SUPER_ADMIN);
      const created = await svc.api
        .post('/auth/users')
        .set(admin.headers)
        .send(newStaff())
        .expect(201);
      const { id } = created.body as { id: string };
      const setActive = (isActive: boolean) =>
        svc.api
          .patch(`/auth/users/${id}`)
          .set(admin.headers)
          .send({ isActive })
          .expect(200);

      await setActive(false);
      await setActive(false);
      await setActive(true);

      const entries = await svc.db.getRepository(AuditLog).find({
        where: { resourceId: id, action: 'UPDATE' },
        order: { createdAt: 'ASC' },
      });
      expect(entries.map((e) => e.outcomeDescription)).toEqual([
        'Admin suspended the account',
        'Admin reactivated the account',
      ]);
    });
  });

  describe('GET /auth/users by id', () => {
    it('lists the accounts named by user or practitioner id, in one request', async () => {
      const admin = await svc.as(UserRole.SUPER_ADMIN);
      const onboarded = async () =>
        (
          await svc.api
            .post('/auth/users')
            .set(admin.headers)
            .send(newStaff())
            .expect(201)
        ).body as { id: string; practitionerId: string };
      const [byUser, byPractitioner, other] = [
        await onboarded(),
        await onboarded(),
        await onboarded(),
      ];

      const listed = async (query: object) =>
        (
          (
            await svc.api
              .get('/auth/users')
              .query(query)
              .set(admin.headers)
              .expect(200)
          ).body as { entry: { resource: { id: string } }[] }
        ).entry.map((e) => e.resource.id);

      const named = await listed({
        ids: byUser.id,
        practitionerIds: byPractitioner.practitionerId,
      });
      expect(named.sort()).toEqual([byUser.id, byPractitioner.id].sort());
      expect(named).not.toContain(other.id);
      expect(await listed({ ids: 'not-a-uuid' })).toEqual([]);
    });
  });

  describe('GET /auth/practitioners', () => {
    it('lists a doctor with their specialization, under the name the admin gave it, and their workplace', async () => {
      const doctor = await onboard({ specialization: 'Cardiology' });
      const clinic = randomUUID();
      await svc.db
        .getRepository(Practitioner)
        .update({ email: doctor.email }, { organizationId: clinic });

      const res = await svc.api
        .get('/auth/practitioners')
        .query({ role: UserRole.DOCTOR })
        .set((await svc.as(UserRole.NURSE)).headers)
        .expect(200);

      expect(res.body).toContainEqual(
        expect.objectContaining({
          email: doctor.email,
          role: UserRole.DOCTOR,
          specialization: 'Cardiology',
          organizationId: clinic,
        }),
      );
    });
  });

  describe('GET /auth/users/summary', () => {
    const summary = async () =>
      (
        await svc.api
          .get('/auth/users/summary')
          .set((await svc.as(UserRole.SUPER_ADMIN)).headers)
          .expect(200)
      ).body as {
        total: number;
        active: number;
        byRole: Record<string, number>;
      };

    it('counts the users, the active ones, and each role', async () => {
      const before = await summary();
      await onboard();
      const suspended = await onboard();
      await svc.db
        .getRepository(User)
        .update({ email: suspended.email }, { isActive: false });

      const after = await summary();
      // Signing in as the super admin creates one each time: leave them out.
      const admins = (counts: typeof before) =>
        counts.byRole[UserRole.SUPER_ADMIN] ?? 0;
      expect(after.total - admins(after)).toBe(
        before.total - admins(before) + 2,
      );
      expect(after.active - admins(after)).toBe(
        before.active - admins(before) + 1,
      );
      expect(after.byRole[UserRole.DOCTOR]).toBe(
        (before.byRole[UserRole.DOCTOR] ?? 0) + 2,
      );
    });

    it('is refused to everyone but the super admin', async () => {
      await svc.api
        .get('/auth/users/summary')
        .set((await svc.as(UserRole.DOCTOR)).headers)
        .expect(403);
    });
  });
});
