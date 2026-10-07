import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { Appointment } from '../src/entities/appointment.entity';
import { AppointmentStatus, QueueStage } from '../src/enums';

describe('Appointments and the patient queue', () => {
  let svc: ServiceUnderTest;
  let receptionist: TestActor;
  let nurse: TestActor;
  let doctor: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
    receptionist = svc.as(UserRole.RECEPTIONIST);
    nurse = svc.as(UserRole.NURSE);
    doctor = svc.as(UserRole.DOCTOR);
  });

  afterAll(() => svc.close());

  /** Books a 15-minute appointment with `doctor` and returns its id. */
  async function book(): Promise<string> {
    const start = new Date(Date.now() + 3_600_000);
    const res = await svc.api
      .post('/appointments')
      .set(receptionist.headers)
      .send({
        patientId: randomUUID(),
        practitionerId: doctor.practitionerId,
        start: start.toISOString(),
        end: new Date(start.getTime() + 15 * 60_000).toISOString(),
        reasonCode: 'Fever',
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const saved = (id: string) =>
    svc.db.getRepository(Appointment).findOneByOrFail({ id });

  const setStatus = (id: string, status: AppointmentStatus) =>
    svc.api
      .put(`/appointments/${id}`)
      .set(receptionist.headers)
      .send({ status });

  const moveTo = (id: string, stage: QueueStage, actor: TestActor) =>
    svc.api
      .put(`/appointments/${id}/queue-stage`)
      .set(actor.headers)
      .send({ stage });

  it('books an appointment outside the queue until the patient arrives', async () => {
    const id = await book();

    await expect(saved(id)).resolves.toMatchObject({
      practitionerId: doctor.practitionerId,
      status: AppointmentStatus.BOOKED,
      queueStage: null,
    });
  });

  it('puts the patient in the nurse queue on check-in', async () => {
    const id = await book();

    await setStatus(id, AppointmentStatus.ARRIVED).expect(200);

    await expect(saved(id)).resolves.toMatchObject({
      status: AppointmentStatus.ARRIVED,
      queueStage: QueueStage.WAITING_NURSE,
    });
  });

  it('moves a patient from triage to the doctor and out', async () => {
    const id = await book();
    await setStatus(id, AppointmentStatus.ARRIVED).expect(200);

    for (const [stage, actor] of [
      [QueueStage.WITH_NURSE, nurse],
      [QueueStage.READY_FOR_DOCTOR, nurse],
      [QueueStage.WITH_DOCTOR, doctor],
      [QueueStage.DONE, doctor],
    ] as const) {
      const res = await moveTo(id, stage, actor).expect(200);
      expect(res.body).toMatchObject({
        extension: expect.arrayContaining([
          { url: 'urn:curo:queueStage', valueString: stage },
        ]) as unknown,
      });
    }
    await expect(saved(id)).resolves.toMatchObject({
      queueStage: QueueStage.DONE,
    });
  });

  it('refuses a move the queue does not allow, leaving the stage as it was', async () => {
    const id = await book();
    await setStatus(id, AppointmentStatus.ARRIVED).expect(200);

    await moveTo(id, QueueStage.DONE, doctor).expect(400);

    await expect(saved(id)).resolves.toMatchObject({
      queueStage: QueueStage.WAITING_NURSE,
    });
  });

  it("refuses a stage the role doesn't own, and another doctor's patient", async () => {
    const id = await book();
    await setStatus(id, AppointmentStatus.ARRIVED).expect(200);

    await moveTo(id, QueueStage.WITH_DOCTOR, nurse).expect(403);
    await moveTo(id, QueueStage.WITH_DOCTOR, svc.as(UserRole.DOCTOR)).expect(
      403,
    );

    await expect(saved(id)).resolves.toMatchObject({
      queueStage: QueueStage.WAITING_NURSE,
    });
  });

  it('takes a cancelled appointment out of the queue', async () => {
    const id = await book();
    await setStatus(id, AppointmentStatus.ARRIVED).expect(200);

    await setStatus(id, AppointmentStatus.CANCELLED).expect(200);

    await expect(saved(id)).resolves.toMatchObject({
      status: AppointmentStatus.CANCELLED,
      queueStage: null,
    });
  });

  it("doesn't let a nurse book an appointment", async () => {
    await svc.api.post('/appointments').set(nurse.headers).send({}).expect(403);
  });
});
