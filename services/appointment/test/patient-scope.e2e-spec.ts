import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { VisitType } from '../src/enums';

// A patient signed in to the patient portal sees only their own appointments.
describe('A patient sees only their own appointments', () => {
  let svc: ServiceUnderTest;
  let patient: TestActor;
  const ownId = randomUUID();
  const otherId = randomUUID();
  let ownAppointment: string;
  let otherAppointment: string;

  /** Books `patientId` in with a new doctor tomorrow; returns the appointment id. */
  async function book(patientId: string) {
    const start = new Date(Date.now() + 24 * 3_600_000);
    const res = await svc.api
      .post('/appointments')
      .set(svc.as(UserRole.RECEPTIONIST).headers)
      .send({
        patientId,
        practitionerId: randomUUID(),
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
    patient = svc.as(UserRole.PATIENT, { patientId: ownId });
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
      svc.as(UserRole.RECEPTIONIST),
    ).expect(200);
  });

  it('turns away a patient login linked to no record, instead of listing everyone', async () => {
    await get(
      '/appointments',
      svc.as(UserRole.PATIENT, { patientId: null }),
    ).expect(403);
  });
});
