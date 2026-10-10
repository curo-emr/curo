import type { EntityManager } from 'typeorm';
import { assertActiveOrganization, workplaceOf, type AuthUser } from '../auth';
import { UserRole } from '../enums';

// Each test goes to the lab the doctor sent it to. Lab staff see and work on
// only their own lab's tests, reports and report files; doctors and the admin
// see every lab's.

/** The document type of a report file the lab uploads for a lab order. */
export const LAB_REPORT_DOCUMENT = 'lab-report';

/** The lab whose work `user` sees: a technician's own, or every lab (undefined) for anyone else. */
export function labScope(user: AuthUser): string | undefined {
  return user.role === UserRole.LAB_STAFF
    ? workplaceOf(user, 'laboratory')
    : undefined;
}

/** Refuses anything but an active laboratory, e.g. as the lab an order is sent to. */
export const assertActiveLab = (
  db: Pick<EntityManager, 'query'>,
  organizationId: string | undefined,
) => assertActiveOrganization(db, organizationId, 'laboratory');
