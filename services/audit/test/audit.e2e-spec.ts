import { randomUUID } from 'node:crypto';
import { AuditLog } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';

interface Searchset {
  resourceType: 'Bundle';
  total: number;
  entry: { resource: AuditLog }[];
}

describe('Audit log', () => {
  let svc: ServiceUnderTest;
  let doctor: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
    doctor = await svc.as(UserRole.DOCTOR);
  });

  afterAll(() => svc.close());

  /** An entry on `patientId`, as a service records it. */
  const record = (patientId: string, overrides: Partial<AuditLog> = {}) =>
    svc.db.getRepository(AuditLog).save({
      action: 'READ',
      resourceType: 'Encounter',
      resourceId: randomUUID(),
      patientId,
      userId: doctor.sub,
      userRole: UserRole.DOCTOR,
      ...overrides,
    });

  describe('POST /audit', () => {
    it('is not a route: only the services write the log', async () => {
      const patientId = randomUUID();
      for (const role of [UserRole.PATIENT, UserRole.SUPER_ADMIN])
        await svc.api
          .post('/audit')
          .set((await svc.as(role)).headers)
          .send({
            action: 'delete',
            resourceType: 'Patient',
            resourceId: patientId,
            patientId,
          })
          .expect(404);

      await expect(
        svc.db.getRepository(AuditLog).findBy({ patientId }),
      ).resolves.toEqual([]);
    });
  });

  describe('GET /audit', () => {
    it("lists a patient's entries, newest first, for the super admin", async () => {
      const patientId = randomUUID();
      await record(patientId, { action: 'CREATE' });
      await record(patientId, { action: 'UPDATE' });
      await record(randomUUID());

      const res = await svc.api
        .get('/audit')
        .query({ patientId })
        .set((await svc.as(UserRole.SUPER_ADMIN)).headers)
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
      await record(patientId, { resourceType: 'Encounter' });
      await record(patientId, { resourceType: 'DocumentReference' });

      const res = await svc.api
        .get('/audit')
        .query({ patientId, resourceType: 'DocumentReference' })
        .set((await svc.as(UserRole.SUPER_ADMIN)).headers)
        .expect(200);

      expect(
        (res.body as Searchset).entry.map((e) => e.resource.resourceType),
      ).toEqual(['DocumentReference']);
    });

    it('is refused to everyone but the super admin', async () => {
      for (const role of [UserRole.DOCTOR, UserRole.PATIENT])
        await svc.api
          .get('/audit')
          .set((await svc.as(role)).headers)
          .expect(403);
    });

    it('needs a signed-in user', async () => {
      await svc.api.get('/audit').expect(401);
    });
  });
});
