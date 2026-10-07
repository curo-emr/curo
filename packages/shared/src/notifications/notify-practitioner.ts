import type { EntityManager } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';

/** What a notification says, and the record it is about. */
export type Notice = Pick<Notification, 'eventType' | 'title' | 'message'> &
  Partial<Pick<Notification, 'relatedResourceType' | 'relatedResourceId'>>;

/**
 * Puts `notice` in the inbox of the account linked to a practitioner. Takes the
 * caller's EntityManager, so inside a transaction the notification is saved
 * with the event it reports, or not at all. Notifications are raised only by
 * the services, never through the API, so a recipient can trust their inbox.
 *
 * Returns false, and saves nothing, when the practitioner has no account.
 */
export async function notifyPractitioner(
  em: EntityManager,
  practitionerId: string,
  notice: Notice,
): Promise<boolean> {
  // practitioners is owned by the auth service, so it is read with raw SQL.
  // Ids are compared as text: a non-uuid id finds no one rather than throwing
  // and rolling back the caller's transaction.
  const [account] = await em.query<{ userId: string; role: string }[]>(
    `SELECT "userId", role FROM practitioners
     WHERE id::text = $1 AND "userId" IS NOT NULL`,
    [practitionerId],
  );
  if (!account) return false;

  await em.insert(Notification, {
    ...notice,
    recipientId: account.userId,
    recipientRole: account.role,
  });
  return true;
}
