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

  /** Asks for an appointment with `practitionerId` from `start`, lasting `minutes`. */
  const bookAt = (practitionerId: string, start: Date, minutes = 15) =>
    svc.api
      .post('/appointments')
      .set(receptionist.headers)
      .send({
        patientId: randomUUID(),
        practitionerId,
        start: start.toISOString(),
        end: new Date(start.getTime() + minutes * 60_000).toISOString(),
        reasonCode: 'Fever',
      });

  // Each booking takes the doctor's next free 15 minutes, as a doctor can't be double-booked.
  let slotsTaken = 0;

  /** Books a 15-minute appointment with `doctor` and returns its id. */
  async function book(): Promise<string> {
    const start = new Date(Date.now() + 3_600_000 + slotsTaken++ * 15 * 60_000);
    const res = await bookAt(doctor.practitionerId as string, start).expect(
      201,
    );
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

  describe('double booking', () => {
    const at = (hour: number, minute = 0) => new Date(2031, 0, 6, hour, minute);

    it("refuses a time that overlaps the doctor's other appointment, not another doctor's or the next slot", async () => {
      const dr = svc.as(UserRole.DOCTOR).practitionerId as string;
      await bookAt(dr, at(9), 30).expect(201);

      const clash = await bookAt(dr, at(9, 15), 30).expect(409);
      expect((clash.body as { message: string }).message).toMatch(
        /already has an appointment/,
      );
      await bookAt(
        svc.as(UserRole.DOCTOR).practitionerId as string,
        at(9, 15),
      ).expect(201);
      await bookAt(dr, at(9, 30)).expect(201);
    });

    it('frees a cancelled slot, and refuses to re-book the cancelled one over its replacement', async () => {
      const dr = svc.as(UserRole.DOCTOR).practitionerId as string;
      const first = await bookAt(dr, at(10)).expect(201);
      const firstId = (first.body as { id: string }).id;
      await setStatus(firstId, AppointmentStatus.CANCELLED).expect(200);

      await bookAt(dr, at(10)).expect(201);

      await setStatus(firstId, AppointmentStatus.BOOKED).expect(409);
      await expect(saved(firstId)).resolves.toMatchObject({
        status: AppointmentStatus.CANCELLED,
      });
    });

    it('refuses an appointment that ends before it starts', async () => {
      const dr = svc.as(UserRole.DOCTOR).practitionerId as string;
      await bookAt(dr, at(11), -15).expect(400);
    });
  });

  it("doesn't let a nurse book an appointment", async () => {
    await svc.api.post('/appointments').set(nurse.headers).send({}).expect(403);
  });

  describe('GET /appointments', () => {
    /**
     * An appointment for `patientId` starting at `start`, saved as given. Each has a
     * doctor of its own, so fixtures at the same time don't count as double booking.
     */
    const saveAppointment = (
      patientId: string,
      start: Date,
      status = AppointmentStatus.BOOKED,
    ) =>
      svc.db.getRepository(Appointment).save({
        patientId,
        practitionerId: randomUUID(),
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

  describe('GET /payments/totals', () => {
    const totals = async (query: object = {}) =>
      (
        await svc.api
          .get('/payments/totals')
          .query(query)
          .set(svc.as(UserRole.SUPER_ADMIN).headers)
          .expect(200)
      ).body as {
        total: number;
        count: number;
        byCollector: { collectedBy: string; total: number; count: number }[];
      };

    it('adds up the payments overall and per receptionist', async () => {
      const desk = svc.as(UserRole.RECEPTIONIST);
      const before = await totals();
      for (const amount of [1000, 250.5])
        await svc.api
          .post('/payments')
          .set(desk.headers)
          .send({ patientId: randomUUID(), amount })
          .expect(201);

      const after = await totals();
      expect(after.count).toBe(before.count + 2);
      expect(after.total).toBeCloseTo(before.total + 1250.5);

      const mine = await totals({ collectedBy: desk.practitionerId });
      expect(mine).toMatchObject({ total: 1250.5, count: 2 });
      expect(mine.byCollector).toEqual([
        { collectedBy: desk.practitionerId, total: 1250.5, count: 2 },
      ]);
    });

    it('leaves out payments corrected to refunded or waived, as My Income does', async () => {
      const desk = svc.as(UserRole.RECEPTIONIST);
      const admin = svc.as(UserRole.SUPER_ADMIN);
      const ids: string[] = [];
      for (const amount of [1000, 300, 200]) {
        const res = await svc.api
          .post('/payments')
          .set(desk.headers)
          .send({ patientId: randomUUID(), amount })
          .expect(201);
        ids.push((res.body as { id: string }).id);
      }
      for (const [id, status] of [
        [ids[1], 'refunded'],
        [ids[2], 'waived'],
      ])
        await svc.api
          .put(`/payments/${id}`)
          .set(admin.headers)
          .send({ status })
          .expect(200);

      await expect(
        totals({ collectedBy: desk.practitionerId }),
      ).resolves.toMatchObject({ total: 1000, count: 1 });
      const own = await svc.api
        .get('/payments/summary')
        .set(desk.headers)
        .expect(200);
      expect(own.body).toMatchObject({ total: 1000, count: 1 });
    });

    it('refuses a correction to a status payments do not have', async () => {
      const res = await svc.api
        .post('/payments')
        .set(receptionist.headers)
        .send({ patientId: randomUUID(), amount: 100 })
        .expect(201);
      await svc.api
        .put(`/payments/${(res.body as { id: string }).id}`)
        .set(svc.as(UserRole.SUPER_ADMIN).headers)
        .send({ status: 'Paid' })
        .expect(400);
    });

    it('is refused to receptionists', async () => {
      await svc.api
        .get('/payments/totals')
        .set(receptionist.headers)
        .expect(403);
    });
  });
});
