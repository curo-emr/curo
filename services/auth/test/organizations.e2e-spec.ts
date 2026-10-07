import { randomUUID } from 'node:crypto';
import { AuditLog } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import {
  Organization,
  OrganizationType,
} from '../src/entities/organization.entity';
import { Practitioner } from '../src/entities/practitioner.entity';
import { signedIn } from './signed-in';

describe('Organizations', () => {
  let svc: ServiceUnderTest;
  let admin: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
    admin = await signedIn(svc, UserRole.SUPER_ADMIN);
  });

  afterAll(() => svc.close());

  /** An organization of `type` created through the API, as the admin portal does. */
  async function create(type: OrganizationType) {
    const res = await svc.api
      .post('/organizations')
      .set(admin.headers)
      .send({ name: `Curo ${type} ${randomUUID()}`, type, city: 'Kandy' })
      .expect(201);
    return res.body as Organization;
  }

  const update = (id: string, changes: object) =>
    svc.api.patch(`/organizations/${id}`).set(admin.headers).send(changes);

  /** The ids `GET /organizations` returns for `query`, as a doctor. */
  async function listed(query: object = {}) {
    const doctor = await signedIn(svc, UserRole.DOCTOR);
    const res = await svc.api
      .get('/organizations')
      .query(query)
      .set(doctor.headers)
      .expect(200);
    return (res.body as Organization[]).map((o) => o.id);
  }

  describe('managing them', () => {
    it('lets the super admin create one, and records it in the audit log', async () => {
      const pharmacy = await create(OrganizationType.PHARMACY);

      expect(pharmacy).toMatchObject({ type: 'pharmacy', active: true });
      expect(await listed({ type: 'pharmacy' })).toContain(pharmacy.id);
      expect(await listed({ type: 'laboratory' })).not.toContain(pharmacy.id);
      await expect(
        svc.db.getRepository(AuditLog).findOneBy({ resourceId: pharmacy.id }),
      ).resolves.toMatchObject({
        userId: admin.sub,
        action: 'CREATE',
        resourceType: 'Organization',
      });
    });

    it('deactivates rather than deletes: gone from the directory, still there for the admin', async () => {
      const pharmacy = await create(OrganizationType.PHARMACY);

      await update(pharmacy.id, { active: false }).expect(200);

      expect(await listed()).not.toContain(pharmacy.id);
      expect(await listed({ includeInactive: 'true' })).toContain(pharmacy.id);
    });

    it('keeps the type it was created with', async () => {
      const pharmacy = await create(OrganizationType.PHARMACY);

      await update(pharmacy.id, { name: 'Renamed', type: 'laboratory' }).expect(
        200,
      );

      await expect(
        svc.db.getRepository(Organization).findOneBy({ id: pharmacy.id }),
      ).resolves.toMatchObject({ name: 'Renamed', type: 'pharmacy' });
    });

    it('refuses an unknown type', async () => {
      await svc.api
        .post('/organizations')
        .set(admin.headers)
        .send({ name: 'Somewhere', type: 'warehouse' })
        .expect(400);
    });

    it('is refused to everyone but the super admin', async () => {
      const pharmacy = await create(OrganizationType.PHARMACY);
      const pharmacist = await signedIn(svc, UserRole.PHARMACIST);

      await svc.api
        .post('/organizations')
        .set(pharmacist.headers)
        .send({ name: 'Mine now', type: 'pharmacy' })
        .expect(403);
      await svc.api
        .patch(`/organizations/${pharmacy.id}`)
        .set(pharmacist.headers)
        .send({ active: false })
        .expect(403);
    });
  });

  describe('assigning staff', () => {
    const newStaff = (role: UserRole, organizationId?: string) =>
      svc.api
        .post('/auth/users')
        .set(admin.headers)
        .send({
          email: `${role.toLowerCase()}.${randomUUID()}@curo.test`,
          password: 'Correct-Horse-9',
          role,
          firstName: 'Kasun',
          lastName: 'Bandara',
          organizationId,
        });

    const workplaceOf = async (practitionerId: string) =>
      (
        await svc.db
          .getRepository(Practitioner)
          .findOneByOrFail({ id: practitionerId })
      ).organizationId;

    it('assigns a pharmacist to a pharmacy', async () => {
      const pharmacy = await create(OrganizationType.PHARMACY);

      const res = await newStaff(UserRole.PHARMACIST, pharmacy.id).expect(201);

      const { practitionerId } = res.body as { practitionerId: string };
      expect(await workplaceOf(practitionerId)).toBe(pharmacy.id);
    });

    it('refuses a pharmacist without a pharmacy, or with the wrong kind of place', async () => {
      const clinic = await create(OrganizationType.CLINIC);

      const missing = await newStaff(UserRole.PHARMACIST).expect(400);
      const wrongKind = await newStaff(UserRole.PHARMACIST, clinic.id).expect(
        400,
      );

      expect(missing.body).toMatchObject({
        message: 'A pharmacist must be assigned to a pharmacy',
      });
      expect(wrongKind.body).toMatchObject({
        message: expect.stringContaining('is a clinic') as unknown,
      });
    });

    it('refuses an inactive or unknown organization', async () => {
      const closed = await create(OrganizationType.PHARMACY);
      await update(closed.id, { active: false }).expect(200);

      await newStaff(UserRole.PHARMACIST, closed.id).expect(400);
      await newStaff(UserRole.PHARMACIST, randomUUID()).expect(400);
    });

    it('lets other staff go without one, at the kind of place their role works', async () => {
      const clinic = await create(OrganizationType.CLINIC);
      const lab = await create(OrganizationType.LABORATORY);

      await newStaff(UserRole.DOCTOR).expect(201);
      await newStaff(UserRole.DOCTOR, clinic.id).expect(201);
      await newStaff(UserRole.LAB_STAFF, lab.id).expect(201);
      await newStaff(UserRole.LAB_STAFF, clinic.id).expect(400);
    });

    it('moves a pharmacist to another pharmacy, but not to a laboratory', async () => {
      const [colombo, kandy] = [
        await create(OrganizationType.PHARMACY),
        await create(OrganizationType.PHARMACY),
      ];
      const lab = await create(OrganizationType.LABORATORY);
      const { id, practitionerId } = (
        await newStaff(UserRole.PHARMACIST, colombo.id).expect(201)
      ).body as { id: string; practitionerId: string };

      await svc.api
        .patch(`/auth/users/${id}`)
        .set(admin.headers)
        .send({ organizationId: kandy.id })
        .expect(200);
      await svc.api
        .patch(`/auth/users/${id}`)
        .set(admin.headers)
        .send({ organizationId: lab.id })
        .expect(400);

      expect(await workplaceOf(practitionerId)).toBe(kandy.id);
    });
  });

  describe('GET /organizations/mine', () => {
    it('is where the token says the caller works', async () => {
      const pharmacy = await create(OrganizationType.PHARMACY);
      const pharmacist = await signedIn(svc, UserRole.PHARMACIST, {
        organizationId: pharmacy.id,
      });

      const res = await svc.api
        .get('/organizations/mine')
        .set(pharmacist.headers)
        .expect(200);

      expect(res.body).toMatchObject({ id: pharmacy.id, name: pharmacy.name });
    });

    it('is empty for someone who works nowhere', async () => {
      const res = await svc.api
        .get('/organizations/mine')
        .set(admin.headers)
        .expect(200);

      expect(res.text).toBe('');
    });
  });
});
