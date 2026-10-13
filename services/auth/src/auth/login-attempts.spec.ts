import { HttpStatus } from '@nestjs/common';
import { LoginAttempts } from './login-attempts';

const LIMITS = { perAccount: 3, perIp: 5, windowMs: 60_000 };
const EMAIL = 'priya@curo.test';
const IP = '10.0.0.1';

describe('LoginAttempts', () => {
  let now: number;
  let attempts: LoginAttempts;

  beforeEach(() => {
    now = 0;
    attempts = new LoginAttempts(LIMITS, () => now);
  });

  const failing = () => Promise.resolve(null);
  const succeeding = () => Promise.resolve('user');

  const fail = async (times: number, email = EMAIL, ip = IP) => {
    for (let i = 0; i < times; i++) await attempts.attempt(email, ip, failing);
  };

  /** The error a correct password from `email` at `ip` is refused with, if any. */
  const refusal = (email = EMAIL, ip = IP) =>
    attempts.attempt(email, ip, succeeding).then(
      () => undefined,
      (err: { getStatus(): number; message: string }) => err,
    );

  it('returns what verify found', async () => {
    await expect(attempts.attempt(EMAIL, IP, succeeding)).resolves.toBe('user');
    await expect(attempts.attempt(EMAIL, IP, failing)).resolves.toBeNull();
  });

  it('allows sign-in below the account limit', async () => {
    await fail(2);
    expect(await refusal()).toBeUndefined();
  });

  it('refuses an account at its limit, from any IP and in any case', async () => {
    await fail(3);
    const err = await refusal('Priya@Curo.test', '10.0.0.99');
    expect(err?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('does not check the password of a refused attempt', async () => {
    await fail(3);
    const verify = jest.fn(succeeding);
    await expect(attempts.attempt(EMAIL, IP, verify)).rejects.toThrow();
    expect(verify).not.toHaveBeenCalled();
  });

  it('says when to try again', async () => {
    await fail(3);
    now = 15_000;
    expect((await refusal())?.message).toBe(
      'Too many failed sign-in attempts. Try again in 1 minute.',
    );
  });

  it('allows the account again once the window ends', async () => {
    await fail(3);
    now = LIMITS.windowMs;
    expect(await refusal()).toBeUndefined();
  });

  it('refuses an IP that fails across many accounts', async () => {
    for (let i = 0; i < 5; i++) await fail(1, `user${i}@curo.test`);
    expect((await refusal('someone.else@curo.test'))?.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(await refusal('someone.else@curo.test', '10.0.0.2')).toBeUndefined();
  });

  it("clears the account's failures on a correct password, not the IP's", async () => {
    await fail(2);
    expect(await refusal()).toBeUndefined();
    await fail(2);
    expect(await refusal()).toBeUndefined();

    await fail(1, 'other@curo.test');
    expect((await refusal('third@curo.test'))?.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('lifts the lockout when the failures are cleared', async () => {
    await fail(3);
    attempts.clearFailures(EMAIL);
    expect(await refusal()).toBeUndefined();
  });

  it('lets only the limit through when attempts arrive at once', async () => {
    // Each check waits, as bcrypt does, so all of them start before any fails.
    const slowFailure = () =>
      new Promise<null>((resolve) => setImmediate(() => resolve(null)));
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        attempts.attempt(EMAIL, IP, slowFailure),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
  });

  it('does not count successful sign-ins against the IP', async () => {
    for (let i = 0; i < 10; i++) await refusal(`user${i}@curo.test`);
    for (let i = 0; i < 4; i++) await fail(1, `other${i}@curo.test`);
    expect(await refusal('third@curo.test')).toBeUndefined();
  });

  it('does not count an attempt that could not be checked', async () => {
    const broken = () => Promise.reject(new Error('database down'));
    for (let i = 0; i < 5; i++)
      await expect(attempts.attempt(EMAIL, IP, broken)).rejects.toThrow(
        'database down',
      );
    expect(await refusal()).toBeUndefined();
  });
});
