import { randomUUID } from 'node:crypto';
import type { UserRole } from '@curo/shared/enums';
import type { ServiceUnderTest, TestActor } from '@curo/testing';
import { User } from '../src/entities/user.entity';

/**
 * A signed-in user of `role`. Unlike other services, this one checks the
 * account behind a token on every request, so the account is created too.
 */
export async function signedIn(
  svc: ServiceUnderTest,
  role: UserRole,
): Promise<TestActor> {
  const user = await svc.db.getRepository(User).save({
    email: `${role.toLowerCase()}.${randomUUID()}@curo.test`,
    passwordHash: 'not used: the token is signed directly',
    role,
  });
  return svc.as(role, { sub: user.id, email: user.email });
}
