import { workplaceOf, type AuthUser } from '@curo/shared/auth';
import { UserRole } from '@curo/shared/enums';

// Each pharmacy keeps its own stock and its own dispenses. A pharmacist works
// only with their own pharmacy's: they receive into it, dispense from it, and
// see only it. Other roles may look at any pharmacy's.

/** The pharmacy a pharmacist works at; 403 until they are assigned one. */
export function pharmacyOf(user: AuthUser): string {
  return workplaceOf(user, 'pharmacy');
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

/**
 * The pharmacy whose dispenses `user` lists: as for stock, so a pharmacist's
 * log and summary are their own pharmacy's. One patient's or prescription's
 * dispenses are listed from every pharmacy, so whoever looks at them sees
 * the whole history.
 */
export function dispenseScope(
  user: AuthUser,
  filter: {
    organizationId?: string;
    patientId?: string;
    prescriptionId?: string;
  },
): string | undefined {
  return filter.patientId || filter.prescriptionId
    ? filter.organizationId
    : stockScope(user, filter.organizationId);
}
