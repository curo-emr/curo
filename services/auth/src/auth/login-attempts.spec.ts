import { HttpStatus } from '@nestjs/common';
import { LoginAttempts } from './login-attempts';

const LIMITS = { perAccount: 3, perIp: 5, windowMs: 60_000 };

describe('LoginAttempts', () => {
  let now: number;
  let attempts: LoginAttempts;

  beforeEach(() => {
    now = 0;
    attempts = new LoginAttempts(LIMITS, () => now);
  });

  const fail = (times: number, email = 'priya@curo.test', ip = '10.0.0.1') => {
    for (let i = 0; i < times; i++) attempts.recordFailure(email, ip);
  };

  const refusal = (email = 'priya@curo.test', ip = '10.0.0.1') => {
    try {
      attempts.assertAllowed(email, ip);
      return undefined;
    } catch (err) {
      return err as { getStatus(): number; message: string };
    }
  };

  it('allows sign-in below the account limit', () => {
    fail(2);
    expect(refusal()).toBeUndefined();
  });

  it('refuses an account at its limit, from any IP and in any case', () => {
    fail(3);
    expect(refusal('Priya@Curo.test', '10.0.0.99')?.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('says when to try again', () => {
    fail(3);
    now = 15_000;
    expect(refusal()?.message).toBe(
      'Too many failed sign-in attempts. Try again in 1 minute.',
    );
  });

  it('allows the account again once the window ends', () => {
    fail(3);
    now = LIMITS.windowMs;
    expect(refusal()).toBeUndefined();
  });

  it('refuses an IP that fails across many accounts', () => {
    for (let i = 0; i < 5; i++) fail(1, `user${i}@curo.test`);
    expect(refusal('someone.else@curo.test')?.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(refusal('someone.else@curo.test', '10.0.0.2')).toBeUndefined();
  });

  it("clears the account's failures on a correct password, not the IP's", () => {
    fail(2);
    attempts.recordSuccess('priya@curo.test');
    fail(2);
    expect(refusal()).toBeUndefined();

    fail(1, 'other@curo.test');
    expect(refusal('third@curo.test')?.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });
});
