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

  describe('GET /appointments', () => {
    /** An appointment for `patientId` starting at `start`, saved as given. */
    const saveAppointment = (
      patientId: string,
      start: Date,
      status = AppointmentStatus.BOOKED,
    ) =>
      svc.db.getRepository(Appointment).save({
        patientId,
        practitionerId: doctor.practitionerId as string,
        start,
        end: new Date(start.getTime() + 15 * 60_000),
        status,
      });

    /** The ids `receptionist` gets for `query`, in order. */
    const listed = async (query: object) => {
      const res = await svc.api
        .get('/appointments')
        .query(query)
        .set(receptionist.headers)
        .expect(200);
      return (res.body as { entry: { resource: { id: string } }[] }).entry.map(
        (e) => e.resource.id,
      );
    };

    it('lists the appointments within whole days, latest first when asked', async () => {
      const patientId = randomUUID();
      const first = await saveAppointment(
        patientId,
        new Date(2030, 0, 10, 0, 0),
      );
      const second = await saveAppointment(
        patientId,
        new Date(2030, 0, 11, 23, 59),
      );
      await saveAppointment(patientId, new Date(2030, 0, 12, 0, 0));

      const range = { patientId, from: '2030-01-10', to: '2030-01-11' };
      expect(await listed(range)).toEqual([first.id, second.id]);
      expect(await listed({ ...range, _sort: '-start' })).toEqual([
        second.id,
        first.id,
      ]);
      // One day as a range is the same as that date.
      expect(
        await listed({ patientId, from: '2030-01-11', to: '2030-01-11' }),
      ).toEqual(await listed({ patientId, date: '2030-01-11' }));
    });

    it('narrows by status, a list; an unknown status matches nothing', async () => {
      const patientId = randomUUID();
      const start = new Date(2030, 1, 1, 9);
      await saveAppointment(patientId, start);
      const arrived = await saveAppointment(
        patientId,
        start,
        AppointmentStatus.ARRIVED,
      );
      const noShow = await saveAppointment(
        patientId,
        start,
        AppointmentStatus.NOSHOW,
      );

      expect(
        (await listed({ patientId, status: 'arrived,noshow' })).sort(),
      ).toEqual([arrived.id, noShow.id].sort());
      expect(await listed({ patientId, status: 'nonsense' })).toEqual([]);
    });

    it('refuses a day that is not a date', async () => {
      await svc.api
        .get('/appointments')
        .query({ from: 'yesterday' })
        .set(receptionist.headers)
        .expect(400);
    });
  });

  describe('GET /payments/mine', () => {
    it('lists only the payments for the appointments asked about', async () => {
      const pay = async (appointmentId: string) =>
        (
          await svc.api
            .post('/payments')
            .set(receptionist.headers)
            .send({ patientId: randomUUID(), appointmentId, amount: 1500 })
            .expect(201)
        ).body as { id: string };
      const [paidA, paidB] = [randomUUID(), randomUUID()];
      const a = await pay(paidA);
      const b = await pay(paidB);
      await pay(randomUUID());

      const res = await svc.api
        .get('/payments/mine')
        .query({ appointmentId: `${paidA},${paidB}` })
        .set(receptionist.headers)
        .expect(200);
      const ids = (res.body as { entry: { resource: { id: string } }[] }).entry
        .map((e) => e.resource.id)
        .sort();
      expect(ids).toEqual([a.id, b.id].sort());
    });
  });
});
