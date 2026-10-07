import { BadRequestException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { workplaceOf, type AuthUser } from '../auth';
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
export async function assertActiveLab(
  db: Pick<EntityManager, 'query'>,
  organizationId: string | undefined,
): Promise<void> {
  // organizations is owned by the auth service, so it is read with raw SQL.
  const labs = organizationId
    ? await db.query<unknown[]>(
        `SELECT 1 FROM organizations
         WHERE id::text = $1 AND type = 'laboratory' AND active`,
        [organizationId],
      )
    : [];
  if (!labs.length)
    throw new BadRequestException(
      `Organization ${organizationId ?? '(none)'} is not an active laboratory`,
    );
}
