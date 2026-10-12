import { endSessions, sessionIsLive, type SessionState } from './session';

const RESET_AT = new Date('2026-10-11T09:30:15.700Z');
const RESET_SECOND = Math.floor(RESET_AT.getTime() / 1000);

const user = (fields: Partial<SessionState> = {}): SessionState => ({
  isActive: true,
  sessionsEndedAt: null,
  ...fields,
});

describe('sessionIsLive', () => {
  it('passes any token for an active account that was never reset', () => {
    expect(sessionIsLive(user(), RESET_SECOND)).toBe(true);
  });

  it('refuses a missing or suspended account', () => {
    expect(sessionIsLive(null, RESET_SECOND)).toBe(false);
    expect(sessionIsLive(undefined, RESET_SECOND)).toBe(false);
    expect(sessionIsLive(user({ isActive: false }), RESET_SECOND)).toBe(false);
  });

  it('refuses a token issued before a reset', () => {
    const reset = user({ sessionsEndedAt: RESET_AT });

    expect(sessionIsLive(reset, RESET_SECOND - 1)).toBe(false);
    expect(sessionIsLive(reset, undefined)).toBe(false);
  });

  it('passes a token from the second of the reset or later', () => {
    const reset = user({ sessionsEndedAt: RESET_AT });

    expect(sessionIsLive(reset, RESET_SECOND)).toBe(true);
    expect(sessionIsLive(reset, RESET_SECOND + 60)).toBe(true);
  });
});

describe('endSessions', () => {
  it('ends the sessions signed in before now', () => {
    const account = user();
    const before = Math.floor(Date.now() / 1000) - 1;

    endSessions(account);

    expect(sessionIsLive(account, before)).toBe(false);
    expect(account.sessionsEndedAt?.getTime()).toBeGreaterThan(before * 1000);
  });
});
