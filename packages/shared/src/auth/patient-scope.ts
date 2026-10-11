import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums';
import type { AuthUser } from './jwt-auth.guard';

// A patient signed in to the patient portal sees only their own record; staff
// see the patients their role allows.

/**
 * The patient whose records `user` sees: a patient's own, or anyone's
 * (undefined) for staff. 403 for a patient login linked to no record.
 */
export function patientScope(user: AuthUser): string | undefined {
  if (user.role !== UserRole.PATIENT) return undefined;
  if (!user.patientId)
    throw new ForbiddenException(
      "Your sign-in isn't linked to a patient record. Contact the clinic's reception.",
    );
  return user.patientId;
}

/**
 * The patient to read when `user` asks for `patientId`: staff get what they
 * asked for; a patient gets their own, and 403 for anyone else's.
 */
export function readablePatient(user: AuthUser, patientId: string): string;
export function readablePatient(
  user: AuthUser,
  patientId?: string,
): string | undefined;
export function readablePatient(
  user: AuthUser,
  patientId?: string,
): string | undefined {
  const own = patientScope(user);
  if (!own) return patientId;
  if (patientId && patientId !== own)
    throw new ForbiddenException('Patients can only view their own record');
  return own;
}
