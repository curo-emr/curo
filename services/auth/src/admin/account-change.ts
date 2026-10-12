import type { User } from '../entities/user.entity';
import type { Practitioner } from '../entities/practitioner.entity';

/** What an admin can change on an account, as the audit log records it. */
export interface AccountFields {
  isActive: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  licenseNumber?: string;
  organizationId?: string;
}

type Field = keyof AccountFields;
type Values = Partial<Record<Field, unknown>>;

/** The profile details an admin may correct, in words; both name fields are the "name". */
const DETAILS: Partial<Record<Field, string>> = {
  firstName: 'name',
  lastName: 'name',
  phone: 'phone',
  specialization: 'specialization',
  qualification: 'qualification',
  licenseNumber: 'licence number',
};

/** A copy of what an admin can change on `user`, taken before or after the change. */
export function accountFields(
  user: User,
  practitioner: Practitioner | null,
): AccountFields {
  if (!practitioner) return { isActive: user.isActive };
  const { firstName, lastName, phone, specialization, qualification } =
    practitioner;
  const { licenseNumber, organizationId } = practitioner;
  return {
    isActive: user.isActive,
    firstName,
    lastName,
    phone,
    specialization,
    qualification,
    licenseNumber,
    organizationId,
  };
}

/** The workplaces' names, for a change that moves someone. */
export interface Workplaces {
  from?: string;
  to?: string;
}

/** An account change for the audit log: what differs, and in words. */
export interface AccountChange {
  changes: { before: Values; after: Values };
  description: string;
}

/**
 * What an admin changed on an account, or null when nothing differs:
 * "Admin suspended the account and changed their phone".
 */
export function accountChange(
  before: AccountFields,
  after: AccountFields,
  workplaces: Workplaces = {},
): AccountChange | null {
  const changed = (Object.keys(after) as Field[]).filter(
    (field) => (before[field] ?? null) !== (after[field] ?? null),
  );
  if (!changed.length) return null;

  const done: string[] = [];
  if (changed.includes('isActive'))
    done.push(
      after.isActive ? 'reactivated the account' : 'suspended the account',
    );
  if (changed.includes('organizationId'))
    done.push(
      `moved them from ${workplaces.from ?? 'no workplace'} to ${workplaces.to ?? 'no workplace'}`,
    );
  const details = [
    ...new Set(changed.flatMap((field) => DETAILS[field] ?? [])),
  ];
  if (details.length) done.push(`changed their ${inWords(details)}`);

  const values = (from: AccountFields): Values =>
    Object.fromEntries(changed.map((field) => [field, from[field] ?? null]));
  return {
    changes: { before: values(before), after: values(after) },
    description: `Admin ${inWords(done)}`,
  };
}

/** ["a", "b", "c"] → "a, b and c". */
const inWords = (words: string[]) =>
  words.length < 2
    ? words.join('')
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
