import type { EntityManager } from 'typeorm';
import { Notification } from '../database/entities/notification.entity';
import type { UserRole } from '../enums';

/** What a notification says, and the record it is about. */
export type Notice = Pick<Notification, 'eventType' | 'title' | 'message'> &
  Partial<Pick<Notification, 'relatedResourceType' | 'relatedResourceId'>>;

interface Account {
  userId: string;
  role: string;
}

// Notifications are raised only by the services, never through the API, so a
// recipient can trust their inbox. Each helper takes the caller's
// EntityManager: inside a transaction the notification is saved with the event
// it reports, or not at all. Accounts live in the auth service's tables, so
// they are read with raw SQL, and ids are compared as text: a malformed id
// finds no one rather than throwing and rolling back the caller's transaction.

/** Puts `notice` in each account's inbox and returns how many it reached. */
async function notifyAccounts(
  em: EntityManager,
  accounts: Account[],
  notice: Notice,
): Promise<number> {
  if (!accounts.length) return 0;
  await em.insert(
    Notification,
    accounts.map((a) => ({
      ...notice,
      recipientId: a.userId,
      recipientRole: a.role,
    })),
  );
  return accounts.length;
}

/**
 * Notifies the account linked to a practitioner. Returns false, and saves
 * nothing, when the practitioner has no account.
 */
export async function notifyPractitioner(
  em: EntityManager,
  practitionerId: string,
  notice: Notice,
): Promise<boolean> {
  const accounts = await em.query<Account[]>(
    `SELECT "userId", role FROM practitioners
     WHERE id::text = $1 AND "userId" IS NOT NULL`,
    [practitionerId],
  );
  return (await notifyAccounts(em, accounts, notice)) > 0;
}

/**
 * Notifies every active account with `role`, or with `role` at one
 * organization (staff are assigned through their practitioner record);
 * returns how many it reached.
 */
export async function notifyRole(
  em: EntityManager,
  role: UserRole,
  notice: Notice,
  { organizationId }: { organizationId?: string } = {},
): Promise<number> {
  const accounts = await em.query<Account[]>(
    `SELECT u.id AS "userId", u.role FROM users u
     LEFT JOIN practitioners p ON p.id::text = u."practitionerId"
     WHERE u.role::text = $1 AND u."isActive"
       AND ($2::text IS NULL OR p."organizationId" = $2)`,
    [role, organizationId ?? null],
  );
  return notifyAccounts(em, accounts, notice);
}
