import { Notification } from '@curo/shared/database';
import { NotificationEventType, UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';

describe('Notifications', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  /** Puts a notification in `recipient`'s inbox, as a service raising an event does, and returns its id. */
  async function notify(recipient: TestActor): Promise<string> {
    const { id } = await svc.db.getRepository(Notification).save({
      recipientId: recipient.sub,
      eventType: NotificationEventType.LAB_RESULTS_READY,
      title: 'Results ready',
      message: 'Full blood count is ready to review',
    });
    return id;
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
    it('does not exist: no user can send a notification, whatever their role', async () => {
      const doctor = svc.as(UserRole.DOCTOR);

      for (const role of [UserRole.LAB_STAFF, UserRole.SUPER_ADMIN])
        await svc.api
          .post('/notifications')
          .set(svc.as(role).headers)
          .send({
            recipientId: doctor.sub,
            eventType: NotificationEventType.LAB_RESULTS_READY,
            title: 'Results ready',
            message: 'Call 0771234567 about your results',
          })
          .expect(404);

      await expect(savedFor(doctor)).resolves.toEqual([]);
    });
  });

  describe('reading and marking', () => {
    it('delivers a notification, unread, to its recipient', async () => {
      const doctor = svc.as(UserRole.DOCTOR);

      const id = await notify(doctor);

      await expect(inboxOf(doctor)).resolves.toEqual([
        expect.objectContaining({ id, isRead: false, title: 'Results ready' }),
      ]);
    });

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
