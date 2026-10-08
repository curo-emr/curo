import { HttpException, HttpStatus } from '@nestjs/common';

export interface LoginLimits {
  /** Failed sign-ins one account may have in a window. */
  perAccount: number;
  /** Failed sign-ins one client IP may have in a window, across all accounts. */
  perIp: number;
  windowMs: number;
}

export const LOGIN_LIMITS: LoginLimits = {
  perAccount: 5,
  perIp: 20,
  windowMs: 15 * 60_000,
};

interface Window {
  failures: number;
  endsAt: number;
}

// Expired windows are swept once the map grows past this, so failed sign-ins
// for made-up emails can't grow it without bound.
const SWEEP_AT = 10_000;

/**
 * Failed sign-ins, counted per account and per client IP. Over a limit, sign-in
 * is refused (even with the right password) until that window ends: the account
 * limit stops guessing one password from many IPs, the IP limit stops one client
 * trying many accounts. Only failures count, so staff who sign in often are
 * never held up. Kept in memory: there is one auth service, and a restart only
 * forgets recent failures.
 */
export class LoginAttempts {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limits: LoginLimits = LOGIN_LIMITS,
    private readonly now: () => number = Date.now,
  ) {}

  /** Throws 429 Too Many Requests while the account or the IP is over its limit. */
  assertAllowed(email: string, ip: string): void {
    const blockedUntil = Math.max(
      this.blockedUntil(accountKey(email), this.limits.perAccount),
      this.blockedUntil(ipKey(ip), this.limits.perIp),
    );
    if (blockedUntil <= this.now()) return;

    const minutes = Math.ceil((blockedUntil - this.now()) / 60_000);
    throw new HttpException(
      `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  recordFailure(email: string, ip: string): void {
    this.countFailure(accountKey(email));
    this.countFailure(ipKey(ip));
  }

  /** A correct password clears the account's failures; the IP's stay counted. */
  recordSuccess(email: string): void {
    this.windows.delete(accountKey(email));
  }

  /** When the key's window ends, if it is over `limit`; 0 if it isn't. */
  private blockedUntil(key: string, limit: number): number {
    const window = this.current(key);
    return window && window.failures >= limit ? window.endsAt : 0;
  }

  private countFailure(key: string): void {
    const window = this.current(key);
    if (window) {
      window.failures++;
    } else {
      const endsAt = this.now() + this.limits.windowMs;
      this.windows.set(key, { failures: 1, endsAt });
    }
    if (this.windows.size > SWEEP_AT) this.sweep();
  }

  /** The key's window, unless it has ended. */
  private current(key: string): Window | undefined {
    const window = this.windows.get(key);
    if (window && window.endsAt <= this.now()) {
      this.windows.delete(key);
      return undefined;
    }
    return window;
  }

  private sweep(): void {
    for (const key of this.windows.keys()) this.current(key);
  }
}

// Email case doesn't make a different account to guess against.
const accountKey = (email: string) => `account:${email.trim().toLowerCase()}`;
const ipKey = (ip: string) => `ip:${ip}`;
