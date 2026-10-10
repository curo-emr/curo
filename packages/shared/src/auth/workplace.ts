import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { AuthUser } from './jwt-auth.guard';

/**
 * The organization `user` works at, which staff such as pharmacists and lab
 * technicians are limited to; 403 until an administrator assigns them one.
 * `kind` names the organization in the message ("pharmacy", "laboratory").
 */
export function workplaceOf(user: AuthUser, kind: string): string {
  if (!user.organizationId)
    throw new ForbiddenException(
      `Your account isn't assigned to a ${kind} yet. Ask an administrator to assign one.`,
    );
  return user.organizationId;
}

/**
 * Refuses anything but an active organization of `type`, e.g. the lab a test
 * or the pharmacy a prescription is sent to.
 */
export async function assertActiveOrganization(
  db: Pick<EntityManager, 'query'>,
  organizationId: string | undefined,
  type: 'laboratory' | 'pharmacy',
): Promise<void> {
  // organizations is owned by the auth service, so it is read with raw SQL.
  const found = organizationId
    ? await db.query<unknown[]>(
        `SELECT 1 FROM organizations
         WHERE id::text = $1 AND type = $2 AND active`,
        [organizationId, type],
      )
    : [];
  if (!found.length)
    throw new BadRequestException(
      `Organization ${organizationId ?? '(none)'} is not an active ${type}`,
    );
}
