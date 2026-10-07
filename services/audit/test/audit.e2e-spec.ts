import { randomUUID } from 'node:crypto';
import { AuditLog } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';

interface Searchset {
  resourceType: 'Bundle';
  total: number;
  entry: { resource: AuditLog }[];
}

describe('Audit log', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  const entry = (patientId: string, overrides: object = {}) => ({
    action: 'READ',
    resourceType: 'Encounter',
    resourceId: randomUUID(),
    patientId,
    ...overrides,
  });

  const record = (body: object, role = UserRole.DOCTOR) =>
    svc.api.post('/audit').set(svc.as(role).headers).send(body);

  const savedFor = (patientId: string) =>
    svc.db.getRepository(AuditLog).findBy({ patientId });

  describe('POST /audit', () => {
    it('records who did it from the token, whatever the body claims', async () => {
      const patientId = randomUUID();
      const nurse = svc.as(UserRole.NURSE);

      await svc.api
        .post('/audit')
        .set(nurse.headers)
        .send(
          entry(patientId, { userId: 'someone-else', userRole: 'SUPER_ADMIN' }),
        )
        .expect(201);

      await expect(savedFor(patientId)).resolves.toEqual([
        expect.objectContaining({
          action: 'READ',
          userId: nurse.sub,
          userRole: UserRole.NURSE,
        }),
      ]);
    });

    it('rejects an entry without an action or resource', async () => {
      const patientId = randomUUID();

      await record(entry(patientId, { action: '' })).expect(400);
      await record(entry(patientId, { resourceId: undefined })).expect(400);

      await expect(savedFor(patientId)).resolves.toEqual([]);
    });

    it('needs a signed-in user', async () => {
      await svc.api.post('/audit').send(entry(randomUUID())).expect(401);
    });
  });

  describe('GET /audit', () => {
    it("lists a patient's entries, newest first, for the super admin", async () => {
      const patientId = randomUUID();
      await record(entry(patientId, { action: 'CREATE' })).expect(201);
      await record(entry(patientId, { action: 'UPDATE' })).expect(201);
      await record(entry(randomUUID())).expect(201);

      const res = await svc.api
        .get('/audit')
        .query({ patientId })
        .set(svc.as(UserRole.SUPER_ADMIN).headers)
        .expect(200);

      const bundle = res.body as Searchset;
      expect(bundle).toMatchObject({ resourceType: 'Bundle', total: 2 });
      expect(bundle.entry.map((e) => e.resource.action)).toEqual([
        'UPDATE',
        'CREATE',
      ]);
    });

    it('filters by resource type', async () => {
      const patientId = randomUUID();
      await record(entry(patientId, { resourceType: 'Encounter' })).expect(201);
      await record(
        entry(patientId, { resourceType: 'DocumentReference' }),
      ).expect(201);

      const res = await svc.api
        .get('/audit')
        .query({ patientId, resourceType: 'DocumentReference' })
        .set(svc.as(UserRole.SUPER_ADMIN).headers)
        .expect(200);

      expect(
        (res.body as Searchset).entry.map((e) => e.resource.resourceType),
      ).toEqual(['DocumentReference']);
    });

    it('is refused to everyone but the super admin', async () => {
      for (const role of [UserRole.DOCTOR, UserRole.PATIENT])
        await svc.api.get('/audit').set(svc.as(role).headers).expect(403);
    });
  });
});
