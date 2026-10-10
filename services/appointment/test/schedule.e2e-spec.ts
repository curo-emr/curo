import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';

describe("Doctors' weekly sessions", () => {
  let svc: ServiceUnderTest;
  let admin: TestActor;
  let receptionist: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
    admin = svc.as(UserRole.SUPER_ADMIN);
    receptionist = svc.as(UserRole.RECEPTIONIST);
  });

  afterAll(() => svc.close());

  const morning = {
    weekday: 1,
    start: '09:00',
    end: '12:00',
    slotMinutes: 15,
    room: '3',
  };
  const evening = { weekday: 1, start: '16:00', end: '19:00', slotMinutes: 20 };

  const setWeek = (practitionerId: string, sessions: object[], actor = admin) =>
    svc.api
      .put(`/schedules/${practitionerId}`)
      .set(actor.headers)
      .send({ sessions });

  const weekOf = async (practitionerId: string) =>
    (
      await svc.api
        .get('/schedules')
        .query({ practitionerId })
        .set(receptionist.headers)
        .expect(200)
    ).body as object[];

  it("replaces a doctor's week, and lists it in day and time order", async () => {
    const dr = svc.as(UserRole.DOCTOR).practitionerId as string;
    await setWeek(dr, [{ ...morning, weekday: 3 }]).expect(200);

    await setWeek(dr, [evening, morning]).expect(200);

    expect(await weekOf(dr)).toEqual([
      { practitionerId: dr, ...morning },
      { practitionerId: dr, ...evening, room: null },
    ]);
  });

  it('refuses overlapping sessions and keeps the week it had', async () => {
    const dr = svc.as(UserRole.DOCTOR).practitionerId as string;
    await setWeek(dr, [morning]).expect(200);

    const res = await setWeek(dr, [
      morning,
      { ...evening, start: '11:00' },
    ]).expect(400);

    expect((res.body as { message: string }).message).toBe(
      'Monday 09:00–12:00 overlaps 11:00–19:00',
    );
    expect(await weekOf(dr)).toHaveLength(1);
  });

  it('refuses a time that is not a clock time, and a slot of no length', async () => {
    const dr = svc.as(UserRole.DOCTOR).practitionerId as string;
    await setWeek(dr, [{ ...morning, start: '9am' }]).expect(400);
    await setWeek(dr, [{ ...morning, slotMinutes: 0 }]).expect(400);
  });

  it('lets only an administrator change a week', async () => {
    const dr = svc.as(UserRole.DOCTOR).practitionerId as string;
    await setWeek(dr, [morning], receptionist).expect(403);
  });
});
