import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { Notification } from '../src/entities/notification.entity';
import { NotificationEventType } from '../src/enums';

describe('Notifications', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  const notice = (recipient: TestActor, overrides: object = {}) => ({
    recipientId: recipient.sub,
    eventType: NotificationEventType.LAB_RESULTS_READY,
    title: 'Results ready',
    message: 'Full blood count is ready to review',
    ...overrides,
  });

  /** Sends `recipient` a notification and returns its id. */
  async function notify(recipient: TestActor): Promise<string> {
    const res = await svc.api
      .post('/notifications')
      .set(svc.as(UserRole.LAB_STAFF).headers)
      .send(notice(recipient))
      .expect(201);
    return (res.body as { id: string }).id;
  }

  const inboxOf = async (user: TestActor) =>
    (await svc.api.get('/notifications').set(user.headers).expect(200))
      .body as { id: string; isRead: boolean }[];

  const unreadCount = async (user: TestActor) =>
    (
      (await svc.api.get('/notifications/count').set(user.headers).expect(200))
        .body as { count: number }
    ).count;

  const savedFor = (user: TestActor) =>
    svc.db.getRepository(Notification).findBy({ recipientId: user.sub });

  describe('POST /notifications', () => {
    it('delivers a notification, unread, to its recipient', async () => {
      const doctor = svc.as(UserRole.DOCTOR);

      const id = await notify(doctor);

      await expect(inboxOf(doctor)).resolves.toEqual([
        expect.objectContaining({ id, isRead: false, title: 'Results ready' }),
      ]);
    });

    it('rejects a notification without a title or with an unknown event type', async () => {
      const doctor = svc.as(UserRole.DOCTOR);
      const sender = svc.as(UserRole.LAB_STAFF);

      for (const body of [
        notice(doctor, { title: '' }),
        notice(doctor, { eventType: 'party' }),
        notice(doctor, { recipientId: undefined }),
      ])
        await svc.api
          .post('/notifications')
          .set(sender.headers)
          .send(body)
          .expect(400);

      await expect(savedFor(doctor)).resolves.toEqual([]);
    });

    it("ignores fields the sender doesn't set, such as isRead", async () => {
      const doctor = svc.as(UserRole.DOCTOR);

      await svc.api
        .post('/notifications')
        .set(svc.as(UserRole.LAB_STAFF).headers)
        .send(notice(doctor, { isRead: true }))
        .expect(201);

      await expect(savedFor(doctor)).resolves.toEqual([
        expect.objectContaining({ isRead: false }),
      ]);
    });
  });

  describe('reading and marking', () => {
    it('shows users only their own notifications and count', async () => {
      const doctor = svc.as(UserRole.DOCTOR);
      const nurse = svc.as(UserRole.NURSE);
      const forDoctor = await notify(doctor);
      await notify(nurse);
      await notify(nurse);

      await expect(inboxOf(doctor)).resolves.toEqual([
        expect.objectContaining({ id: forDoctor }),
      ]);
      await expect(unreadCount(doctor)).resolves.toBe(1);
      await expect(unreadCount(nurse)).resolves.toBe(2);
    });

    it("marks a user's own notification read, but not someone else's", async () => {
      const doctor = svc.as(UserRole.DOCTOR);
      const nurse = svc.as(UserRole.NURSE);
      const forDoctor = await notify(doctor);
      const forNurse = await notify(nurse);

      await svc.api
        .put(`/notifications/${forNurse}/read`)
        .set(doctor.headers)
        .expect(200);
      await svc.api
        .put(`/notifications/${forDoctor}/read`)
        .set(doctor.headers)
        .expect(200);

      await expect(inboxOf(nurse)).resolves.toEqual([
        expect.objectContaining({ id: forNurse, isRead: false }),
      ]);
      await expect(inboxOf(doctor)).resolves.toEqual([
        expect.objectContaining({ id: forDoctor, isRead: true }),
      ]);
    });

    it("marks all of a user's notifications read, and only theirs", async () => {
      const doctor = svc.as(UserRole.DOCTOR);
      const nurse = svc.as(UserRole.NURSE);
      await notify(doctor);
      await notify(doctor);
      await notify(nurse);

      await svc.api
        .put('/notifications/read-all')
        .set(doctor.headers)
        .expect(200);

      await expect(unreadCount(doctor)).resolves.toBe(0);
      await expect(unreadCount(nurse)).resolves.toBe(1);
    });
  });
});
