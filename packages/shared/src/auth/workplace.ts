import { ForbiddenException } from '@nestjs/common';
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
