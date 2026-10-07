import { workplaceOf, type AuthUser } from '@curo/shared/auth';
import { UserRole } from '@curo/shared/enums';

// Each test goes to the lab the doctor sent it to. Lab staff see and work on
// only their own lab's tests and reports; doctors and the admin see every lab's.

/** The lab whose work `user` sees: a technician's own, or every lab (undefined) for anyone else. */
export function labScope(user: AuthUser): string | undefined {
  return user.role === UserRole.LAB_STAFF
    ? workplaceOf(user, 'laboratory')
    : undefined;
}
