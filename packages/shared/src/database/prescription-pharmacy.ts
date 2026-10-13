import { ForbiddenException } from '@nestjs/common';
import type { MedicationRequest } from './entities/medication-request.entity';

type SentTo = Pick<
  MedicationRequest,
  'performerOrganizationId' | 'boughtOutside'
>;

// Which pharmacy dispenses a prescription: the one it was sent to. One written
// before prescriptions named a pharmacy names none, and any pharmacy may
// dispense it; one the patient buys outside names none too, and none here does.
// The same rule in two forms, so every worklist and check agrees.

/** Whether pharmacy `pharmacy` dispenses `med`. */
export function dispensedBy(med: SentTo, pharmacy: string): boolean {
  return (
    !med.boughtOutside && (med.performerOrganizationId ?? pharmacy) === pharmacy
  );
}

/**
 * Throws 403, saying why, unless pharmacy `pharmacy` dispenses `med`. One it
 * does is of a catalog drug, with its code: only one bought outside may have
 * none.
 */
export function assertDispensedBy<T extends SentTo>(
  med: T,
  pharmacy: string,
): asserts med is T & { medicationCode: string } {
  if (dispensedBy(med, pharmacy)) return;
  throw new ForbiddenException(
    med.boughtOutside
      ? 'The patient buys this prescription at a pharmacy of their choice'
      : 'This prescription was sent to another pharmacy',
  );
}

/**
 * The rule as SQL on prescriptions aliased `alias`: those `pharmacy` dispenses,
 * bound by the caller as `:${param}`; with no pharmacy, those any pharmacy
 * here does.
 */
export function dispensedBySql(
  alias: string,
  pharmacy: string | null,
  param = 'pharmacy',
): string {
  const here = `NOT ${alias}."boughtOutside"`;
  if (!pharmacy) return here;
  const sentTo = `${alias}."performerOrganizationId"`;
  return `${here} AND (${sentTo} = :${param} OR ${sentTo} IS NULL)`;
}
