import { HttpException, HttpStatus } from '@nestjs/common';
import { intFromEnv } from '@curo/shared/config';

export interface LoginLimits {
  /** Failed sign-ins one account may have in a window. */
  perAccount: number;
  /** Failed sign-ins one client IP may have in a window, across all accounts. */
  perIp: number;
  windowMs: number;
}

/**
 * The limits, from the environment where set: a clinic whose staff share one
 * public IP may need a higher per-IP limit. Read when called, so a service run
 * from source has loaded its .env first.
 */
export function loginLimits(): LoginLimits {
  return {
    perAccount: intFromEnv('LOGIN_MAX_FAILURES_PER_ACCOUNT', 5, 1),
    perIp: intFromEnv('LOGIN_MAX_FAILURES_PER_IP', 20, 1),
    windowMs: intFromEnv('LOGIN_LOCKOUT_MINUTES', 15, 1) * 60_000,
  };
}

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
    private readonly limits: LoginLimits = loginLimits(),
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Runs `verify`, one sign-in attempt by `email` from `ip`, and returns what it
   * found: null is a failed attempt. Throws 429 Too Many Requests, without
   * running it, while the account or the IP is over its limit.
   *
   * The attempt counts as a failure while it runs, so a burst of attempts sent
   * at once can't all pass the check before any of them has failed. One that
   * succeeds clears the account's failures and gives the IP its count back;
   * one that throws (the database is down, say) gives both back.
   */
  async attempt<T>(
    email: string,
    ip: string,
    verify: () => Promise<T | null>,
  ): Promise<T | null> {
    this.assertAllowed(email, ip);
    const account = this.countFailure(accountKey(email));
    const client = this.countFailure(ipKey(ip));

    let found: T | null;
    try {
      found = await verify();
    } catch (err) {
      account.failures--;
      client.failures--;
      throw err;
    }
    if (found !== null) {
      this.clearFailures(email);
      client.failures--;
    }
    return found;
  }

  /** Lifts the account's lockout, as a new password set by an admin does; the IP's failures stay counted. */
  clearFailures(email: string): void {
    this.windows.delete(accountKey(email));
  }

  private assertAllowed(email: string, ip: string): void {
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

  /** When the key's window ends, if it is over `limit`; 0 if it isn't. */
  private blockedUntil(key: string, limit: number): number {
    const window = this.current(key);
    return window && window.failures >= limit ? window.endsAt : 0;
  }

  /**
   * Adds a failure to the key's window, starting one if it has none, and
   * returns it. Giving the failure back later decrements this same window: if
   * it has since ended or been cleared, that changes nothing.
   */
  private countFailure(key: string): Window {
    let window = this.current(key);
    if (window) {
      window.failures++;
    } else {
      window = { failures: 1, endsAt: this.now() + this.limits.windowMs };
      this.windows.set(key, window);
    }
    if (this.windows.size > SWEEP_AT) this.sweep();
    return window;
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
