import { workplaceOf, type AuthUser } from '@curo/shared/auth';
import { UserRole } from '@curo/shared/enums';
import { dispensedBySql } from '@curo/shared/database';
import { labScope } from '@curo/shared/lab';

/** A condition on patients aliased `p`, with its parameters. */
export interface PatientFilter {
  where: string;
  params: { workplace: string };
}

/**
 * The patients lab and pharmacy staff may list, as a filter on patients `p`:
 * those with an order at their lab, or a prescription their pharmacy
 * dispenses (dispensedBySql), the same rules as their worklists.
 * Undefined for anyone else, who lists every patient. 403 for staff not yet
 * assigned to a workplace.
 */
export function workplacePatients(user: AuthUser): PatientFilter | undefined {
  // service_requests and medication_requests are owned by the clinical
  // service, so they are read with raw SQL.
  const lab = labScope(user);
  if (lab)
    return {
      where: `EXISTS (SELECT 1 FROM service_requests o
                      WHERE o."patientId" = p.id::text
                        AND o."performerOrganizationId" = :workplace)`,
      params: { workplace: lab },
    };
  if (user.role === UserRole.PHARMACIST) {
    const pharmacy = workplaceOf(user, 'pharmacy');
    return {
      where: `EXISTS (SELECT 1 FROM medication_requests m
                      WHERE m."patientId" = p.id::text
                        AND ${dispensedBySql('m', pharmacy, 'workplace')})`,
      params: { workplace: pharmacy },
    };
  }
  return undefined;
}
