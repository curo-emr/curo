import { randomUUID } from 'node:crypto';
import {
  MedicationRequest,
  Observation,
  ServiceRequest,
} from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import {
  auditOf,
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { ClinicalNote } from '../src/entities/clinical-note.entity';
import { Encounter } from '../src/entities/encounter.entity';

// A patient signed in to the patient portal reads only their own record.
describe('A patient reads only their own clinical record', () => {
  let svc: ServiceUnderTest;
  let patient: TestActor;
  let doctor: TestActor;
  let own: Records;
  let other: Records;

  interface Records {
    patientId: string;
    encounterId: string;
    prescriptionId: string;
    labOrderId: string;
  }

  /** A visit with a note, a vital sign, a prescription and a lab order for `patientId`. */
  async function recordsOf(patientId: string): Promise<Records> {
    const practitionerId = randomUUID();
    const { id: encounterId } = await svc.db
      .getRepository(Encounter)
      .save({ patientId, practitionerId });
    await svc.db
      .getRepository(ClinicalNote)
      .save({ encounterId, patientId, practitionerId, assessment: 'Viral' });
    await svc.db.getRepository(Observation).save({
      patientId,
      practitionerId,
      category: 'vital-signs',
      code: '8867-4',
      display: 'Heart rate',
      effectiveDateTime: new Date(),
    });
    const { id: prescriptionId } = await svc.db
      .getRepository(MedicationRequest)
      .save({
        patientId,
        practitionerId,
        medicationCode: 'med_0301',
        medicationDisplay: 'Amlodipine 5mg Tablet',
      });
    const { id: labOrderId } = await svc.db.getRepository(ServiceRequest).save({
      patientId,
      requesterId: practitionerId,
      code: '2345-7',
      display: 'Glucose',
    });
    return { patientId, encounterId, prescriptionId, labOrderId };
  }

  beforeAll(async () => {
    svc = await startService(AppModule);
    own = await recordsOf(randomUUID());
    other = await recordsOf(randomUUID());
    patient = await svc.as(UserRole.PATIENT, { patientId: own.patientId });
    doctor = await svc.as(UserRole.DOCTOR);
  });

  afterAll(() => svc.close());

  const get = (path: string, actor: TestActor) =>
    svc.api.get(path).set(actor.headers);

  const ids = (body: unknown) =>
    (Array.isArray(body) ? body : []).map((r: { id: string }) => r.id);

  it.each([
    ['/encounters', (r: Records) => r.encounterId],
    ['/prescriptions', (r: Records) => r.prescriptionId],
    ['/lab-orders', (r: Records) => r.labOrderId],
  ])('lists only their own on %s', async (path, idOf) => {
    const listed = ids((await get(path, patient).expect(200)).body);

    expect(listed).toContain(idOf(own));
    expect(listed).not.toContain(idOf(other));
  });

  it.each([
    (id: string) => `/encounters?patientId=${id}`,
    (id: string) => `/encounters/patient/${id}`,
    (id: string) => `/prescriptions?patientId=${id}`,
    (id: string) => `/prescriptions/patient/${id}`,
    (id: string) => `/lab-orders?patientId=${id}`,
    (id: string) => `/vitals?patientId=${id}`,
    (id: string) => `/vitals/patient/${id}`,
    (id: string) => `/vitals/patient/${id}/trends`,
  ])(
    "refuses another patient's records on %p, and serves their own",
    async (path) => {
      await get(path(other.patientId), patient).expect(403);
      const res = await get(path(own.patientId), patient).expect(200);
      expect((res.body as unknown[]).length).toBeGreaterThan(0);
    },
  );

  it("finds no visit or lab order of another patient's by id", async () => {
    await get(`/encounters/${other.encounterId}`, patient).expect(404);
    await get(`/lab-orders/${other.labOrderId}`, patient).expect(404);
    await get(`/encounters/${own.encounterId}`, patient).expect(200);
    await get(`/lab-orders/${own.labOrderId}`, patient).expect(200);
  });

  it("audits a patient opening their own visit, not a refused look at another's", async () => {
    const readsBy = async (actor: TestActor, resourceId: string) =>
      (await auditOf(svc, resourceId)).filter(
        (e) => e.userId === actor.sub && e.action === 'READ',
      );

    // A sign-in of their own, so earlier tests' reads aren't counted.
    const me = await svc.as(UserRole.PATIENT, { patientId: own.patientId });

    await get(`/encounters/${other.encounterId}`, me).expect(404);
    await get(`/encounters/${own.encounterId}`, me).expect(200);
    await get(`/encounters?patientId=${other.patientId}`, me).expect(403);

    expect(await readsBy(me, other.encounterId)).toEqual([]);
    expect(await readsBy(me, other.patientId)).toEqual([]);
    expect(await readsBy(me, own.encounterId)).toEqual([
      expect.objectContaining({ patientId: own.patientId }),
    ]);
  });

  it("reads no notes of another patient's visit", async () => {
    for (const path of ['/notes/encounter/', '/notes?encounterId=']) {
      const theirs = await get(path + other.encounterId, patient).expect(200);
      const mine = await get(path + own.encounterId, patient).expect(200);
      expect(theirs.body).toEqual([]);
      expect(mine.body).toHaveLength(1);
    }
  });

  it("still shows a doctor every patient's records", async () => {
    const listed = ids((await get('/prescriptions', doctor).expect(200)).body);
    expect(listed).toEqual(
      expect.arrayContaining([own.prescriptionId, other.prescriptionId]),
    );
    await get(`/encounters/${other.encounterId}`, doctor).expect(200);
    const notes = await get(`/notes/encounter/${other.encounterId}`, doctor);
    expect(notes.body).toHaveLength(1);
  });

  it('turns away a patient login linked to no record', async () => {
    await get(
      '/prescriptions',
      await svc.as(UserRole.PATIENT, { patientId: null }),
    ).expect(403);
  });
});
