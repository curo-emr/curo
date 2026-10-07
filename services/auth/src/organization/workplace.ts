import { UserRole } from '@curo/shared/enums';
import { OrganizationType } from '../entities/organization.entity';

// Which kind of organisation each staff role works at. A role not listed here
// (patients, the super admin) belongs to no organisation.
const WORKPLACE_TYPES: Partial<Record<UserRole, readonly OrganizationType[]>> =
  {
    [UserRole.DOCTOR]: [OrganizationType.CLINIC, OrganizationType.HOSPITAL],
    [UserRole.NURSE]: [OrganizationType.CLINIC, OrganizationType.HOSPITAL],
    [UserRole.RECEPTIONIST]: [
      OrganizationType.CLINIC,
      OrganizationType.HOSPITAL,
    ],
    [UserRole.PHARMACIST]: [OrganizationType.PHARMACY],
    [UserRole.LAB_STAFF]: [OrganizationType.LABORATORY],
  };

// Roles that can't do their work until they are assigned: a pharmacist
// dispenses and receives stock only at their own pharmacy, and lab staff work
// only on the tests sent to their own lab.
const WORKPLACE_REQUIRED: readonly UserRole[] = [
  UserRole.PHARMACIST,
  UserRole.LAB_STAFF,
];

/** The kinds of organisation `role` can be assigned to; empty when none. */
export function workplaceTypes(role: UserRole): readonly OrganizationType[] {
  return WORKPLACE_TYPES[role] ?? [];
}

export function requiresWorkplace(role: UserRole): boolean {
  return WORKPLACE_REQUIRED.includes(role);
}
