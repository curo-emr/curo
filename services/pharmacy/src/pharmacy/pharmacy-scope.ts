import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '@curo/shared/auth';
import { UserRole } from '@curo/shared/enums';

// Each pharmacy keeps its own stock. A pharmacist works only with their own
// pharmacy's: they receive into it, dispense from it, and see only it. Other
// roles may look at any pharmacy's.

/** The pharmacy a pharmacist works at; 403 until they are assigned one. */
export function pharmacyOf(user: AuthUser): string {
  if (!user.organizationId)
    throw new ForbiddenException(
      "Your account isn't assigned to a pharmacy yet. Ask an administrator to assign one.",
    );
  return user.organizationId;
}

/**
 * The pharmacy whose stock `user` sees: a pharmacist's own, whatever they ask
 * for; for anyone else the one asked for, or every pharmacy when none is.
 */
export function stockScope(
  user: AuthUser,
  requested?: string,
): string | undefined {
  return user.role === UserRole.PHARMACIST ? pharmacyOf(user) : requested;
}
