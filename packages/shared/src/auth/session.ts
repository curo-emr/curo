/** The parts of an account (a `users` row) that decide whether its sessions still work. */
export interface SessionState {
  isActive: boolean;
  /** When a password reset or a suspension ended every session signed in before it. */
  sessionsEndedAt: Date | null;
}

/**
 * Whether a token issued at `issuedAt` (its `iat`, in whole seconds) may
 * still be used for `account`: the account exists, is active, and its sessions
 * haven't been ended since. Tokens from the same second as the ending pass, so
 * signing in right after a reset works.
 */
export function sessionIsLive<T extends SessionState>(
  account: T | null | undefined,
  issuedAt: number | undefined,
): account is T {
  if (!account?.isActive) return false;
  if (!account.sessionsEndedAt) return true;
  const endedAt = Math.floor(account.sessionsEndedAt.getTime() / 1000);
  return issuedAt !== undefined && issuedAt >= endedAt;
}

/** Ends every session `account` signed in before now; the caller saves it. */
export function endSessions(account: SessionState): void {
  account.sessionsEndedAt = new Date();
}
