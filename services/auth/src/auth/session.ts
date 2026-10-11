import type { User } from '../entities/user.entity';

/**
 * Whether a token issued at `issuedAt` (its `iat`, in whole seconds) may
 * still be used for `user`: the account exists, is active, and no password
 * reset has ended its sessions since. Tokens from the same second as the
 * reset pass, so signing in right after one works.
 */
export function sessionIsLive(
  user: User | null,
  issuedAt: number | undefined,
): user is User {
  if (!user?.isActive) return false;
  if (!user.sessionsEndedAt) return true;
  const endedAt = Math.floor(user.sessionsEndedAt.getTime() / 1000);
  return issuedAt !== undefined && issuedAt >= endedAt;
}
