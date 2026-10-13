import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import {
  registerPatient,
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { VisitType } from '../src/enums';
import { doctorWithSessions } from './doctors';

// A patient signed in to the patient portal sees only their own appointments.
describe('A patient sees only their own appointments', () => {
  let svc: ServiceUnderTest;
  let patient: TestActor;
  const ownId = randomUUID();
  const otherId = randomUUID();
  let ownAppointment: string;
  let otherAppointment: string;

  /** Books `patientId` in with a new doctor; returns the appointment id. */
  async function book(patientId: string) {
    const start = new Date('2031-01-06T09:00:00+05:30');
    const res = await svc.api
      .post('/appointments')
      .set((await svc.as(UserRole.RECEPTIONIST)).headers)
      .send({
        patientId,
        practitionerId: await doctorWithSessions(svc),
        start: start.toISOString(),
        end: new Date(start.getTime() + 15 * 60_000).toISOString(),
        serviceType: VisitType.CONSULTATION,
        reasonCode: 'Fever',
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  beforeAll(async () => {
    svc = await startService(AppModule);
    patient = await svc.as(UserRole.PATIENT, { patientId: ownId });
    await Promise.all(
      [ownId, otherId].map((id) => registerPatient(svc.db, id)),
    );
    ownAppointment = await book(ownId);
    otherAppointment = await book(otherId);
  });

  afterAll(() => svc.close());

  const get = (path: string, actor: TestActor = patient) =>
    svc.api.get(path).set(actor.headers);

  it("refuses another patient's appointments, and serves their own", async () => {
    await get(`/appointments/patient/${otherId}`).expect(403);
    const res = await get(`/appointments/patient/${ownId}`).expect(200);
    expect((res.body as { id: string }[]).map((a) => a.id)).toEqual([
      ownAppointment,
    ]);
  });

  it("finds no appointment of another patient's by id", async () => {
    await get(`/appointments/${otherAppointment}`).expect(404);
    await get(`/appointments/${ownAppointment}`).expect(200);
    await get(
      `/appointments/${otherAppointment}`,
      await svc.as(UserRole.RECEPTIONIST),
    ).expect(200);
  });

  it('turns away a patient login linked to no record, instead of listing everyone', async () => {
    await get(
      '/appointments',
      await svc.as(UserRole.PATIENT, { patientId: null }),
    ).expect(403);
  });
});
